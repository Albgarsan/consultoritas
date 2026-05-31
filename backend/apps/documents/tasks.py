import logging
import mimetypes

import requests
from celery import shared_task
from django.core.files.storage import default_storage

from .models import Document
from .services import GeminiOCRService

logger = logging.getLogger(__name__)


@shared_task(
    name="apps.documents.process_document_ocr",
    autoretry_for=(requests.exceptions.RequestException, TimeoutError),
    retry_backoff=True,
    max_retries=3,
)
def process_document_ocr_task(document_id):
    try:
        document = Document.objects.select_related("business", "uploaded_by").get(
            pk=document_id
        )
    except Document.DoesNotExist:
        logger.warning(
            "OCR task skipped because document %s no longer exists", document_id
        )
        return

    try:
        service = GeminiOCRService()

        with default_storage.open(document.storage_path, "rb") as document_file:
            file_bytes = document_file.read()

        mime_type, _ = mimetypes.guess_type(document.file_name or document.storage_path)
        extracted_data = service.extract_invoice_data(
            file_bytes=file_bytes,
            mime_type=mime_type or "application/octet-stream",
        )

        if not extracted_data.get("is_valid_invoice", True):
            Document.objects.filter(pk=document.id).update(status="Error")
            return None

        invoice_data = service.save_invoice_data(
            document=document, extracted_data=extracted_data
        )
        Document.objects.filter(pk=document.id).update(status="Pendiente")

        return str(invoice_data.id)
    except Exception:
        Document.objects.filter(pk=document.id).update(status="Error")
        raise
