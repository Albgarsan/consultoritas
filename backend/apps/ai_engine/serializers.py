from rest_framework import serializers

from .models import Conversation, Message


class ConversationSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    advisor_ids = serializers.SerializerMethodField()

    def get_user_name(self, obj):
        if obj.user:
            return (
                f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
            )
        return "Usuario Anónimo"

    def get_advisor_ids(self, obj):
        if not obj.user:
            return []

        user_businesses = getattr(obj.user, "businesses", None)
        if user_businesses is not None:
            # If prefetched, we can safely iterate
            return list(
                {
                    str(getattr(ub.business, "responsible_advisor_id", ""))
                    for ub in user_businesses.all()
                    if getattr(ub, "business", None)
                    and getattr(ub.business, "responsible_advisor_id", None)
                }
            )

        from apps.business.models import Business

        businesses = (
            Business.objects.filter(users__user=obj.user)
            .exclude(responsible_advisor__isnull=True)
            .select_related("responsible_advisor")
        )
        return list({str(b.responsible_advisor_id) for b in businesses})

    class Meta:
        model = Conversation
        fields = "__all__"
        read_only_fields = [
            "user",
            "conversation_type",
            "title",
            "rating",
            "has_incident",
            "incident_notes",
            "is_human_intervening",
            "user_name",
            "advisor_ids",
            "created_at",
            "unread_alerts",
        ]


class ChatMessageInputSerializer(serializers.Serializer):
    conversation_id = serializers.UUIDField(required=False, allow_null=True)
    message = serializers.CharField(max_length=4000)
    context_text = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )


class ChatFeedbackSerializer(serializers.Serializer):
    rating = serializers.IntegerField(
        min_value=1, max_value=5, required=False, allow_null=True
    )
    has_incident = serializers.BooleanField(required=False, default=False)
    incident_notes = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = "__all__"
        read_only_fields = ["sent_at"]

    def validate_conversation(self, value):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            is_auth = getattr(request.user, "is_authenticated", False)
            role = getattr(request.user, "role", None)

            if value.user != request.user and (not is_auth or role != "Asesor"):
                raise serializers.ValidationError(
                    "You do not have permission to add messages to this conversation."
                )
        return value
