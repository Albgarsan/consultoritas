from celery import shared_task
from django.db import transaction

from .models import Document
from .services import OCRService


@shared_task(name="apps.documents.process_document_ocr")
def process_document_ocr(document_id):
    document = Document.objects.select_related("business", "uploaded_by").get(
        pk=document_id
    )

    with transaction.atomic():
        invoice_data = OCRService.process_document(document)
        Document.objects.filter(pk=document.id).update(status="Pendiente")

    return str(invoice_data.id)
