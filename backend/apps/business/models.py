import uuid

from apps.users.models import User
from django.db import models


class Business(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, null=False)
    tax_id = models.CharField(max_length=100, unique=True, null=False)
    sector = models.CharField(max_length=255, null=True, blank=True)
    has_employees = models.BooleanField(default=False)
    has_office_rent = models.BooleanField(default=False)
    responsible_advisor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_businesses",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    tax_status = models.CharField(max_length=20, default="AL DÍA", db_index=True)
    pending_incidents = models.IntegerField(default=0)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "business"
        verbose_name_plural = "Businesses"
        indexes = [
            models.Index(fields=["tax_status"]),
            models.Index(fields=["responsible_advisor"]),
        ]


class Appointment(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pendiente"),
        ("confirmed", "Confirmada"),
        ("cancelled", "Cancelada"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business, on_delete=models.PROTECT, related_name="appointments"
    )
    advisor = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="appointments_as_advisor"
    )
    client = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appointments_as_client",
    )
    client_name = models.CharField(max_length=255)
    client_email = models.EmailField()
    appointment_type = models.CharField(max_length=100)
    scheduled_at = models.DateTimeField(db_index=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="pending")
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.client_name} - {self.appointment_type}"

    class Meta:
        db_table = "appointments"


class UserBusiness(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="businesses")
    business = models.ForeignKey(
        Business, on_delete=models.CASCADE, related_name="users"
    )
    ROLE_CHOICES = [
        ("Admin", "Admin"),
        ("Editor", "Editor"),
        ("Viewer", "Viewer"),
    ]
    role_in_business = models.CharField(max_length=50, choices=ROLE_CHOICES)

    class Meta:
        unique_together = ("user", "business")
        db_table = "user_business"
