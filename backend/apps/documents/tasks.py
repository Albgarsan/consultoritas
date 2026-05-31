from celery import shared_task

from .models import Document
from .services import GeminiOCRService


@shared_task(name="apps.documents.process_document_ocr")
def process_document_ocr_task(document_id):
    document = Document.objects.select_related("business", "uploaded_by").get(
        pk=document_id
    )

    service = GeminiOCRService()
    invoice_data = service.process_document(document)
    Document.objects.filter(pk=document.id).update(status="Pendiente")

    return str(invoice_data.id)
