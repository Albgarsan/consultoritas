import uuid

from apps.documents.models import Document
from apps.users.models import User
from django.db import models
from pgvector.django import VectorField


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="conversations"
    )
    title = models.CharField(max_length=255, null=True, blank=True)
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
