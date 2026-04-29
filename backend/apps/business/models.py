import uuid

from apps.users.models import User
from django.db import models


class Business(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, null=False)
    tax_id = models.CharField(max_length=100, unique=True, null=False)
    sector = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "business"


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
