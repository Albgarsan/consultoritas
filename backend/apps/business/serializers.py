from rest_framework import serializers

from .models import Business, UserBusiness


class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = "__all__"


class UserBusinessSerializer(serializers.ModelSerializer):
    business = BusinessSerializer(read_only=True)
    business_id = serializers.PrimaryKeyRelatedField(
        queryset=Business.objects.all(), source="business", write_only=True
    )

    class Meta:
        model = UserBusiness
        fields = ["id", "user", "business", "business_id", "role_in_business"]
