import re
import uuid
from decimal import Decimal

from apps.business.models import Business
from apps.users.models import User
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


class Document(models.Model):
    STATUS_CHOICES = [
        ("En cola", "En cola"),
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
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="uploaded_documents",
        null=False,
        blank=False,
    )
    file_name = models.CharField(max_length=500)
    storage_path = models.CharField(max_length=1000)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="En cola")
    doc_type = models.CharField(max_length=50, choices=DOC_TYPE_CHOICES)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file_name

    class Meta:
        db_table = "documents"


class InvoiceData(models.Model):
    NIF_TIPO_CHOICES = [
        ("NIF", "NIF"),
        ("CIF", "CIF"),
        ("NIE", "NIE"),
        ("PASAPORTE", "Pasaporte"),
        ("IVA", "IVA Intracomunitario"),
    ]
    CLAVE_OPERACION_CHOICES = [
        ("01", "01 - Operación general"),
        ("02", "02 - Exportación"),
        ("03", "03 - Intracomunitaria"),
        ("04", "04 - Operación exenta"),
        ("05", "05 - Inversión sujeto pasivo"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.OneToOneField(
        Document, on_delete=models.CASCADE, related_name="invoice_data"
    )
    supplier_name = models.CharField(max_length=255, null=True, blank=True)
    supplier_tax_id = models.CharField(max_length=100, null=True, blank=True)
    issue_date = models.DateField(null=True, blank=True)

    currency = models.CharField(max_length=10, default="EUR")

    operation_date = models.DateField(null=True, blank=True)
    serie = models.CharField(max_length=50, null=True, blank=True)
    invoice_number = models.CharField(max_length=50, null=True, blank=True)
    last_invoice_number = models.CharField(max_length=50, null=True, blank=True)
    nif_tipo = models.CharField(
        max_length=20,
        choices=NIF_TIPO_CHOICES,
        null=True,
        blank=True,
    )
    nif_codigo_pais = models.CharField(
        max_length=2, null=True, blank=True, default="ES"
    )
    nif_identificacion = models.CharField(max_length=50, null=True, blank=True)
    clave_operacion = models.CharField(
        max_length=2,
        choices=CLAVE_OPERACION_CHOICES,
        null=True,
        blank=True,
        default="01",
    )
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    tax_base = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    equivalence_tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    equivalence_tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )

    @staticmethod
    def validate_spanish_tax_id(value, nif_tipo=None):
        if not value:
            return None

        normalized = str(value).strip().upper()
        if nif_tipo in {"PASAPORTE", "IVA"}:
            return normalized

        nif_pattern = re.compile(r"^\d{8}[A-Z]$")
        nie_pattern = re.compile(r"^[XYZ]\d{7}[A-Z]$")
        cif_pattern = re.compile(r"^[A-Z]\d{7}[A-Z0-9]$")

        patterns = [nif_pattern, nie_pattern, cif_pattern]
        if nif_tipo == "NIF":
            patterns = [nif_pattern]
        elif nif_tipo == "NIE":
            patterns = [nie_pattern]
        elif nif_tipo == "CIF":
            patterns = [cif_pattern]

        if not any(pattern.fullmatch(normalized) for pattern in patterns):
            raise ValidationError(
                {"nif_identificacion": "El NIF/CIF/NIE no tiene un formato válido."}
            )

        return normalized

    def clean(self):
        super().clean()

        self.nif_identificacion = self.validate_spanish_tax_id(
            self.nif_identificacion, self.nif_tipo
        )
        self.supplier_tax_id = self.validate_spanish_tax_id(self.supplier_tax_id)

        if self.nif_codigo_pais:
            self.nif_codigo_pais = self.nif_codigo_pais.upper()

    def save(self, *args, **kwargs):
        self.full_clean()
        base = Decimal(self.tax_base or 0)

        if self.tax_rate is not None:
            self.tax_amount = (base * Decimal(self.tax_rate) / Decimal("100")).quantize(
                Decimal("0.01")
            )
        else:
            self.tax_amount = Decimal(self.tax_amount or 0).quantize(Decimal("0.01"))

        if self.equivalence_tax_rate is not None:
            self.equivalence_tax_amount = (
                base * Decimal(self.equivalence_tax_rate) / Decimal("100")
            ).quantize(Decimal("0.01"))
        else:
            self.equivalence_tax_amount = Decimal(
                self.equivalence_tax_amount or 0
            ).quantize(Decimal("0.01"))

        self.total_amount = (
            base
            + Decimal(self.tax_amount or 0)
            + Decimal(self.equivalence_tax_amount or 0)
        ).quantize(Decimal("0.01"))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Invoice Data for {self.document.file_name}"

    class Meta:
        db_table = "invoice_data"


class TaxCalendar(models.Model):
    """
    Calendario fiscal: tracks tax obligations for a business.
    Stores expected filing deadlines, tax types, periods, and completion status.
    """

    TAX_TYPE_CHOICES = [
        ("111", "111"),
        ("115", "115"),
        ("123", "123"),
        ("130", "130"),
        ("202", "202"),
        ("303", "303"),
    ]
    PERIOD_CHOICES = [
        ("Mensual", "Mensual"),
        ("Trimestral", "Trimestral"),
        ("Semestral", "Semestral"),
        ("Anual", "Anual"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business, on_delete=models.CASCADE, related_name="tax_calendar", db_index=True
    )
    tax_type = models.CharField(max_length=50, choices=TAX_TYPE_CHOICES)
    period = models.CharField(max_length=20, choices=PERIOD_CHOICES)
    period_start = models.DateField()
    period_end = models.DateField()
    deadline = models.DateField(db_index=True)
    is_presented = models.BooleanField(default=False, db_index=True)
    presented_date = models.DateTimeField(null=True, blank=True)
    presented_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="presented_tax_calendars",
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.business.name} - {self.tax_type} {self.period_start.strftime('%m/%Y')}"

    class Meta:
        db_table = "tax_calendar"
        ordering = ["-deadline"]
        verbose_name_plural = "Tax Calendars"
        indexes = [
            models.Index(fields=["business", "tax_type", "period_start"]),
            models.Index(fields=["business", "is_presented", "deadline"]),
        ]
