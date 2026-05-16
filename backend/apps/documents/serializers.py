import os
import uuid

from apps.business.models import Business
from apps.business.serializers import BusinessSerializer
from apps.users.serializers import UserSerializer
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from rest_framework import serializers

from .models import Document, InvoiceData, TaxCalendar


class TaxCalendarSerializer(serializers.ModelSerializer):
    business = BusinessSerializer(read_only=True)
    business_name = serializers.ReadOnlyField(source="business.name")
    business_id = serializers.PrimaryKeyRelatedField(
        queryset=Business.objects.all(),
        source="business",
        write_only=True,
        required=False,
    )

    class Meta:
        model = TaxCalendar
        fields = [
            "id",
            "business",
            "business_name",
            "business_id",
            "tax_type",
            "period",
            "period_start",
            "period_end",
            "deadline",
            "is_presented",
            "presented_date",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "business_name",
            "created_at",
            "updated_at",
        ]


class InvoiceDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceData
        fields = "__all__"
        read_only_fields = ["id", "document"]

    def validate_nif_identificacion(self, value):
        return InvoiceData.validate_spanish_tax_id(
            value, self.initial_data.get("nif_tipo")
        )

    def validate_supplier_tax_id(self, value):
        return InvoiceData.validate_spanish_tax_id(value)

    def validate(self, attrs):
        # Recargo de equivalencia es opcional: puede venir completamente vacio.
        equivalence_rate = attrs.get("equivalence_tax_rate")
        equivalence_amount = attrs.get("equivalence_tax_amount")

        if equivalence_rate is None and equivalence_amount is not None:
            attrs["equivalence_tax_rate"] = None
        if equivalence_amount is None and equivalence_rate is not None:
            attrs["equivalence_tax_amount"] = None

        return attrs


class DocumentSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True, required=True)
    invoice_data = InvoiceDataSerializer(read_only=True)
    uploaded_by = UserSerializer(read_only=True)
    doc_type = serializers.ChoiceField(
        choices=Document.DOC_TYPE_CHOICES,
        required=False,
        default="Factura",
    )
    status = serializers.ChoiceField(
        choices=Document.STATUS_CHOICES,
        required=False,
        default="Pendiente",
    )

    class Meta:
        model = Document
        fields = "__all__"
        read_only_fields = ["business", "file_name", "storage_path", "uploaded_at"]

    def create(self, validated_data):
        uploaded_file = validated_data.pop("file")
        base_name = os.path.basename(uploaded_file.name)
        storage_name = default_storage.save(
            f"documents/{uuid.uuid4()}_{base_name}", ContentFile(uploaded_file.read())
        )

        validated_data.setdefault("file_name", base_name)
        validated_data.setdefault("storage_path", storage_name)
        validated_data.setdefault("status", "Pendiente")
        validated_data.setdefault("doc_type", "Factura")
        return super().create(validated_data)
