from apps.business.models import Business
from apps.documents.models import Document
from django.contrib.auth import authenticate
from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.contrib.auth import update_session_auth_hash
from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import Throttled
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from .models import User
from .serializers import ClientListSerializer, PasswordChangeSerializer, UserSerializer


class LoginRateThrottle(SimpleRateThrottle):
    scope = "login"

    def get_rate(self):
        # default to 5/min if not configured in settings
        return getattr(self, "rate", "5/min")

    def get_cache_key(self, request, view):
        # Key by email if present, otherwise by IP
        ident = (request.data or {}).get("email") or self.get_ident(request)
        if not ident:
            return None
        return self.cache_format % {"scope": self.scope, "ident": ident}


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from apps.business.models import UserBusiness

        business_prefetch = Prefetch(
            "businesses",
            queryset=UserBusiness.objects.select_related("business").prefetch_related(
                "business__tax_calendar"
            ),
        )

        if self.request.user.role == "Asesor":
            if self.action in {"retrieve", "update", "partial_update", "destroy"}:
                return (
                    User.objects.filter(Q(id=self.request.user.id) | ~Q(role="Asesor"))
                    .prefetch_related(business_prefetch)
                    .distinct()
                )

            return (
                User.objects.filter(
                    Q(id=self.request.user.id)
                    | Q(
                        businesses__business__users__user=self.request.user,
                        role__in=["Autónomo", "Sociedad"],
                    )
                )
                .prefetch_related(business_prefetch)
                .distinct()
            )

        # Non-advisor users can only access themselves.
        return User.objects.filter(id=self.request.user.id).prefetch_related(
            business_prefetch
        )

    def get_permissions(self):
        if self.action in {"login", "advisors", "stats"}:
            return [AllowAny()]
        return super().get_permissions()

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
        authentication_classes=[],
        throttle_classes=[LoginRateThrottle],
    )
    def login(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        user = authenticate(request, username=email, password=password)

        if user is not None:
            django_login(request, user)
            return Response(
                {
                    "message": "Login exitoso",
                    "role": user.role,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {"error": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED
        )

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def logout(self, request):
        django_logout(request)
        return Response({"message": "Logout exitoso"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        update_session_auth_hash(request, request.user)

        return Response(
            {"message": "Contraseña actualizada correctamente"},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def advisors(self, request):
        advisors = User.objects.filter(
            role="Asesor", businesses__isnull=False
        ).distinct()
        serializer = self.get_serializer(advisors, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def stats(self, request):
        advisors_count = (
            User.objects.filter(role="Asesor", businesses__isnull=False)
            .distinct()
            .count()
        )
        clients_count = User.objects.exclude(role="Asesor").distinct().count()
        businesses_count = Business.objects.count()
        documents_count = Document.objects.count()

        return Response(
            {
                "advisors_count": advisors_count,
                "clients_count": clients_count,
                "businesses_count": businesses_count,
                "documents_count": documents_count,
            }
        )

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def clients(self, request):
        from apps.business.models import UserBusiness

        business_prefetch = Prefetch(
            "businesses",
            queryset=UserBusiness.objects.select_related("business").prefetch_related(
                "business__tax_calendar"
            ),
        )

        if self.request.user.role == "Asesor":
            clients = self.get_queryset().exclude(role="Asesor")
        else:
            clients = User.objects.filter(id=self.request.user.id).prefetch_related(
                business_prefetch
            )

        serializer = ClientListSerializer(clients, many=True)
        return Response(serializer.data)

    @action(
        detail=False,
        methods=["get", "patch", "put"],
        permission_classes=[IsAuthenticated],
    )
    def me(self, request):
        if request.method in ["PATCH", "PUT"]:
            serializer = self.get_serializer(
                request.user, data=request.data, partial=request.method == "PATCH"
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
