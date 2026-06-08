import logging
import os
import secrets
import string

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import serializers

from .models import User

logger = logging.getLogger(__name__)

PASSWORD_SYMBOLS = "!@#$%^&*()-_=+"


def generate_secure_password(length: int = 12) -> str:
    alphabet = (
        string.ascii_lowercase
        + string.ascii_uppercase
        + string.digits
        + PASSWORD_SYMBOLS
    )

    for _ in range(20):
        password_chars = [
            secrets.choice(string.ascii_lowercase),
            secrets.choice(string.ascii_uppercase),
            secrets.choice(string.digits),
            secrets.choice(PASSWORD_SYMBOLS),
        ]
        password_chars.extend(
            secrets.choice(alphabet) for _ in range(max(length - 4, 4))
        )
        secrets.SystemRandom().shuffle(password_chars)
        candidate = "".join(password_chars)
        try:
            validate_password(candidate)
        except DjangoValidationError:
            continue
        return candidate

    raise serializers.ValidationError("No se pudo generar una contraseña segura.")


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        min_length=8,
        max_length=128,
        trim_whitespace=False,
    )
    primary_business = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "profile_image",
            "work_start",
            "work_end",
            "work_schedule",
            "role",
            "is_staff",
            "is_active",
            "is_on_vacation",
            "is_principal",
            "specialties",
            "password",
            "last_login",
            "created_at",
            "primary_business",
        ]
        # Protect sensitive flags from being writable via API
        read_only_fields = [
            "id",
            "last_login",
            "created_at",
            "primary_business",
            "role",
            "is_staff",
            "is_principal",
        ]

    def get_primary_business(self, obj):
        import logging

        logger = logging.getLogger(__name__)
        try:
            ub = (
                obj.businesses.select_related("business")
                .order_by("business__created_at")
                .first()
            )
            if not ub:
                return None
            business = ub.business
            return {
                "id": str(business.id),
                "name": business.name,
                "has_employees": bool(getattr(business, "has_employees", False)),
                "has_office_rent": bool(getattr(business, "has_office_rent", False)),
            }
        except (AttributeError, obj.businesses.model.DoesNotExist) as e:
            logger.warning(f"Failed to get primary business for user {obj.id}: {e}")
            return None

    def validate(self, attrs):
        """Override validate to provide user context for password validation."""
        password = attrs.get("password")

        # Normalize empty password to None
        if password == "":
            attrs["password"] = None
            password = None

        if password:
            # Create a temporary user instance with fields for validation context
            base = self.instance or User()
            temp_user = User(
                email=attrs.get("email", getattr(base, "email", "")),
                first_name=attrs.get("first_name", getattr(base, "first_name", "")),
                last_name=attrs.get("last_name", getattr(base, "last_name", "")),
            )
            try:
                validate_password(password, user=temp_user)
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"password": exc.messages})

        return attrs

    def validate_work_schedule(self, value):
        if value in (None, ""):
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("El horario debe ser un objeto JSON.")

        def parse_hhmm(raw, field_name):
            if not isinstance(raw, str) or len(raw) != 5 or raw[2] != ":":
                raise serializers.ValidationError(
                    f"{field_name} debe tener formato HH:MM"
                )
            h, m = raw.split(":")
            if not (h.isdigit() and m.isdigit()):
                raise serializers.ValidationError(
                    f"{field_name} debe tener formato HH:MM"
                )
            hour = int(h)
            minute = int(m)
            if hour < 0 or hour > 23 or minute < 0 or minute > 59:
                raise serializers.ValidationError(f"{field_name} fuera de rango")
            return hour * 60 + minute

        for day, cfg in value.items():
            if not isinstance(cfg, dict):
                raise serializers.ValidationError(f"Configuracion invalida para {day}")
            enabled = cfg.get("enabled", True)
            if not isinstance(enabled, bool):
                raise serializers.ValidationError(f"enabled invalido en {day}")

            slots = cfg.get("slots", [])
            if not isinstance(slots, list):
                raise serializers.ValidationError(f"slots invalido en {day}")

            prev_end = None
            for index, slot in enumerate(slots):
                if not isinstance(slot, dict):
                    raise serializers.ValidationError(f"slot invalido en {day}")
                start = parse_hhmm(slot.get("start"), f"start {day} slot {index + 1}")
                end = parse_hhmm(slot.get("end"), f"end {day} slot {index + 1}")
                if end <= start:
                    raise serializers.ValidationError(
                        f"La hora de fin debe ser posterior al inicio en {day} slot {index + 1}"
                    )
                if prev_end is not None and start < prev_end:
                    raise serializers.ValidationError(
                        f"La segunda franja no puede empezar antes de terminar la anterior en {day}"
                    )
                prev_end = end

        return value

    def create(self, validated_data):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        from django.utils.html import escape, strip_tags

        password = validated_data.pop("password", None)
        email = validated_data.pop("email")
        validated_data.setdefault("role", "Autónomo")

        # If no password provided, generate a secure random one and send it via email
        generated_password = None
        if not password:
            generated_password = generate_secure_password(14)
            password = generated_password

        try:
            validate_password(password)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})

        with transaction.atomic():
            user = User.objects.create_user(
                email=email, password=password, **validated_data
            )

            if generated_password:
                greeting_name = escape(user.first_name.strip()) or "usuario"
                subject = "Bienvenido a Consultoritas - Tus accesos"
                html_message = f"""
                <div style="margin:0;padding:0;background-color:#f5f7fb;font-family:Arial, Helvetica, sans-serif;color:#1f2937;">
                  <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
                    <div style="background:#ffffff;border-radius:16px;box-shadow:0 10px 30px rgba(15,23,42,0.08);overflow:hidden;">
                      <div style="background:linear-gradient(135deg,#0f172a,#1d4ed8);padding:28px 32px;color:#ffffff;">
                        <div style="font-size:28px;font-weight:700;letter-spacing:0.3px;">Consultoritas</div>
                        <div style="margin-top:8px;font-size:14px;opacity:0.92;">Bienvenido a tu nueva plataforma</div>
                      </div>
                      <div style="padding:32px;line-height:1.6;font-size:15px;">
                        <p style="margin:0 0 16px;">Hola, {greeting_name}.</p>
                        <p style="margin:0 0 16px;">Tu Asesor ha creado una cuenta para ti en Consultoritas. Aquí tienes tu contraseña temporal para acceder:</p>
                        <div style="margin:24px 0;padding:18px 20px;border:1px solid #dbe4f0;border-radius:12px;background:#f8fafc;font-family:monospace;font-size:18px;letter-spacing:1px;text-align:center;color:#0f172a;word-break:break-word;">
                          {generated_password}
                        </div>
                        <p style="margin:0 0 12px;color:#374151;">Te recomendamos cambiar esta contraseña por una propia en la sección <strong>Configuración</strong> nada más entrar.</p>
                      </div>
                    </div>
                  </div>
                </div>
                """.strip()
                plain_message = strip_tags(html_message)

                def _send_welcome_email():
                    try:
                        send_mail(
                            subject=subject,
                            message=plain_message,
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[user.email],
                            html_message=html_message,
                            fail_silently=False,
                        )
                    except Exception:
                        logger.exception(
                            "Failed to send welcome email to %s", user.email
                        )

                transaction.on_commit(_send_welcome_email)

        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        min_length=8,
        max_length=128,
    )
    confirm_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        min_length=8,
        max_length=128,
    )

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Sesión no válida.")

        if not user.check_password(attrs.get("current_password", "")):
            raise serializers.ValidationError(
                {"current_password": "La contraseña actual no es correcta."}
            )

        if attrs.get("new_password") != attrs.get("confirm_password"):
            raise serializers.ValidationError(
                {"confirm_password": "Las contraseñas nuevas no coinciden."}
            )

        try:
            validate_password(attrs.get("new_password"), user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                {"new_password": getattr(exc, "messages", ["Contraseña inválida"])}
            )

        return attrs


