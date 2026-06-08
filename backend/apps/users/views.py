import secrets
import string

from apps.business.models import Business, UserBusiness
from apps.documents.models import Document, TaxCalendar
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from django.utils.html import escape, strip_tags
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, Throttled
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from .models import User
from .serializers import ClientListSerializer, PasswordChangeSerializer, UserSerializer


class UserPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


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
    pagination_class = UserPagination
    filter_backends = [SearchFilter, OrderingFilter, DjangoFilterBackend]
    search_fields = ["email", "first_name", "last_name"]
    ordering_fields = ["created_at", "last_name", "email"]
    ordering = ["-created_at"]

    def get_queryset(self):

        business_prefetch = Prefetch(
            "businesses",
            queryset=UserBusiness.objects.select_related("business").prefetch_related(
                "business__tax_calendar"
            ),
        )

        role_filter = self.request.query_params.get("role")
        is_staff_filter = self.request.query_params.get("is_staff")
        if role_filter is not None or is_staff_filter is not None:
            queryset = User.objects.filter(role="Asesor")
            if role_filter and role_filter != "Asesor":
                queryset = queryset.filter(role=role_filter)

            if is_staff_filter is not None:
                normalized_staff = str(is_staff_filter).strip().lower()
                if normalized_staff in {"1", "true", "yes"}:
                    queryset = queryset.filter(is_staff=True)
                elif normalized_staff in {"0", "false", "no"}:
                    queryset = queryset.filter(is_staff=False)

            return queryset.prefetch_related(business_prefetch).distinct()

        if self.request.user.role == "Asesor":
            return (
                User.objects.filter(
                    Q(id=self.request.user.id) | Q(role__in=["Autónomo", "Sociedad"])
                )
                .prefetch_related(business_prefetch)
                .distinct()
            )

        return User.objects.filter(id=self.request.user.id).prefetch_related(
            business_prefetch
        )

    def get_permissions(self):
        if self.action in {"login", "advisors", "stats", "recover_password"}:
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

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
        authentication_classes=[],
    )
    def recover_password(self, request):
        """
        Endpoint público para recuperación de contraseña.
        Genera una contraseña temporal segura y la envía al usuario (o la devuelve para dev).
        """
        email = request.data.get("email", "").strip().lower()

        if not email:
            return Response(
                {"detail": "El correo electrónico es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Buscar el usuario
        user = User.objects.filter(email=email).first()

        if not user:
            return Response(
                {
                    "detail": "El correo electrónico introducido no está registrado en el sistema."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generar contraseña temporal segura
        chars = string.ascii_letters + string.digits + "!@#$%&*"
        temp_password = "".join(secrets.choice(chars) for _ in range(14))

        # Actualizar contraseña en base de datos
        user.set_password(temp_password)
        user.save(update_fields=["password"])

        greeting_name = escape(user.first_name.strip()) or "usuario"
        subject = "🔑 Restablecimiento de contraseña - Consultoritas"
        html_message = f"""
        <div style="margin:0;padding:0;background-color:#f5f7fb;font-family:Arial, Helvetica, sans-serif;color:#1f2937;">
          <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
            <div style="background:#ffffff;border-radius:16px;box-shadow:0 10px 30px rgba(15,23,42,0.08);overflow:hidden;">
              <div style="background:linear-gradient(135deg,#0f172a,#1d4ed8);padding:28px 32px;color:#ffffff;">
                <div style="font-size:28px;font-weight:700;letter-spacing:0.3px;">Consultoritas</div>
                <div style="margin-top:8px;font-size:14px;opacity:0.92;">Recuperación segura de acceso</div>
              </div>
              <div style="padding:32px;line-height:1.6;font-size:15px;">
                <p style="margin:0 0 16px;">Hola, {greeting_name}.</p>
                <p style="margin:0 0 16px;">Hemos generado una contraseña temporal para que puedas acceder a tu cuenta.</p>
                <div style="margin:24px 0;padding:18px 20px;border:1px solid #dbe4f0;border-radius:12px;background:#f8fafc;font-family:monospace;font-size:18px;letter-spacing:1px;text-align:center;color:#0f172a;word-break:break-word;">
                  {temp_password}
                </div>
                <p style="margin:0 0 12px;color:#374151;">Por seguridad, te recomendamos cambiarla inmediatamente al entrar en <strong>Configuración</strong>.</p>
                <p style="margin:0;color:#6b7280;font-size:13px;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
              </div>
            </div>
          </div>
        </div>
        """.strip()
        plain_message = strip_tags(html_message)

        try:
            send_mail(
                subject,
                plain_message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                html_message=html_message,
            )
        except Exception:
            return Response(
                {"detail": "No se pudo enviar el correo de recuperación."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response_data = {"message": "Contraseña temporal generada con éxito."}
        if settings.DEBUG:
            response_data["generated_password"] = temp_password

        return Response(
            response_data,
            status=status.HTTP_200_OK,
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

    def destroy(self, request, *args, **kwargs):
        """Elimina un usuario y limpia en cascada su empresa y calendarios asociados."""
        user = self.get_object()

        with transaction.atomic():
            user_businesses = UserBusiness.objects.filter(
                user=user, role_in_business="Admin"
            )
            for ub in user_businesses:
                business = ub.business
                TaxCalendar.objects.filter(business=business).delete()
                business.delete()

            user.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def advisors(self, request):
        general = request.query_params.get("general", "false").lower() == "true"
        if general:
            # Si general=true, devuelve ÚNICAMENTE asesores principales
            advisors = User.objects.filter(role="Asesor", is_principal=True).distinct()
        else:
            # Si no, devuelve todos los asesores
            advisors = User.objects.filter(role="Asesor").distinct()
        serializer = self.get_serializer(advisors, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def create_advisor(self, request):
        """
        Permite que un Asesor Principal cree otros asesores directamente desde la app.
        Valida que el usuario sea asesor y tenga is_principal=True.
        Si no hay contraseña, genera una aleatoria y envía correo de bienvenida.
        """
        # 1. Validar permisos: solo Asesor Principal puede crear asesores
        if request.user.role != "Asesor" or not request.user.is_principal:
            raise PermissionDenied(
                "Solo los Asesores Principales pueden crear otros asesores."
            )

        # 2. Extraer datos del request
        email = request.data.get("email", "").strip().lower()
        first_name = request.data.get("first_name", "").strip()
        last_name = request.data.get("last_name", "").strip()
        password = request.data.get("password", "").strip()
        specialties = request.data.get("specialties", [])
        is_principal = request.data.get("is_principal", False)

        # Validar datos obligatorios
        if not email or not first_name or not last_name:
            return Response(
                {"detail": "Email, first_name y last_name son obligatorios."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verificar que el email no existe
        if User.objects.filter(email=email).exists():
            return Response(
                {"detail": f"El email {email} ya está registrado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. Generar contraseña si no se proporciona
        generated_password = False
        if not password:
            # Generar contraseña aleatoria segura
            chars = string.ascii_letters + string.digits + "!@#$%&"
            password = "".join(secrets.choice(chars) for _ in range(16))
            generated_password = True

        # 4. Crear el usuario asesor
        try:
            user = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role="Asesor",
                is_staff=True,
                is_active=True,
                is_principal=is_principal,
                specialties=specialties if isinstance(specialties, list) else [],
            )

            # 5. Si la contraseña fue generada, aquí podrías disparar un signal de envío de correo
            # Por ahora, incluimos la contraseña generada en la respuesta (mala práctica en producción)
            response_data = UserSerializer(user).data
            if generated_password:
                if settings.DEBUG:
                    response_data["generated_password"] = password
                response_data["password_generated"] = True
                # TODO: Disparar signal para envío de correo de bienvenida con la contraseña

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"detail": f"Error al crear el asesor: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def stats(self, request):
        advisors_count = User.objects.filter(role="Asesor").distinct().count()
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

        page = self.paginate_queryset(clients)
        if page is not None:
            serializer = ClientListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

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

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="create-with-business",
    )
    def create_with_business(self, request):
        """
        Atomically create a new user + associated business in a single transaction.
        Prevents data inconsistency if one operation fails.
        """
        with transaction.atomic():
            # 1. Validar y crear el usuario base
            user_serializer = self.get_serializer(data=request.data)
            user_serializer.is_valid(raise_exception=True)
            user = user_serializer.save()

            # Forzar el guardado del rol porque UserSerializer lo trata como read_only
            requested_role = request.data.get("role", "Autónomo")
            if (
                requested_role in ("Autónomo", "Sociedad")
                and user.role != requested_role
            ):
                user.role = requested_role
                user.save(update_fields=["role"])

            # 2. Crear la empresa y vincular al cliente como Administrador
            role = request.data.get("role", "Autónomo")
            if role in ("Autónomo", "Sociedad"):
                from apps.business.models import UserBusiness

                raw_tax_id = request.data.get("tax_id", None)
                safe_tax_id = (
                    str(raw_tax_id)[:100] if raw_tax_id else f"PENDING-{user.id}"[:100]
                )

                business = Business.objects.create(
                    name=f"{user.get_full_name()}",
                    tax_id=safe_tax_id,
                    has_employees=request.data.get("has_employees", False),
                    has_office_rent=request.data.get("has_office_rent", False),
                )

                # Registramos al cliente como administrador exclusivo de su negocio
                UserBusiness.objects.create(
                    user=user,
                    business=business,
                    role_in_business="Admin",
                )

        return Response(
            self.get_serializer(user).data,
            status=status.HTTP_201_CREATED,
        )
