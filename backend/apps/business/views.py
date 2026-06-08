from apps.documents.models import TaxCalendar
from apps.documents.serializers import TaxCalendarSerializer, UserSerializer
from apps.users.models import User
from django.db import transaction
from django.db.models import Case, CharField, Count, Prefetch, Q, Value, When
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from .models import Appointment, Business, UserBusiness
from .serializers import (
    AppointmentSerializer,
    BusinessSerializer,
    UserBusinessSerializer,
)


class BusinessViewSet(viewsets.ModelViewSet):
    serializer_class = BusinessSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        now = timezone.now().date()
        in_window = now.month in {1, 4, 7, 10} and 1 <= now.day <= 20
        window_start = now.replace(day=1)
        window_end = now.replace(day=20)
        queryset = (
            Business.objects.annotate(
                overdue_tax_items=Count(
                    "tax_calendar",
                    filter=Q(
                        tax_calendar__is_presented=False,
                        tax_calendar__deadline__lt=now,
                    ),
                ),
                pending_window_items=Count(
                    "tax_calendar",
                    filter=Q(
                        tax_calendar__is_presented=False,
                        tax_calendar__deadline__gte=window_start,
                        tax_calendar__deadline__lte=window_end,
                    ),
                ),
                tax_status_calculated=Case(
                    When(
                        (
                            Q(pending_window_items__gt=0)
                            if in_window
                            else Q(pk__isnull=True)
                        ),
                        then=Value("INCIDENCIA"),
                    ),
                    default=Value("AL DÍA"),
                    output_field=CharField(),
                ),
            )
            .prefetch_related(
                Prefetch("tax_calendar", queryset=TaxCalendar.objects.all()),
                Prefetch("users", queryset=UserBusiness.objects.select_related("user")),
            )
            .order_by("name")
        )

        if not self.request.user.is_staff and self.request.user.role != "Asesor":
            queryset = queryset.filter(users__user=self.request.user).distinct()

        return queryset

    @action(detail=False, methods=["get"], url_path="dashboard_summary")
    def dashboard_summary(self, request):
        user = request.user
        now = timezone.now().date()

        user_data = UserSerializer(user).data

        stats = {}
        if user.role == "Asesor":
            stats = {
                "total_clients": User.objects.exclude(role="Asesor").count(),
                "incidences": Business.objects.filter(pending_incidents__gt=0).count(),
                "upcoming_deadlines": TaxCalendar.objects.filter(
                    deadline__gte=now, is_presented=False
                )
                .select_related("business")
                .order_by("deadline")[:5]
                .values("id", "business__name", "tax_type", "deadline"),
            }

        return Response({"user": user_data, "stats": stats})

    @action(detail=False, methods=["get"])
    def tax_calendar(self, request):
        try:
            year = int(request.query_params.get("year", timezone.now().year))
        except (ValueError, TypeError):
            year = timezone.now().year

        if getattr(request.user, "role", None) == "Asesor":
            queryset = (
                TaxCalendar.objects.filter(deadline__year=year)
                .select_related("business")
                .all()
            )
        else:
            queryset = TaxCalendar.objects.filter(
                business__users__user=request.user, deadline__year=year
            ).select_related("business")

        serializer = TaxCalendarSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="my_business")
    def retrieve_my_business(self, request):
        """Devuelve los datos de la empresa vinculada al cliente logueado."""
        try:
            user_business = UserBusiness.objects.select_related("business").get(
                user=request.user, role_in_business="Admin"
            )
            serializer = self.get_serializer(user_business.business)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except UserBusiness.DoesNotExist:
            return Response(
                {"detail": "No se encontró ninguna empresa vinculada a este usuario."},
                status=status.HTTP_404_NOT_FOUND,
            )


class UserBusinessViewSet(viewsets.ModelViewSet):
    serializer_class = UserBusinessSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserBusiness.objects.filter(user=self.request.user)


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer

    class PublicAppointmentCreateThrottle(SimpleRateThrottle):
        scope = "appointment_create"

        def get_rate(self):
            # Hardcoded sensible default for create endpoint
            return "10/hour"

        def get_cache_key(self, request, view):
            # Key by remote IP only to avoid PII exposure in cache
            ident = self.get_ident(request)
            return f"{self.scope}:{ident}"

    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_throttles(self):
        if self.action == "create":
            return [self.PublicAppointmentCreateThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Appointment.objects.none()

        # Asesores ven todas sus citas personales (advisor=self)
        # Clientes solo ven sus propias citas por email
        if getattr(self.request.user, "role", None) == "Asesor":
            return (
                Appointment.objects.filter(advisor=self.request.user)
                .select_related("business", "advisor")
                .order_by("scheduled_at")
            )

        # Clientes
        return (
            Appointment.objects.filter(client_email=self.request.user.email)
            .select_related("business", "advisor")
            .order_by("scheduled_at")
        )

    def perform_create(self, serializer):
        from .emails import send_appointment_notification

        appointment = serializer.save()
        send_appointment_notification(appointment, "created")

    def perform_update(self, serializer):
        from .emails import send_appointment_notification

        old_status = serializer.instance.status
        appointment = serializer.save()

        if old_status != appointment.status and appointment.status == "confirmed":
            send_appointment_notification(appointment, "confirmed")
        else:
            send_appointment_notification(appointment, "updated")

    def perform_destroy(self, instance):
        from .emails import send_appointment_notification

        send_appointment_notification(instance, "deleted")
        instance.delete()