class ClientListSerializer(serializers.ModelSerializer):
    tax_status = serializers.SerializerMethodField()
    primary_business_id = serializers.SerializerMethodField()
    primary_business_name = serializers.SerializerMethodField()
    primary_business = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "role",
            "tax_status",
            "is_active",
            "primary_business_id",
            "primary_business_name",
            "primary_business",
        ]

    def _primary_business_link(self, obj):
        # Cache the lookup on the object to avoid repeated DB queries
        cache_attr = "_primary_business_link_cached"
        if hasattr(obj, cache_attr):
            return getattr(obj, cache_attr)

        result = (
            obj.businesses.select_related("business")
            .order_by("business__created_at")
            .first()
        )
        try:
            setattr(obj, cache_attr, result)
        except Exception:
            # If obj is not writable, just return the result without caching
            pass
        return result

    def get_tax_status(self, obj):
        link = self._primary_business_link(obj)
        if link and link.business:
            return getattr(link.business, "tax_status", "AL DÍA")
        return "AL DÍA"

    def get_primary_business_id(self, obj):
        link = self._primary_business_link(obj)
        return str(link.business.id) if link and link.business else None

    def get_primary_business_name(self, obj):
        link = self._primary_business_link(obj)
        return link.business.name if link and link.business else None

    def get_primary_business(self, obj):
        link = self._primary_business_link(obj)
        if not link or not link.business:
            return None

        business = link.business
        return {
            "id": str(business.id),
            "name": business.name,
            "has_employees": bool(getattr(business, "has_employees", False)),
            "has_office_rent": bool(getattr(business, "has_office_rent", False)),
        }
