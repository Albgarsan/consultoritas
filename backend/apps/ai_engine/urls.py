from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ChatAPIView,
    ChatFeedbackAPIView,
    ConversationViewSet,
    MessageViewSet,
    SuggestedPromptsAPIView,
)

router = DefaultRouter()
router.register(r"conversations", ConversationViewSet, basename="conversation")
router.register(r"messages", MessageViewSet, basename="message")

urlpatterns = [
    path("", include(router.urls)),
    path("chat/", ChatAPIView.as_view(), name="ai-chat"),
    path(
        "suggested-prompts/",
        SuggestedPromptsAPIView.as_view(),
        name="ai-suggested-prompts",
    ),
    path(
        "chat/<uuid:pk>/feedback/",
        ChatFeedbackAPIView.as_view(),
        name="ai-chat-feedback",
    ),
]
