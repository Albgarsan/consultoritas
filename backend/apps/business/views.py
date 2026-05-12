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
        queryset = (
            Business.objects.annotate(
                overdue_tax_items=Count(
                    "tax_calendar",
                    filter=Q(
                        tax_calendar__is_presented=False,
                        tax_calendar__deadline__lt=now,
                    ),
                ),
                tax_status_calculated=Case(
                    When(overdue_tax_items__gt=0, then=Value("INCIDENCIA")),
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
        # Non-staff users only see businesses they belong to
        if not self.request.user.is_staff:
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
        if getattr(request.user, "role", None) == "Asesor":
            queryset = TaxCalendar.objects.select_related("business").all()
        else:
            queryset = TaxCalendar.objects.filter(
                business__users__user=request.user
            ).select_related("business")

        serializer = TaxCalendarSerializer(queryset, many=True)
        return Response(serializer.data)


class UserBusinessViewSet(viewsets.ModelViewSet):
    serializer_class = UserBusinessSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserBusiness.objects.filter(user=self.request.user)


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

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
