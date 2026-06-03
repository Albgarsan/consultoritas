import json
import logging
import mimetypes
import os
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Optional

from apps.documents.models import Document, InvoiceData
from django.core.files.storage import default_storage
from django.db import transaction
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class InvoiceSchema(BaseModel):
    is_valid_invoice: bool = Field(
        default=True,
        description="¿Es este documento una factura o ticket válido? False si es un currículum, foto de un perro, etc.",
    )

    invoice_series: Optional[str] = Field(
        default=None, description="Serie de la factura (ej: F2023). Si no hay, null."
    )
    invoice_number: str = Field(
        default="S/N", description="Número de la factura (ej: 98765)"
    )
    supplier_name: Optional[str] = Field(
        default=None, description="Nombre o razón social del emisor"
    )
    supplier_tax_id: Optional[str] = Field(
        default=None, description="CIF/NIF del emisor"
    )
    issue_date: Optional[str] = Field(
        default=None, description="Fecha de la factura en formato YYYY-MM-DD"
    )
    tax_base: float = Field(default=0.0, description="Base imponible")
    tax_rate: float = Field(
        default=0.0, description="Tipo impositivo de IVA (ej: 21.0)"
    )
    equivalence_surcharge: float = Field(
        default=0.0, description="Tipo de recargo de equivalencia si existe (ej: 5.2)"
    )
    total_amount: float = Field(default=0.0, description="Importe total")
    currency: str = Field(default="EUR", description="Moneda (ej. EUR, USD)")
    operation_key: str = Field(
        default="01",
        description="Clave de operación: 01 (Interior), 02 (Intracomunitaria), etc.",
    )


class GeminiOCRService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "Configuración de API requerida: GEMINI_API_KEY no encontrada"
            )
        self.client = genai.Client(api_key=api_key)

    def process_document(self, document: Document) -> InvoiceData:
        with default_storage.open(document.storage_path, "rb") as document_file:
            file_bytes = document_file.read()

        mime_type, _ = mimetypes.guess_type(document.file_name or document.storage_path)
        extracted_data = self.extract_invoice_data(
            file_bytes=file_bytes,
            mime_type=mime_type or "application/octet-stream",
        )
        return self.save_invoice_data(document=document, extracted_data=extracted_data)

    def save_invoice_data(
        self, document: Document, extracted_data: dict
    ) -> InvoiceData:
        def to_decimal(value):
            if value in (None, ""):
                return None
            try:
                return Decimal(str(value))
            except (InvalidOperation, TypeError, ValueError) as exc:
                raise ValueError(f"Valor numérico no válido en OCR: {value}") from exc

        def to_date(value):
            if value in (None, ""):
                return None
            if isinstance(value, date):
                return value
            try:
                return date.fromisoformat(str(value)[:10])
            except ValueError as exc:
                raise ValueError(f"Fecha no válida en OCR: {value}") from exc

        defaults = {
            "supplier_name": extracted_data.get("supplier_name"),
            "supplier_tax_id": extracted_data.get("supplier_tax_id"),
            "issue_date": to_date(extracted_data.get("issue_date")),
            "currency": extracted_data.get("currency") or "EUR",
            "serie": extracted_data.get("invoice_series"),
            "invoice_number": extracted_data.get("invoice_number"),
            "clave_operacion": extracted_data.get("operation_key") or "01",
            "tax_base": to_decimal(extracted_data.get("tax_base")),
            "tax_rate": to_decimal(extracted_data.get("tax_rate")),
            "equivalence_tax_rate": to_decimal(
                extracted_data.get("equivalence_surcharge")
            ),
        }

        with transaction.atomic():
            invoice_data, _ = InvoiceData.objects.update_or_create(
                document=document,
                defaults=defaults,
            )

        return invoice_data

    def extract_invoice_data(self, file_bytes: bytes, mime_type: str) -> dict:
        prompt = (
            "Eres un auditor contable experto. Analiza este documento (factura o ticket). "
            "Extrae con absoluta precisión matemática los valores requeridos y devuélvelos "
            "ESTRICTAMENTE conformes al esquema solicitado. Si un campo no es legible o no existe, "
            "devuelve null (o su equivalente vacío)."
        )

        try:
            document_part = types.Part.from_bytes(
                data=file_bytes,
                mime_type=mime_type or "application/octet-stream",
            )

            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[document_part, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=InvoiceSchema,
                    temperature=0.0,
                ),
            )

            if not response.text:
                raise ValueError("Respuesta vacía de la API de Gemini")

            data = json.loads(response.text)
            return data

        except Exception as e:
            logger.exception("Fallo inesperado en GeminiOCRService")
            raise ValueError(
                f"Fallo en la extracción analítica del OCR: {str(e)}"
            ) from e
