import logging
import os

from apps.business.models import Business
from apps.users.models import User
from django.conf import settings
from django.core.files.storage import default_storage
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.http import FileResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Document, InvoiceData, TaxCalendar
from .serializers import (
    DocumentSerializer,
    InvoiceDataSerializer,
    TaxCalendarSerializer,
)

logger = logging.getLogger(__name__)


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
            filtered = qs
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
        assigned_user_id = self.request.data.get("assigned_user_id")
        user_businesses = Business.objects.filter(users__user=self.request.user)

        if not user_businesses.exists():
            raise ValidationError("You must belong to a business to upload documents.")

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

        # Advisors can create invoices on behalf of a client and must explicitly assign one.
        target_user = self.request.user
        if getattr(self.request.user, "role", None) == "Asesor":
            if not assigned_user_id:
                raise ValidationError(
                    "Debes seleccionar un cliente para asignar la factura."
                )

            target_user = (
                User.objects.filter(pk=assigned_user_id).exclude(role="Asesor").first()
            )
            if not target_user:
                raise ValidationError("Cliente asignado no válido.")

            belongs_to_business = business.users.filter(user=target_user).exists()
            if not belongs_to_business:
                raise ValidationError(
                    "El cliente seleccionado no pertenece al negocio indicado."
                )

        document = serializer.save(business=business, uploaded_by=target_user)

    def destroy(self, request, *args, **kwargs):
        # Allow standard destroy but ensure storage cleanup via perform_destroy
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_destroy(self, instance):
        # Delete physical file from storage when removing document record
        try:
            if instance.storage_path:
                default_storage.delete(instance.storage_path)
        except Exception:
            # Best-effort: do not block deletion of DB record if storage fails
            pass

        # Finally delete the DB record
        instance.delete()

    @action(
        detail=True, methods=["post", "patch"], permission_classes=[IsAuthenticated]
    )
    def validate(self, request, pk=None):
        """Save validation data and mark document as processed.

        Expects payload:
        {
            "status": "Procesado",
            "invoice_data": {
                "supplier_name": "...",
                "supplier_tax_id": "...",
                "tax_base": 100.00,
                "tax_rate": 21.00,
                "total_amount": 121.00,
                ...
            }
        }
        """
        document = self.get_object()

        # Update document status
        new_status = request.data.get("status")
        if new_status:
            document.status = new_status
            document.save()

        # Update invoice data if provided
        invoice_data_payload = request.data.get("invoice_data")
        if invoice_data_payload:
            invoice_data, created = InvoiceData.objects.get_or_create(document=document)
            serializer = InvoiceDataSerializer(
                invoice_data, data=invoice_data_payload, partial=True
            )
            if serializer.is_valid():
                serializer.save()
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Return updated document
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
        """Download or preview document file.

        Query param 'preview=true' opens file inline instead of downloading.
        Returns the file content if found, otherwise 404 with descriptive error.
        """
        document = self.get_object()
        is_preview = request.query_params.get("preview", "").lower() == "true"

        file_path = os.path.join(settings.MEDIA_ROOT, document.storage_path)

        if not os.path.exists(file_path):
            return Response(
                {
                    "error": "Archivo no encontrado",
                    "detail": f"El archivo '{document.file_name}' no está disponible en el servidor.",
                    "storage_path": document.storage_path,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            # Determine content type based on file extension
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

            response = FileResponse(
                open(file_path, "rb"),
                content_type=content_type,
                as_attachment=not is_preview,
            )

            if not is_preview:
                response["Content-Disposition"] = (
                    f'attachment; filename="{document.file_name}"'
                )
            else:
                # For preview, use inline to open in browser
                response["Content-Disposition"] = (
                    f'inline; filename="{document.file_name}"'
                )

            return response
        except Exception:
            logger.exception(
                "Error downloading document %s from path %s",
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
            return InvoiceData.objects.all().distinct()

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
        if self.request.user.role == "Asesor":
            return TaxCalendar.objects.all().select_related("business")

        return TaxCalendar.objects.filter(
            business__users__user=self.request.user
        ).select_related("business")

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

    def perform_create(self, serializer):
        from apps.business.models import Business

        business_id = self.request.data.get("business_id") or self.request.data.get(
            "business"
        )
        user_businesses = Business.objects.filter(users__user=self.request.user)

        if business_id:
            business = user_businesses.filter(pk=business_id).first()
            if not business:
                from rest_framework.exceptions import ValidationError

                raise ValidationError("Invalid business or permission denied.")
        else:
            business = user_businesses.first()
            if not business:
                from rest_framework.exceptions import ValidationError

                raise ValidationError(
                    "You must belong to a business to create a tax calendar entry."
                )

        serializer.save(business=business)
