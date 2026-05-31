import logging
import os
import uuid
from datetime import date
from decimal import Decimal, InvalidOperation

from apps.business.models import Business
from apps.users.models import User
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.http import FileResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Document, InvoiceData, TaxCalendar
from .serializers import (
    DocumentSerializer,
    InvoiceDataSerializer,
    TaxCalendarSerializer,
)
from .tasks import process_document_ocr_task

logger = logging.getLogger(__name__)


def _get_authorized_business(request, business_id: str | None):
    if not business_id:
        raise ValidationError({"business_id": "Este campo es obligatorio."})

    qs = Business.objects.filter(pk=business_id)
    if not request.user.is_staff:
        qs = qs.filter(users__user=request.user)

    business = qs.first()
    if not business:
        raise ValidationError({"business_id": "Negocio no válido o sin permisos."})
    return business


def _safe_decimal(value):
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError({"ocr": "Los importes devueltos por OCR no son válidos."})


class DocumentUploadOCRView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            raise ValidationError({"file": "Debes adjuntar un archivo."})

        business = _get_authorized_business(request, request.data.get("business_id"))
        doc_type = request.data.get("doc_type", "Factura")

        storage_name = default_storage.save(
            f"documents/{uuid.uuid4()}_{uploaded_file.name}",
            uploaded_file,
        )

        document = Document.objects.create(
            business=business,
            uploaded_by=request.user,
            file_name=uploaded_file.name,
            storage_path=storage_name,
            status="En cola",
            doc_type=doc_type,
        )

        process_document_ocr_task.delay(document.id)

        return Response(
            {
                "detail": "Documento subido y encolado para procesamiento OCR",
                "document_id": str(document.id),
            },
            status=status.HTTP_202_ACCEPTED,
        )


class FinancialStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        business_id = request.query_params.get("business_id")
        month_names = [
            "Ene",
            "Feb",
            "Mar",
            "Abr",
            "May",
            "Jun",
            "Jul",
            "Ago",
            "Sep",
            "Oct",
            "Nov",
            "Dic",
        ]

        if business_id:
            business = _get_authorized_business(request, business_id)
            month_rows = (
                InvoiceData.objects.filter(
                    document__business=business,
                    issue_date__isnull=False,
                )
                .annotate(month=TruncMonth("issue_date"))
                .values("month")
                .annotate(
                    ingresos=Sum("tax_base", filter=Q(document__doc_type="Ingreso")),
                    iva=Sum("tax_amount"),
                )
                .order_by("month")
            )

            payload = []
            for row in month_rows:
                month = row["month"]
                label = (
                    f"{month_names[month.month - 1]} {str(month.year)[-2:]}"
                    if month
                    else "N/A"
                )
                payload.append(
                    {
                        "name": label,
                        "ingresos": float(row["ingresos"] or 0),
                        "iva": float(row["iva"] or 0),
                    }
                )

            return Response(payload, status=status.HTTP_200_OK)

        if getattr(request.user, "role", None) == "Asesor":
            queryset = (
                Document.objects.filter(business__users__user=request.user)
                .select_related("business", "invoice_data")
                .distinct()
            )
        else:
            queryset = Document.objects.filter(
                business__users__user=request.user
            ).select_related("business", "invoice_data")

        queryset = queryset.filter(invoice_data__issue_date__isnull=False)

        totals = queryset.aggregate(
            ingresos=Sum("invoice_data__total_amount", filter=Q(doc_type="Ingreso")),
            gastos=Sum(
                "invoice_data__total_amount",
                filter=Q(doc_type__in=["Factura", "Gasto"]),
            ),
            soportado=Sum(
                "invoice_data__tax_amount", filter=Q(doc_type__in=["Factura", "Gasto"])
            ),
            repercutido=Sum("invoice_data__tax_amount", filter=Q(doc_type="Ingreso")),
        )

        trends = (
            queryset.annotate(month=TruncMonth("invoice_data__issue_date"))
            .values("month")
            .annotate(
                ingresos=Sum(
                    "invoice_data__total_amount", filter=Q(doc_type="Ingreso")
                ),
                gastos=Sum(
                    "invoice_data__total_amount",
                    filter=Q(doc_type__in=["Factura", "Gasto"]),
                ),
                soportado=Sum(
                    "invoice_data__tax_amount",
                    filter=Q(doc_type__in=["Factura", "Gasto"]),
                ),
                repercutido=Sum(
                    "invoice_data__tax_amount", filter=Q(doc_type="Ingreso")
                ),
            )
            .order_by("month")
        )

        return Response(
            {
                "totals": {
                    "ingresos": float(totals["ingresos"] or 0),
                    "gastos": float(totals["gastos"] or 0),
                    "iva_soportado": float(totals["soportado"] or 0),
                    "iva_repercutido": float(totals["repercutido"] or 0),
                },
                "trends": [
                    {
                        "name": t["month"].strftime("%Y-%m") if t["month"] else "N/A",
                        "ingresos": float(t["ingresos"] or 0),
                        "gastos": float(t["gastos"] or 0),
                        "soportado": float(t["soportado"] or 0),
                        "repercutido": float(t["repercutido"] or 0),
                    }
                    for t in trends
                ],
                "documents_count": queryset.count(),
                "processed_count": queryset.filter(status="Procesado").count(),
            },
            status=status.HTTP_200_OK,
        )


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = PageNumberPagination

    def get_queryset(self):
        user = self.request.user
        qs = (
            Document.objects.all()
            .select_related("invoice_data", "uploaded_by", "business")
            .order_by("-uploaded_at")
        )
        if user.role == "Asesor":
            filtered = qs.filter(business__users__user=user).distinct()
        else:
            filtered = qs.filter(business__users__user=user).distinct()

        business_id = self.request.query_params.get("business_id")
        if business_id:
            filtered = filtered.filter(business_id=business_id)

        doc_type = self.request.query_params.get("doc_type")
        if doc_type == "recibidas":
            filtered = filtered.filter(doc_type__in=["Factura", "Gasto"])
        elif doc_type == "emitidas":
            filtered = filtered.filter(doc_type="Ingreso")
        elif doc_type:
            filtered = filtered.filter(doc_type=doc_type)

        return filtered

    def perform_create(self, serializer):
        business_id = self.request.data.get("business_id") or self.request.data.get(
            "business"
        )
        doc_type = self.request.data.get("doc_type") or "Factura"

        if getattr(self.request.user, "role", None) == "Asesor":
            if not business_id:
                raise ValidationError({"business_id": "Este campo es obligatorio."})

            business = Business.objects.filter(pk=business_id).first()
            if not business:
                raise ValidationError(
                    "Invalid business selection or permission denied."
                )

            client_owner_user = User.objects.filter(
                businesses__business=business,
                businesses__role_in_business="Admin",
            ).first()

            document = serializer.save(
                business=business,
                uploaded_by=client_owner_user or self.request.user,
                status="En cola",
                doc_type=doc_type,
            )
        else:
            user_businesses = Business.objects.filter(users__user=self.request.user)

            if not user_businesses.exists():
                raise ValidationError(
                    "You must belong to a business to upload documents."
                )

            if business_id:
                business = user_businesses.filter(pk=business_id).first()
                if not business:
                    raise ValidationError(
                        "Invalid business selection or permission denied."
                    )
            else:
                if user_businesses.count() > 1:
                    raise ValidationError(
                        "You belong to multiple businesses. Please specify a business ID."
                    )
                business = user_businesses.first()

            document = serializer.save(
                business=business,
                uploaded_by=self.request.user,
                status="En cola",
                doc_type=doc_type,
            )

        process_document_ocr_task.delay(document.id)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_destroy(self, instance):
        try:
            if instance.storage_path:
                default_storage.delete(instance.storage_path)
        except Exception:
            logger.exception(
                "Failed to delete storage object for document %s (%s)",
                instance.pk,
                getattr(instance, "storage_path", None),
            )

        instance.delete()

    @action(
        detail=True, methods=["post", "patch"], permission_classes=[IsAuthenticated]
    )
    def validate(self, request, pk=None):
        document = self.get_object()
        invoice_data_payload = request.data.get("invoice_data")
        new_status = request.data.get("status")

        try:
            with transaction.atomic():
                if invoice_data_payload:
                    existing = InvoiceData.objects.filter(document=document).first()
                    serializer = InvoiceDataSerializer(
                        existing, data=invoice_data_payload, partial=True
                    )
                    if not serializer.is_valid():
                        raise ValidationError(serializer.errors)
                    serializer.save(document=document)

                if new_status:
                    valid_choices = [c[0] for c in Document.STATUS_CHOICES]
                    if new_status not in valid_choices:
                        raise ValidationError({"status": "Valor de estado no válido."})
                    document.status = new_status
                    document.save()
        except ValidationError as exc:
            return Response(
                getattr(exc, "detail", str(exc)), status=status.HTTP_400_BAD_REQUEST
            )
        except Exception:
            logger.exception(
                "Error validating invoice data for document %s", document.id
            )
            return Response(
                {"error": "Error processing validation"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        serializer = self.get_serializer(document)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def stats(self, request):
        queryset = self.get_queryset()

        totals = queryset.filter(status="Procesado").aggregate(
            ingresos=Sum("invoice_data__total_amount", filter=Q(doc_type="Ingreso")),
            gastos=Sum(
                "invoice_data__total_amount",
                filter=Q(doc_type__in=["Gasto", "Factura"]),
            ),
            soportado=Sum(
                "invoice_data__tax_amount", filter=Q(doc_type__in=["Gasto", "Factura"])
            ),
            repercutido=Sum("invoice_data__tax_amount", filter=Q(doc_type="Ingreso")),
        )

        trends = (
            queryset.filter(status="Procesado")
            .annotate(month=TruncMonth("uploaded_at"))
            .values("month")
            .annotate(
                ingresos=Sum(
                    "invoice_data__total_amount", filter=Q(doc_type="Ingreso")
                ),
                gastos=Sum(
                    "invoice_data__total_amount",
                    filter=Q(doc_type__in=["Gasto", "Factura"]),
                ),
                soportado=Sum(
                    "invoice_data__tax_amount",
                    filter=Q(doc_type__in=["Gasto", "Factura"]),
                ),
                repercutido=Sum(
                    "invoice_data__tax_amount", filter=Q(doc_type="Ingreso")
                ),
            )
            .order_by("month")
        )

        return Response(
            {
                "totals": {
                    "ingresos": totals["ingresos"] or 0,
                    "gastos": totals["gastos"] or 0,
                    "iva_soportado": totals["soportado"] or 0,
                    "iva_repercutido": totals["repercutido"] or 0,
                },
                "trends": [
                    {
                        "name": t["month"].strftime("%Y-%m") if t["month"] else "N/A",
                        "ingresos": t["ingresos"] or 0,
                        "gastos": t["gastos"] or 0,
                        "soportado": t["soportado"] or 0,
                        "repercutido": t["repercutido"] or 0,
                    }
                    for t in trends
                ],
                "documents_count": queryset.count(),
                "processed_count": queryset.filter(status="Procesado").count(),
            }
        )

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def download(self, request, pk=None):
        document = self.get_object()
        is_preview = request.query_params.get("preview", "").lower() == "true"

        try:
            if not document.storage_path or not default_storage.exists(
                document.storage_path
            ):
                return Response(
                    {
                        "error": "Archivo no encontrado",
                        "detail": f"El archivo '{document.file_name}' no está disponible en el servidor.",
                        "storage_path": document.storage_path,
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            file_ext = os.path.splitext(document.file_name)[1].lower()
            content_type_map = {
                ".pdf": "application/pdf",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".gif": "image/gif",
                ".webp": "image/webp",
                ".txt": "text/plain",
                ".csv": "text/csv",
            }
            content_type = content_type_map.get(file_ext, "application/octet-stream")

            file_obj = default_storage.open(document.storage_path, "rb")
            return FileResponse(
                file_obj,
                content_type=content_type,
                as_attachment=not is_preview,
                filename=document.file_name,
            )
        except Exception:
            logger.exception(
                "Error downloading document %s from storage %s",
                document.id,
                document.storage_path,
            )
            return Response(
                {
                    "error": "Error al descargar el archivo",
                    "detail": "No se pudo procesar la descarga. Intenta de nuevo más tarde.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class InvoiceDataViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InvoiceDataSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self.request.user, "role", None) == "Asesor":
            return (
                InvoiceData.objects.filter(
                    document__business__users__user=self.request.user
                )
                .select_related("document")
                .distinct()
            )

        return (
            InvoiceData.objects.filter(document__uploaded_by=self.request.user)
            .select_related("document")
            .distinct()
        )


class TaxCalendarViewSet(viewsets.ModelViewSet):
    serializer_class = TaxCalendarSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        year = self.request.query_params.get("year")
        try:
            year_value = int(year) if year else None
        except (TypeError, ValueError):
            year_value = None

        if self.request.user.role == "Asesor":
            queryset = TaxCalendar.objects.all().select_related(
                "business", "business__responsible_advisor", "presented_by"
            )
        else:
            queryset = TaxCalendar.objects.filter(
                business__users__user=self.request.user
            ).select_related(
                "business", "business__responsible_advisor", "presented_by"
            )

        business_id = self.request.query_params.get("business_id")
        if business_id:
            queryset = queryset.filter(business_id=business_id)

        if year_value is not None:
            queryset = queryset.filter(period_start__year=year_value)

        return queryset

    @action(detail=False, methods=["get"])
    def summary(self, request):
        queryset = self.get_queryset()
        summary = (
            queryset.annotate(month=TruncMonth("deadline"))
            .values("month", "is_presented")
            .annotate(count=Count("id"))
            .order_by("month", "is_presented")
        )
        return Response(list(summary), status=status.HTTP_200_OK)
