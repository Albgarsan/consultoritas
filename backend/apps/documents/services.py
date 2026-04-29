import decimal
import json
import logging
import mimetypes
import os

import google.generativeai as genai
import requests
from django.conf import settings

from .models import Document, InvoiceData

logger = logging.getLogger(__name__)


class OCRService:
    """
    Servicio de producción para procesamiento OCR con Gemini 1.5 Flash.
    Soporta múltiples formatos y validación de integridad de datos.
    """

    @staticmethod
    def process_document(document: Document) -> InvoiceData:
        try:
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
            model = genai.GenerativeModel("gemini-1.5-flash")

            path_or_url = document.storage_path
            content = None
            mime_type = mimetypes.guess_type(path_or_url)[0] or "application/pdf"

            if path_or_url.startswith(("http://", "https://")):
                response = requests.get(path_or_url, timeout=10)
                response.raise_for_status()
                content = response.content
            else:
                with open(path_or_url, "rb") as doc_file:
                    content = doc_file.read()

            prompt = """
            Actúa como un experto contable. Extrae los datos de esta factura al siguiente formato JSON exacto:
            {
                "supplier_name": string,
                "supplier_tax_id": string,
                "issue_date": "YYYY-MM-DD",
                "tax_base": number,
                "tax_rate": number,
                "total_amount": number,
                "currency": "EUR"
            }
            Reglas: Solo responde el JSON. Si un valor no es legible, usa null.
            """

            response = model.generate_content(
                [prompt, {"mime_type": mime_type, "data": content}]
            )

            text_response = response.text
            start_index = text_response.find("{")
            end_index = text_response.rfind("}") + 1
            data = json.loads(text_response[start_index:end_index])

            base = decimal.Decimal(str(data.get("tax_base") or 0)).quantize(
                decimal.Decimal("0.01")
            )
            rate = decimal.Decimal(str(data.get("tax_rate") or 0)).quantize(
                decimal.Decimal("0.01")
            )
            total = decimal.Decimal(str(data.get("total_amount") or 0)).quantize(
                decimal.Decimal("0.01")
            )

            expected_total = (base * (1 + rate / decimal.Decimal("100"))).quantize(
                decimal.Decimal("0.01")
            )
            if abs(expected_total - total) > decimal.Decimal("0.05"):
                logger.warning(
                    f"Discrepancia detectada en doc {document.id}: Esperado {expected_total}, Recibido {total}"
                )

            invoice_data = InvoiceData.objects.create(
                document=document,
                supplier_name=data.get("supplier_name") or "Desconocido",
                supplier_tax_id=data.get("supplier_tax_id"),
                issue_date=data.get("issue_date"),
                tax_base=base,
                tax_rate=rate,
                total_amount=total,
                currency=data.get("currency") or "EUR",
            )

            document.status = "Procesado"
            document.save()
            return invoice_data

        except Exception as e:
            logger.error(
                f"Error crítico en OCRService para documento {document.id}: {str(e)}"
            )
            document.status = "Error"
            document.save()
            raise
