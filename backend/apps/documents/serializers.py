from rest_framework import serializers

from .models import Document, InvoiceData


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = "__all__"
        read_only_fields = ["business"]


class InvoiceDataSerializer(serializers.ModelSerializer):
    document = DocumentSerializer(read_only=True)

    class Meta:
        model = InvoiceData
        fields = "__all__"
