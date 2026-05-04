from rest_framework import serializers

from .models import Conversation, Message


class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = "__all__"
        read_only_fields = ["user", "created_at"]


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = "__all__"
        read_only_fields = ["sent_at"]

    def validate_conversation(self, value):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            if value.user != request.user:
                raise serializers.ValidationError(
                    "You do not have permission to add messages to this conversation."
                )
        return value
