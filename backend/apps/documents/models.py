import uuid

from apps.business.models import Business
from django.db import models


class Document(models.Model):
    STATUS_CHOICES = [
        ("Pendiente", "Pendiente"),
        ("Procesado", "Procesado"),
        ("Error", "Error"),
    ]
    DOC_TYPE_CHOICES = [
        ("Factura", "Factura"),
        ("Gasto", "Gasto"),
        ("Ingreso", "Ingreso"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business, on_delete=models.CASCADE, related_name="documents"
    )
    file_name = models.CharField(max_length=500)
    storage_path = models.CharField(max_length=1000)
    status = models.CharField(
        max_length=50, choices=STATUS_CHOICES, default="Pendiente"
    )
    doc_type = models.CharField(max_length=50, choices=DOC_TYPE_CHOICES)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file_name

    class Meta:
        db_table = "documents"


class InvoiceData(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.OneToOneField(
        Document, on_delete=models.CASCADE, related_name="invoice_data"
    )
    supplier_name = models.CharField(max_length=255, null=True, blank=True)
    supplier_tax_id = models.CharField(max_length=100, null=True, blank=True)
    issue_date = models.DateField(null=True, blank=True)
    tax_base = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    tax_rate = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    total_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    currency = models.CharField(max_length=10, default="EUR")

    def __str__(self):
        return f"Invoice Data for {self.document.file_name}"

    class Meta:
        db_table = "invoice_data"
