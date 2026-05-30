import os
import uuid

from apps.business.models import Business
from apps.business.serializers import BusinessSerializer
from apps.users.serializers import UserSerializer
from django.core.files import File
from django.core.files.storage import default_storage
from rest_framework import serializers

from .models import Document, InvoiceData, TaxCalendar


class TaxCalendarSerializer(serializers.ModelSerializer):
    business = BusinessSerializer(read_only=True)
    business_name = serializers.ReadOnlyField(source="business.name")
    responsible_advisor_id = serializers.SerializerMethodField()
    responsible_advisor_name = serializers.SerializerMethodField()
    presented_by = UserSerializer(read_only=True)
    presented_by_name = serializers.SerializerMethodField()
    presented_date = serializers.SerializerMethodField()
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
            "presented_by",
            "presented_by_name",
            "responsible_advisor_id",
            "responsible_advisor_name",
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

    def get_responsible_advisor_id(self, obj):
        advisor = getattr(getattr(obj, "business", None), "responsible_advisor", None)
        return str(advisor.id) if advisor else None

    def get_responsible_advisor_name(self, obj):
        advisor = getattr(getattr(obj, "business", None), "responsible_advisor", None)
        if not advisor:
            return None
        full_name = advisor.get_full_name().strip()
        return full_name or advisor.email

    def get_presented_by_name(self, obj):
        presenter = getattr(obj, "presented_by", None)
        if not presenter:
            return None
        full_name = presenter.get_full_name().strip()
        return full_name or presenter.email

    def get_presented_date(self, obj):
        pd = getattr(obj, "presented_date", None)
        if not pd:
            return None
        try:
            return pd.isoformat()
        except Exception:
            # Fallback to string representation
            return str(pd)


class InvoiceDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceData
        fields = "__all__"
        read_only_fields = ["id", "document"]

    def validate_nif_identificacion(self, value):
        return InvoiceData.validate_spanish_tax_id(value)

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
    business = BusinessSerializer(read_only=True)
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
        default="En cola",
    )

    class Meta:
        model = Document
        fields = "__all__"
        read_only_fields = ["business", "file_name", "storage_path", "uploaded_at"]

    def create(self, validated_data):
        uploaded_file = validated_data.pop("file")
        base_name = os.path.basename(uploaded_file.name)
        storage_name = default_storage.save(
            f"documents/{uuid.uuid4()}_{base_name}", File(uploaded_file)
        )

        validated_data.setdefault("file_name", base_name)
        validated_data.setdefault("storage_path", storage_name)
        validated_data.setdefault("status", "En cola")
        validated_data.setdefault("doc_type", "Factura")
        try:
            return super().create(validated_data)
        except Exception:
            default_storage.delete(storage_name)
            raise
