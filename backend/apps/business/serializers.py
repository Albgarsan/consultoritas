from datetime import datetime, timedelta

from apps.users.models import User
from apps.users.serializers import UserSerializer
from django.utils import timezone
from rest_framework import serializers

from .models import Appointment, Business, UserBusiness


class BusinessSerializer(serializers.ModelSerializer):
    tax_status = serializers.SerializerMethodField()

    class Meta:
        model = Business
        fields = "__all__"

    def get_tax_status(self, obj):
        return getattr(obj, "tax_status_calculated", obj.tax_status)


class UserBusinessSerializer(serializers.ModelSerializer):
    business = BusinessSerializer(read_only=True)
    business_id = serializers.PrimaryKeyRelatedField(
        queryset=Business.objects.all(), source="business", write_only=True
    )

    class Meta:
        model = UserBusiness
        fields = ["id", "user", "business", "business_id", "role_in_business"]


class AppointmentSerializer(serializers.ModelSerializer):
    advisor = UserSerializer(read_only=True)
    advisor_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="Asesor"),
        source="advisor",
        write_only=True,
    )
    business = BusinessSerializer(read_only=True)
    business_id = serializers.PrimaryKeyRelatedField(
        queryset=Business.objects.all(),
        source="business",
        write_only=True,
        required=False,
    )
    scheduled_at = serializers.DateTimeField(required=False)
    date = serializers.CharField(write_only=True, required=False, allow_blank=True)
    time = serializers.CharField(write_only=True, required=False, allow_blank=True)
    force_out_of_hours = serializers.BooleanField(
        write_only=True, required=False, default=False
    )

    class Meta:
        model = Appointment
        fields = [
            "id",
            "business",
            "business_id",
            "advisor",
            "advisor_id",
            "client_name",
            "client_email",
            "appointment_type",
            "scheduled_at",
            "status",
            "notes",
            "date",
            "time",
            "force_out_of_hours",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        date_value = attrs.pop("date", None)
        time_value = attrs.pop("time", None)
        force_out_of_hours = attrs.pop("force_out_of_hours", False)

        # If this is a partial update: allow status-only changes,
        # but if both date and time are provided, compute scheduled_at.
        if self.instance is not None and self.partial:
            if date_value and time_value:
                try:
                    parsed_date = datetime.fromisoformat(
                        str(date_value).replace("Z", "+00:00")
                    )
                    parsed_time = datetime.strptime(time_value, "%H:%M").time()
                    attrs["scheduled_at"] = timezone.make_aware(
                        datetime.combine(parsed_date.date(), parsed_time),
                        timezone.get_current_timezone(),
                    )
                except Exception as exc:
                    raise serializers.ValidationError(
                        {"scheduled_at": "Fecha u hora inválidas."}
                    ) from exc
            elif "scheduled_at" not in attrs:
                # Partial update without scheduling fields -> allow status/notes updates.
                return attrs

        if not attrs.get("scheduled_at") and date_value and time_value:
            try:
                parsed_date = datetime.fromisoformat(
                    str(date_value).replace("Z", "+00:00")
                )
                parsed_time = datetime.strptime(time_value, "%H:%M").time()
                attrs["scheduled_at"] = timezone.make_aware(
                    datetime.combine(parsed_date.date(), parsed_time),
                    timezone.get_current_timezone(),
                )
            except Exception as exc:
                raise serializers.ValidationError(
                    {"scheduled_at": "Fecha u hora inválidas."}
                ) from exc

        if not attrs.get("scheduled_at"):
            raise serializers.ValidationError(
                {"scheduled_at": "Debes indicar fecha y hora."}
            )

        scheduled_at = attrs.get("scheduled_at")
        advisor = attrs.get("advisor") or (
            self.instance.advisor if self.instance else None
        )

        if scheduled_at and advisor:
            # Treat each appointment as a 60-minute block and reject any overlap.
            start_window = scheduled_at - timedelta(hours=1)
            end_window = scheduled_at + timedelta(hours=1)
            qs = Appointment.objects.filter(
                advisor=advisor,
                status__in=["pending", "confirmed"],
                scheduled_at__gte=start_window,
                scheduled_at__lt=end_window,
            )
            if self.instance is not None:
                qs = qs.exclude(id=self.instance.id)

            conflict_exists = False
            for appointment in qs:
                appointment_start = appointment.scheduled_at
                appointment_end = appointment_start + timedelta(hours=1)
                if appointment_start < end_window and appointment_end > scheduled_at:
                    conflict_exists = True
                    break

            if conflict_exists:
                raise serializers.ValidationError(
                    {"scheduled_at": "No se puede porque ya esta ocupado."}
                )

            # Working hours guard with explicit override from frontend confirmation.
            local_dt = timezone.localtime(scheduled_at)
            local_time = local_dt.time()
            day_key = [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
            ][local_dt.weekday()]

            def _to_minutes(raw):
                try:
                    hh, mm = str(raw).split(":")
                    return int(hh) * 60 + int(mm)
                except Exception:
                    return None

            def _in_slot_list(slots):
                cur = local_time.hour * 60 + local_time.minute
                for slot in slots or []:
                    start = _to_minutes(slot.get("start"))
                    end = _to_minutes(slot.get("end"))
                    if start is None or end is None:
                        continue
                    if start <= cur <= end:
                        return True
                return False

            out_of_hours = False
            schedule = advisor.work_schedule or {}
            if isinstance(schedule, dict) and schedule:
                day_cfg = schedule.get(day_key) or schedule.get("default") or {}
                if day_cfg.get("enabled", True):
                    out_of_hours = not _in_slot_list(day_cfg.get("slots", []))
                else:
                    out_of_hours = True
            elif advisor.work_start and advisor.work_end:
                out_of_hours = (
                    local_time < advisor.work_start or local_time > advisor.work_end
                )

            if out_of_hours and not force_out_of_hours:
                raise serializers.ValidationError(
                    {
                        "scheduled_at": "La cita está fuera de tu horario configurado.",
                        "out_of_hours": True,
                    }
                )

        return attrs

    def _is_client_request(self):
        request = self.context.get("request")
        return bool(
            request and request.user.is_authenticated and request.user.role != "Asesor"
        )

    def create(self, validated_data):
        request = self.context.get("request")
        business = validated_data.get("business")

        if request and request.user.is_authenticated and request.user.role != "Asesor":
            validated_data["client_name"] = (
                request.user.get_full_name().strip() or request.user.email
            )
            validated_data["client_email"] = request.user.email

        if business is None:
            advisor = validated_data.get("advisor")
            business = (
                Business.objects.filter(users__user=advisor)
                .order_by("created_at")
                .first()
            )

            if business is None and request and request.user.is_authenticated:
                business = (
                    Business.objects.filter(users__user=request.user)
                    .order_by("created_at")
                    .first()
                )

        if business is None:
            raise serializers.ValidationError(
                {"business_id": "No se pudo determinar la empresa."}
            )

        validated_data["business"] = business
        return super().create(validated_data)
