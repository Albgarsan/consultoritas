from django.contrib import admin

from .models import Conversation, DocumentChunk, Message, VectorStore


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "user", "created_at")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "role", "sent_at")


@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ("id", "document", "page_number")


@admin.register(VectorStore)
class VectorStoreAdmin(admin.ModelAdmin):
    list_display = ("id", "chunk")
