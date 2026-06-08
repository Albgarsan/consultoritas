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

        try:
            # Avoid explicit queries if prefetch_related was used
            user_businesses = obj.user.businesses.all()
            advisors = set()
            for ub in user_businesses:
                if ub.business_id and ub.business.responsible_advisor_id:
                    advisors.add(str(ub.business.responsible_advisor_id))
            return list(advisors)
        except Exception:
            from apps.business.models import Business

            businesses = (
                Business.objects.filter(users__user=obj.user)
                .exclude(responsible_advisor__isnull=True)
                .select_related("responsible_advisor")
            )
            return list(set(str(b.responsible_advisor_id) for b in businesses))

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
            if value.user != request.user and request.user.role != "Asesor":
                raise serializers.ValidationError(
                    "You do not have permission to add messages to this conversation."
                )
        return value
