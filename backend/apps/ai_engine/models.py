import uuid

from apps.documents.models import Document
from apps.users.models import User
from django.db import models
from pgvector.django import VectorField


class Conversation(models.Model):
    CONVERSATION_TYPE_CHOICES = [
        ("Public", "Public"),
        ("Client", "Client"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="conversations",
        null=True,
        blank=True,
    )
    conversation_type = models.CharField(
        max_length=20,
        choices=CONVERSATION_TYPE_CHOICES,
        default="Public",
    )
    title = models.CharField(max_length=255, null=True, blank=True)
    rating = models.IntegerField(null=True, blank=True)
    has_incident = models.BooleanField(default=False)
    incident_notes = models.TextField(null=True, blank=True)
    security_alert = models.BooleanField(default=False)
    is_human_intervening = models.BooleanField(default=False)
    unread_alerts = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title or f"Conversation {self.id}"

    class Meta:
        db_table = "conversations"


class Message(models.Model):
    ROLE_CHOICES = [
        ("User", "User"),
        ("Assistant", "Assistant"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    content = models.TextField()
    metadata = models.JSONField(null=True, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "messages"


class DocumentChunk(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document, on_delete=models.CASCADE, related_name="chunks"
    )
    content_snippet = models.TextField()
    page_number = models.IntegerField(null=True, blank=True)
    embedding = VectorField(dimensions=768, null=True, blank=True)

    class Meta:
        db_table = "document_chunks"
