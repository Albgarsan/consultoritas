import secrets
import string

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import User

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
        except Exception:
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
            "specialties",
            "password",
            "last_login",
            "created_at",
            "primary_business",
        ]
        read_only_fields = ["id", "last_login", "created_at", "primary_business"]

    def get_primary_business(self, obj):
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
        except Exception:
            return None

    def validate_password(self, value):
        if not value:
            return value

        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                getattr(exc, "messages", ["Contraseña inválida"])
            )
        return value

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
        password = validated_data.pop("password", None)
        email = validated_data.pop("email")
        validated_data.setdefault("role", "Autónomo")

        password_to_use = password
        generated_password = None
        if not password_to_use:
            generated_password = generate_secure_password()
            password_to_use = generated_password

        # Ensure user creation and notification happen atomically so email failures rollback DB
        with transaction.atomic():
            user = User.objects.create_user(
                email=email, password=password_to_use, **validated_data
            )

            if generated_password:
                email_body = (
                    f"Hola {user.first_name or 'cliente'},\n\n"
                    "Tu cuenta en Consultoritas ha sido creada correctamente.\n"
                    f"Contraseña temporal: {generated_password}\n\n"
                    "Accede con tu email y esta contraseña, y cámbiala después desde Configuración.\n"
                )
                send_mail(
                    subject="Tu acceso a Consultoritas",
                    message=email_body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )

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
        # Use the same deterministic selection as UserSerializer.get_primary_business
        return (
            obj.businesses.select_related("business")
            .order_by("business__created_at")
            .first()
        )

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
