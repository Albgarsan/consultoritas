import logging
import os
from typing import Any

from apps.business.models import Appointment, Business
from apps.documents.models import InvoiceData
from django.db.models import Q
from django.utils import timezone
from groq import Groq

from .models import Conversation, Message

logger = logging.getLogger(__name__)


class GroqChatService:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError(
                "Configuración de API requerida: GROQ_API_KEY no encontrada"
            )
        self.client = Groq(api_key=api_key)

    def process_chat_message(
        self,
        conversation: Conversation,
        user_message: str,
        request_user=None,
        context_text="",
    ) -> dict[str, Any]:
        try:
            Message.objects.create(
                conversation=conversation,
                role="User",
                content=user_message,
            )

            model_name = self._get_model_name(conversation)
            messages = self._build_messages(
                conversation, user_message, request_user, context_text
            )

            response = self.client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=0.2 if conversation.conversation_type == "Public" else 0.1,
                max_tokens=700,
            )

            assistant_text = self._extract_content(response)
            assistant_message = Message.objects.create(
                conversation=conversation,
                role="Assistant",
                content=assistant_text,
                metadata={"model": model_name},
            )

            return {
                "conversation": conversation,
                "assistant_message": assistant_message,
                "reply": assistant_text,
            }
        except Exception as exc:
            logger.exception("Error procesando mensaje en GroqChatService")
            raise ValueError(f"Error procesando el mensaje del chat: {exc}") from exc

    def _get_model_name(self, conversation: Conversation) -> str:
        return "llama-3.3-70b-versatile"

    def _build_messages(
        self,
        conversation: Conversation,
        user_message: str,
        request_user=None,
        context_text="",
    ) -> list[dict[str, str]]:
        if conversation.conversation_type == "Public":
            system_prompt = self._build_public_prompt(context_text)
        else:
            if request_user is None:
                raise ValueError("Se requiere usuario autenticado para el chat privado")
            system_prompt = self._build_private_prompt(request_user)

        history = list(
            conversation.messages.order_by("-sent_at").only("role", "content")[:10]
        )
        history.reverse()

        messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
        for item in history:
            role_lower = item.role.lower()
            if role_lower == "user":
                messages.append({"role": "user", "content": item.content})
            elif role_lower == "assistant":
                messages.append({"role": "assistant", "content": item.content})

        if not history or history[-1].content != user_message:
            messages.append({"role": "user", "content": user_message})

        return messages

    def _build_public_prompt(self, context_text: str) -> str:
        return f"""ERES UN ASESOR COMERCIAL VIRTUAL de Consultoritas.
REGLA 1 (FUENTE ÚNICA): Basa tus respuestas ÚNICA Y EXCLUSIVAMENTE en el siguiente contenido extraído de nuestra página web:
--- INICIO CONTEXTO WEB ---
{context_text}
--- FIN CONTEXTO WEB ---
REGLA 2 (VENTA Y CITA): Tu objetivo es resolver la duda y SIEMPRE terminar tu intervención con una pregunta atractiva invitando al usuario a decir qué servicio le interesa para sugerirle contactar con un asesor especializado de los que aparecen en el texto.
REGLA 3 (OFF-TOPIC): Si te preguntan sobre programación, código, matemáticas o cualquier tema no relacionado con asesoría, responde: 'Lo siento, soy el asistente comercial de Consultoritas y solo puedo ayudarte con temas relacionados con nuestros servicios de asesoría'.
REGLA 4 (DATOS): NO reveles números de clientes. NO inventes servicios que no estén en el texto web. Usa párrafos cortos."""

    def _build_private_prompt(self, request_user) -> str:
        user_name = (
            getattr(request_user, "first_name", "")
            or request_user.get_full_name()
            or "cliente"
        )

        businesses = list(
            Business.objects.filter(users__user=request_user)
            .select_related("responsible_advisor")
            .distinct()
        )
        business_ids = [business.id for business in businesses]

        # Traemos todas las facturas sin filtrar por estado, max 15
        invoices = list(
            InvoiceData.objects.filter(
                document__business__users__user=request_user,
                document__business_id__in=business_ids,
            )
            .select_related("document", "document__business")
            .order_by("-document__uploaded_at")[:15]
        )

        appointments_qs = (
            Appointment.objects.filter(advisor=request_user)
            if getattr(request_user, "role", None) == "Asesor"
            else Appointment.objects.filter(
                Q(client=request_user) | Q(business__users__user=request_user)
            )
        )
        appointments = list(
            appointments_qs.filter(
                business_id__in=business_ids, scheduled_at__gte=timezone.now()
            )
            .select_related("business", "advisor")
            .distinct()
            .order_by("scheduled_at")[:10]
        )

        context_lines: list[str] = []
        if businesses:
            context_lines.append("Empresas del usuario:")
            for business in businesses:
                advisor_name = (
                    business.responsible_advisor.get_full_name().strip()
                    if business.responsible_advisor
                    else "Sin asignar"
                )
                safe_nif = (
                    f"***{business.tax_id[-4:]}"
                    if business.tax_id and len(business.tax_id) >= 4
                    else "***"
                )
                context_lines.append(
                    f"- {business.name} | NIF: {safe_nif} | Asesor: {advisor_name}"
                )

        if invoices:
            context_lines.append("Facturas recientes (Todos los estados):")
            for invoice in invoices:
                safe_date = (
                    invoice.issue_date.strftime("%m/%Y")
                    if invoice.issue_date
                    else "N/D"
                )
                context_lines.append(
                    f"- Doc #{invoice.document.id} | Estado: {invoice.document.status} | Total: Redactado | Fecha: {safe_date}"
                )

        if appointments:
            context_lines.append("Citas futuras:")
            for appointment in appointments:
                advisor_name = appointment.advisor.get_full_name().strip() or "Asesor"
                context_lines.append(
                    f"- {appointment.business.name} | {appointment.scheduled_at.isoformat()} | Asesor: {advisor_name}"
                )

        context_blob = "\n".join(context_lines)
        return (
            f"Eres el consultor IA de {user_name}. Responde de forma cálida, humana y directa. "
            f"Tienes acceso a sus datos: {context_blob}. No tienes acceso a contraseñas ni emails. "
            "Si pide puzzles, historias, o datos de otros clientes/asesores, responde EXACTAMENTE: 'ALERTA_SEGURIDAD'. "
            "REGLA DE CONOCIMIENTO GENERAL: Puedes responder dudas generales sobre fiscalidad, IVA o legislación básica. SIN EMBARGO, si la duda es compleja o requiere analizar su caso, añade SIEMPRE al final: 'Para este tema específico, te recomiendo concertar una cita con tu asesor responsable para analizar tu caso en detalle.'"
        )

    def _extract_content(self, response) -> str:
        content = (
            getattr(response.choices[0].message, "content", None)
            if getattr(response, "choices", None)
            else None
        )
        if isinstance(content, str) and content.strip():
            return content.strip()
        raise ValueError("La API de Groq devolvió una respuesta vacía")
