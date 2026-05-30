import uuid

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "Asesor")
        return self.create_user(email, password, **extra_fields)


def default_work_schedule():
    return {
        "default": {"enabled": True, "slots": [{"start": "09:00", "end": "18:00"}]},
        "monday": {"enabled": True, "slots": [{"start": "09:00", "end": "18:00"}]},
        "tuesday": {"enabled": True, "slots": [{"start": "09:00", "end": "18:00"}]},
        "wednesday": {"enabled": True, "slots": [{"start": "09:00", "end": "18:00"}]},
        "thursday": {"enabled": True, "slots": [{"start": "09:00", "end": "18:00"}]},
        "friday": {"enabled": True, "slots": [{"start": "09:00", "end": "15:00"}]},
        "saturday": {"enabled": False, "slots": []},
        "sunday": {"enabled": False, "slots": []},
    }


class User(AbstractUser):
    username = None
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=50, blank=True)
    last_name = models.CharField(max_length=50, blank=True)
    email = models.EmailField(unique=True, null=False)
    ROLE_CHOICES = [
        ("Asesor", "Asesor"),
        ("Autónomo", "Autónomo"),
        ("Sociedad", "Sociedad"),
    ]
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default="Autónomo")
    specialties = models.JSONField(default=list, blank=True)
    profile_image = models.FileField(upload_to="avatars/", null=True, blank=True)
    work_start = models.TimeField(null=True, blank=True)
    work_end = models.TimeField(null=True, blank=True)
    work_schedule = models.JSONField(
        default=default_work_schedule, blank=True, null=False
    )
    is_on_vacation = models.BooleanField(default=False)
    is_principal = models.BooleanField(
        default=False,
        help_text="Indica si es un Asesor Principal con permisos de gestión y citas generales.",
    )
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    @property
    def is_advisor(self):
        return self.role == "Asesor"

    def __str__(self):
        return self.email

    class Meta:
        db_table = "users"
