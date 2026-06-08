import datetime
import logging

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, Message
from .serializers import (
    ChatFeedbackSerializer,
    ChatMessageInputSerializer,
    ConversationSerializer,
    MessageSerializer,
)
from .services import GroqChatService

logger = logging.getLogger(__name__)


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if not user.is_authenticated:
            return Conversation.objects.none()

        if getattr(user, "role", None) == "Asesor":
            queryset = (
                Conversation.objects.select_related("user")
                .prefetch_related("user__businesses__business__responsible_advisor")
                .all()
            )
        else:
            queryset = Conversation.objects.select_related("user").filter(user=user)

        queryset = queryset.order_by("-created_at")

        date_param = self.request.query_params.get("date")
        if date_param:
            if date_param == "today":
                target_date = datetime.timezone.localdate()
            else:
                try:
                    target_date = datetime.datetime.strptime(
                        date_param, "%Y-%m-%d"
                    ).date()
                except ValueError:
                    target_date = None

            if target_date:
                queryset = queryset.filter(created_at__date=target_date)

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, conversation_type="Client")

    @action(detail=True, methods=["post"])
    def toggle_control(self, request, pk=None):
        conversation = self.get_object()

        if getattr(request.user, "role", None) != "Asesor":
            return Response(
                {
                    "error": "Solo un asesor puede alternar el control de la conversación."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        conversation.is_human_intervening = not conversation.is_human_intervening
        conversation.save(update_fields=["is_human_intervening"])

        return Response(
            {
                "conversation_id": str(conversation.id),
                "is_human_intervening": conversation.is_human_intervening,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["patch"])
    def mark_read(self, request, pk=None):
        conversation = self.get_object()
        if getattr(request.user, "role", None) != "Asesor":
            return Response(
                {"error": "Solo un asesor puede limpiar alertas."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if conversation.unread_alerts:
            conversation.unread_alerts = False
            conversation.save(update_fields=["unread_alerts"])

        return Response({"status": "ok"})

    @action(detail=True, methods=["post"])
    def advisor_reply(self, request, pk=None):
        conversation = self.get_object()

        if getattr(request.user, "role", None) != "Asesor":
            return Response(
                {"error": "Solo un asesor puede responder manualmente."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ChatMessageInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = serializer.validated_data["message"].strip()
        assistant_message = Message.objects.create(
            conversation=conversation,
            role="Assistant",
            content=message,
            metadata={
                "source": "advisor",
                "advisor_id": str(request.user.id),
            },
        )

        conversation.is_human_intervening = True
        conversation.save(update_fields=["is_human_intervening"])

        return Response(
            {
                "conversation_id": str(conversation.id),
                "assistant_message": {
                    "id": str(assistant_message.id),
                    "role": assistant_message.role,
                    "content": assistant_message.content,
                    "sent_at": assistant_message.sent_at.isoformat(),
                },
                "is_human_intervening": conversation.is_human_intervening,
            },
            status=status.HTTP_201_CREATED,
        )


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Message.objects.all()
        conversation_id = self.request.query_params.get("conversation")
        if conversation_id:
            queryset = queryset.filter(conversation_id=conversation_id)

        if getattr(self.request.user, "role", None) == "Asesor":
            return queryset

        return queryset.filter(conversation__user=self.request.user)


class ChatAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ChatMessageInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_message = serializer.validated_data["message"]
        context_text = serializer.validated_data.get("context_text", "")

        conversation = self._resolve_conversation(
            request=request,
            conversation_id=serializer.validated_data.get("conversation_id"),
        )

        if conversation.title in ("Chat privado", "Chat público"):
            conversation.title = f"{user_message[:35]}..."
            conversation.save(update_fields=["title"])

        if conversation.is_human_intervening:
            Message.objects.create(
                conversation=conversation,
                role="User",
                content=user_message,
            )
            return Response(
                {
                    "conversation_id": str(conversation.id),
                    "conversation_type": conversation.conversation_type,
                    "status": "human_typing",
                    "reply": "",
                },
                status=status.HTTP_200_OK,
            )

        try:
            service = GroqChatService()
            result = service.process_chat_message(
                conversation=conversation,
                user_message=user_message,
                request_user=request.user if request.user.is_authenticated else None,
                context_text=context_text,
            )
        except Exception as exc:
            logger.exception(
                "Chat endpoint failed for conversation %s", conversation.id
            )
            return Response(
                {"error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        reply_text = result["reply"]
        if "ALERTA_SEGURIDAD" in reply_text or "OPERACION_NO_AUTORIZADA" in reply_text:
            conversation.security_alert = True
            conversation.unread_alerts = True
            conversation.save(update_fields=["security_alert", "unread_alerts"])
            safe_message = "Por seguridad, no puedo continuar con esta solicitud."

            assistant_msg = result["assistant_message"]
            meta = assistant_msg.metadata or {}
            meta["is_security_alert"] = True
            assistant_msg.content = safe_message
            assistant_msg.metadata = meta
            assistant_msg.save(update_fields=["content", "metadata"])
            reply_text = safe_message

        return Response(
            {
                "conversation_id": str(conversation.id),
                "conversation_type": conversation.conversation_type,
                "status": "ok",
                "reply": reply_text,
                "assistant_message": {
                    "id": str(result["assistant_message"].id),
                    "role": result["assistant_message"].role,
                    "content": reply_text,
                    "sent_at": result["assistant_message"].sent_at.isoformat(),
                },
            },
            status=status.HTTP_200_OK,
        )

    def _resolve_conversation(self, request, conversation_id=None):
        if request.user.is_authenticated:
            if conversation_id:
                return get_object_or_404(
                    Conversation,
                    pk=conversation_id,
                    user=request.user,
                    conversation_type="Client",
                )
            return Conversation.objects.create(
                user=request.user,
                conversation_type="Client",
                title="Chat privado",
            )

        if conversation_id:
            return get_object_or_404(
                Conversation,
                pk=conversation_id,
                conversation_type="Public",
            )

        return Conversation.objects.create(
            conversation_type="Public",
            title="Chat público",
        )


class SuggestedPromptsAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            prompts = [
                "¿Tengo citas esta semana?",
                "¿Cómo van mis facturas?",
                "Explícame los gráficos del dashboard",
            ]
        else:
            prompts = [
                "¿Qué servicios ofrecéis?",
                "¿Cuáles son vuestros horarios?",
                "¿Cómo agendo una cita?",
            ]

        return Response({"prompts": prompts}, status=status.HTTP_200_OK)


class ChatFeedbackAPIView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk=None):
        serializer = ChatFeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        conversation = get_object_or_404(Conversation, pk=pk)

        if request.user.is_authenticated and conversation.conversation_type == "Client":
            if conversation.user_id != request.user.id:
                return Response(
                    {"error": "No tienes permisos."}, status=status.HTTP_403_FORBIDDEN
                )
        elif (
            conversation.conversation_type == "Client"
            and not request.user.is_authenticated
        ):
            return Response(
                {"error": "No tienes permisos."}, status=status.HTTP_403_FORBIDDEN
            )

        updated_fields = []
        if "rating" in request.data:
            conversation.rating = serializer.validated_data.get("rating")
            updated_fields.append("rating")

        if "has_incident" in request.data:
            conversation.has_incident = serializer.validated_data.get("has_incident")
            conversation.incident_notes = serializer.validated_data.get(
                "incident_notes", ""
            )
            if conversation.has_incident:
                conversation.unread_alerts = True
            updated_fields.extend(["has_incident", "incident_notes", "unread_alerts"])

        if updated_fields:
            conversation.save(update_fields=updated_fields)

        return Response(
            {"conversation_id": str(conversation.id), "status": "ok"},
            status=status.HTTP_200_OK,
        )
