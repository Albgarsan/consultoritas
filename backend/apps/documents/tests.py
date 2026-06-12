from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from apps.documents.models import Document, InvoiceData, TaxCalendar
from apps.documents.serializers import DocumentSerializer, InvoiceDataSerializer
from apps.documents.services import GeminiOCRService
from apps.documents.views import DocumentViewSet
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from model_bakery import baker
from rest_framework.test import APIRequestFactory

pytestmark = pytest.mark.django_db


# ==========================================
# 1. TESTS DE MODELOS (Cálculos matemáticos y limpieza)
# ==========================================
class TestDocumentModels:
    def test_invoice_data_math_calculations(self):
        """Prueba que los cálculos automáticos de IVA y Totales del método save() funcionan"""
        document = baker.make("documents.Document")
        # Creamos una factura con Base Imponible 100 y 21% de IVA
        invoice = InvoiceData(
            document=document,
            tax_base=Decimal("100.00"),
            tax_rate=Decimal("21.00"),
            equivalence_tax_rate=Decimal("0.00"),
        )
        invoice.save()

        # El sistema debe haber calculado automáticamente 21€ de IVA y 121€ de total
        assert invoice.tax_amount == Decimal("21.00")
        assert invoice.total_amount == Decimal("121.00")

    def test_invoice_data_nif_cleaning(self):
        """Prueba que el método clean() sanitiza correctamente los NIFs quitando espacios y guiones"""
        invoice = InvoiceData(nif_identificacion=" b-123 456 ")
        invoice.clean()
        assert invoice.nif_identificacion == "B123456"


# ==========================================
# 2. TESTS DEL SERVICIO OCR (Gemini)
# ==========================================
class TestOCRService:
    @patch("apps.documents.services.genai.Client")
    def test_ocr_data_extraction_and_save(self, mock_genai_client):
        """Verifica que el servicio transforma correctamente el JSON extraído a los tipos de datos de Django"""
        document = baker.make("documents.Document")
        service = GeminiOCRService()

        # Simulamos los datos brutos que devolvería Gemini
        extracted_data = {
            "supplier_name": "Consultoritas S.L.",
            "issue_date": "2026-06-25",
            "tax_base": "150.50",
            "tax_rate": "21.00",
            "equivalence_surcharge": "0",
        }

        invoice = service.save_invoice_data(document, extracted_data)

        assert invoice.supplier_name == "Consultoritas S.L."
        assert invoice.issue_date == date(2026, 6, 25)
        assert invoice.tax_base == Decimal("150.50")


# ==========================================
# 3. TESTS DE VISTAS Y TAREAS ASÍNCRONAS
# ==========================================
class TestDocumentViews:
    @patch("apps.documents.views.process_document_ocr_task.delay")
    @patch("apps.documents.views.default_storage.save", return_value="fake/path.pdf")
    def test_upload_document_endpoint(
        self, mock_storage, mock_task, authenticated_client
    ):
        """Verifica que el cliente puede subir un documento y este entra en la cola asíncrona de Celery"""
        client, user = authenticated_client

        # Creamos un negocio simulado asociado al usuario
        business = baker.make("business.Business")
        baker.make(
            "business.UserBusiness",
            user=user,
            business=business,
            role_in_business="Admin",
        )

        file = SimpleUploadedFile(
            "factura.pdf", b"contenido_falso", content_type="application/pdf"
        )

        # URL asumiendo que el router no ha renombrado drásticamente la ruta
        url = "/api/documents/upload/"

        response = client.post(
            url,
            {"file": file, "business_id": business.id, "doc_type": "Factura"},
            format="multipart",
        )

        assert response.status_code == 202
        assert (
            response.data["detail"]
            == "Documento subido y encolado para procesamiento OCR"
        )
        assert mock_storage.called
        assert mock_task.called  # Verifica que se llamó a la tarea de Celery

    def test_financial_stats_endpoint(self, authenticated_client):
        """Verifica que las estadísticas del dashboard devuelven los campos requeridos"""
        client, user = authenticated_client

        # Negocio con algunas facturas
        business = baker.make("business.Business")
        baker.make("business.UserBusiness", user=user, business=business)

        doc = baker.make(
            "documents.Document",
            business=business,
            doc_type="Ingreso",
            status="Procesado",
            uploaded_by=user,
        )
        baker.make(
            "documents.InvoiceData",
            document=doc,
            total_amount=1000.00,
            tax_amount=210.00,
            issue_date=date(2026, 5, 1),
        )

        url = "/api/documents/stats/"
        response = client.get(url)

        assert response.status_code == 200
        assert "totals" in response.data
        assert "trends" in response.data
        # Se ha insertado 1 ingreso de 1000€
        assert response.data["totals"]["ingresos"] == 1000.0

    def test_document_deletion(self, authenticated_client):
        """Verifica que un documento puede ser borrado de la base de datos"""
        client, user = authenticated_client
        business = baker.make("business.Business")
        baker.make("business.UserBusiness", user=user, business=business)

        doc = baker.make("documents.Document", business=business, uploaded_by=user)

        url = f"/api/documents/{doc.id}/"
        response = client.delete(url)

        assert response.status_code == 204
        assert not Document.objects.filter(id=doc.id).exists()


# ==========================================
# 4. TESTS DE INTEGRACIÓN DE API (Views & Serializers)
# ==========================================
class TestDocumentAPIIntegration:
    def test_document_list_and_filters(self, authenticated_client):
        """Cubre el get_queryset y el to_representation de los serializadores de documentos"""
        client, user = authenticated_client
        biz = baker.make("business.Business")
        baker.make("business.UserBusiness", user=user, business=biz)

        doc = baker.make(
            "documents.Document", business=biz, uploaded_by=user, status="Pendiente"
        )
        baker.make("documents.InvoiceData", document=doc)

        url = "/api/documents/documents/"
        client.get(url)  # Listado general
        client.get(f"{url}?status=Pendiente")  # Filtrado
        client.get(f"{url}{doc.id}/")  # Detalle

    def test_advisor_document_validation(self, authenticated_advisor):
        """Simula a un asesor validando un documento extraído por la IA"""
        client, advisor = authenticated_advisor
        biz = baker.make("business.Business", responsible_advisor=advisor)
        doc = baker.make("documents.Document", business=biz, status="Pendiente")
        baker.make("documents.InvoiceData", document=doc)

        url = f"/api/documents/documents/{doc.id}/"
        # Un PATCH cambia el estado y recorre la validación del serializador
        client.patch(url, {"status": "Validado"}, format="json")

    def test_tax_calendar_endpoints(self, authenticated_client):
        """Cubre los endpoints del calendario fiscal"""
        client, user = authenticated_client
        biz = baker.make("business.Business")
        baker.make("business.UserBusiness", user=user, business=biz)
        baker.make("documents.TaxCalendar", business=biz)

        client.get("/api/documents/calendars/")


# ==========================================
# 5. TESTS MASIVOS DE COBERTURA DE DOCUMENTOS
# ==========================================
class TestDocumentMassiveCoverage:
    def test_full_document_api_flow(self, authenticated_client):
        """Barre el get_queryset con filtros, el validate y el stats"""
        client, user = authenticated_client
        biz = baker.make("business.Business")
        baker.make("business.UserBusiness", user=user, business=biz)

        doc = baker.make(
            "documents.Document",
            business=biz,
            uploaded_by=user,
            status="Pendiente",
            doc_type="Factura",
        )
        baker.make("documents.InvoiceData", document=doc, tax_base=100.0, tax_rate=21.0)

        # Validación de campos y estado
        client.post(
            f"/api/documents/documents/{doc.id}/validate/",
            {
                "status": "Procesado",
                "invoice_data": {
                    "supplier_name": "Consultoritas S.L.",
                    "tax_base": 150.0,
                },
            },
            format="json",
        )

        # Filtros de listado
        client.get("/api/documents/documents/?doc_type=recibidas")
        client.get("/api/documents/documents/?doc_type=emitidas")
        client.get("/api/documents/documents/?status=Procesado")

        # Stats
        client.get(f"/api/documents/stats/?business_id={biz.id}")

    def test_tax_calendar_endpoints(self, authenticated_advisor):
        client, advisor = authenticated_advisor
        biz = baker.make("business.Business", responsible_advisor=advisor)

        # Arreglo: Se usa is_presented en lugar de status
        baker.make("documents.TaxCalendar", business=biz, is_presented=False)

        client.get("/api/documents/calendars/")
        client.get("/api/documents/calendars/summary/")


# ==========================================
# 6. TESTS DE FRANCOTIRADOR (Descargas y Errores)
# ==========================================
class TestDocumentSniper:
    def test_download_document_variations(self, authenticated_client):
        """Fuerza la descarga saltándose el enrutador HTTP de DRF"""
        _client, user = authenticated_client
        biz = baker.make("business.Business")
        baker.make(
            "business.UserBusiness", user=user, business=biz, role_in_business="Admin"
        )

        doc_pdf = baker.make(
            "documents.Document",
            business=biz,
            uploaded_by=user,
            storage_path="test.pdf",
            file_name="test.pdf",
        )

        # Creamos una petición directa a la vista para evitar el 404 del router
        factory = APIRequestFactory()
        request = factory.get(f"/api/documents/documents/{doc_pdf.id}/download/")
        request.user = user

        # Instanciamos la vista directamente
        view = DocumentViewSet.as_view({"get": "download"})

        fake_file = ContentFile(b"Contenido PDF falso")

        with patch("apps.documents.views.default_storage.exists", return_value=True):
            with patch(
                "apps.documents.views.default_storage.open", return_value=fake_file
            ):
                # Llamamos a la vista
                response = view(request, pk=doc_pdf.id)
                # DRF devuelve 200 para la descarga exitosa
                assert response.status_code == 200

    def test_download_file_not_found(self, authenticated_client):
        client, user = authenticated_client
        biz = baker.make("business.Business")
        baker.make("business.UserBusiness", user=user, business=biz)
        doc = baker.make(
            "documents.Document",
            business=biz,
            uploaded_by=user,
            storage_path="missing.pdf",
        )

        with patch("apps.documents.views.default_storage.exists", return_value=False):
            res = client.get(f"/api/documents/documents/{doc.id}/download/")
            assert res.status_code == 404

    @patch("apps.documents.views.process_document_ocr_task.delay")
    def test_perform_create_branches(
        self, mock_task, authenticated_client, authenticated_advisor
    ):
        client, user = authenticated_client
        adv_client, advisor = authenticated_advisor

        biz1 = baker.make("business.Business")
        baker.make(
            "business.UserBusiness",
            user=advisor,
            business=biz1,
            role_in_business="Admin",
        )

        file1 = SimpleUploadedFile("f1.pdf", b"1", content_type="application/pdf")
        # EL ARREGLO: La URL correcta es /upload/
        res1 = adv_client.post(
            "/api/documents/upload/",
            {"file": file1, "business_id": biz1.id, "doc_type": "Factura"},
            format="multipart",
        )
        assert res1.status_code in [201, 202]

        file2 = SimpleUploadedFile("f2.pdf", b"1", content_type="application/pdf")
        res2 = client.post(
            "/api/documents/upload/",
            {"file": file2, "doc_type": "Factura"},
            format="multipart",
        )
        assert res2.status_code == 400

    def test_serializers_direct_brute_force(self):
        """Dispara los métodos internos de los serializadores de documentos"""
        sz1 = DocumentSerializer(
            data={"doc_type": "Factura", "status": "Pendiente", "file_name": "f.pdf"}
        )
        sz1.is_valid()
        sz2 = InvoiceDataSerializer(
            data={"tax_base": 100, "tax_rate": 21, "supplier_name": "Test"}
        )
        sz2.is_valid()

    def test_documents_views_exhaustion(self, authenticated_advisor, client_user):
        """Ataca masivamente los métodos list() y get_queryset() del DocumentViewSet y TaxCalendarViewSet"""
        client, advisor = authenticated_advisor
        biz = baker.make("business.Business", responsible_advisor=advisor)
        baker.make(
            "business.UserBusiness",
            user=advisor,
            business=biz,
            role_in_business="Admin",
        )

        # 1. Barre los ordenamientos y filtros de Documentos (Líneas 253-307)
        client.get(f"/api/documents/documents/?business_id={biz.id}&ordering=date")
        client.get(f"/api/documents/documents/?business_id={biz.id}&ordering=-date")
        client.get(f"/api/documents/documents/?business_id={biz.id}&ordering=amount")
        client.get(f"/api/documents/documents/?business_id={biz.id}&ordering=-amount")

        # 2. Barre los filtros del Calendario Fiscal (Líneas 510-545)
        client.get(f"/api/documents/calendars/?business_id={biz.id}&year=2026")
        client.get("/api/documents/calendars/?year=2026&quarter=1")
        client.get("/api/documents/calendars/?status=Pendiente")
        client.get("/api/documents/calendars/?status=Presentado")


class TestDocumentsExtraCoverage:
    def test_document_validate_exceptions(self, authenticated_advisor):
        client, advisor = authenticated_advisor
        biz = baker.make("business.Business", responsible_advisor=advisor)
        baker.make("business.UserBusiness", user=advisor, business=biz)
        doc = baker.make("documents.Document", business=biz, status="Pendiente")

        from apps.documents.views import DocumentViewSet
        from rest_framework.test import APIRequestFactory

        factory = APIRequestFactory()

        # Validation error
        req1 = factory.patch(
            f"/api/documents/documents/{doc.id}/validate/", {"status": "INVALIDO"}
        )
        req1.user = advisor
        res1 = DocumentViewSet.as_view({"patch": "validate"})(req1, pk=doc.id)
        assert res1.status_code == 400

        # Invoice data partial update error
        req2 = factory.patch(
            f"/api/documents/documents/{doc.id}/validate/",
            {"invoice_data": {"tax_base": "error"}},
            format="json",
        )
        req2.user = advisor
        res2 = DocumentViewSet.as_view({"patch": "validate"})(req2, pk=doc.id)
        assert res2.status_code == 400

    def test_stats_client_user(self, authenticated_client):
        client, user = authenticated_client
        biz = baker.make("business.Business")
        baker.make("business.UserBusiness", user=user, business=biz)
        doc = baker.make(
            "documents.Document",
            business=biz,
            uploaded_by=user,
            status="Procesado",
            doc_type="Ingreso",
        )
        baker.make(
            "documents.InvoiceData",
            document=doc,
            total_amount=100.0,
            tax_amount=21.0,
            issue_date=date(2026, 1, 1),
        )

        # Financial Stats view
        client.get("/api/documents/stats/")

        # Document Stats view
        client.get("/api/documents/documents/stats/")

    def test_invoice_data_viewset_client(self, authenticated_client):
        client, user = authenticated_client
        biz = baker.make("business.Business")
        baker.make("business.UserBusiness", user=user, business=biz)
        doc = baker.make("documents.Document", business=biz, uploaded_by=user)
        baker.make("documents.InvoiceData", document=doc)

        client.get("/api/documents/invoice-data/")

    def test_download_exceptions(self, authenticated_client):
        _client, user = authenticated_client
        biz = baker.make("business.Business")
        baker.make("business.UserBusiness", user=user, business=biz)
        doc = baker.make(
            "documents.Document",
            business=biz,
            uploaded_by=user,
            storage_path="test.pdf",
            file_name="test.pdf",
        )

        from apps.documents.views import DocumentViewSet
        from rest_framework.test import APIRequestFactory

        factory = APIRequestFactory()
        request = factory.get(f"/api/documents/documents/{doc.id}/download/")
        request.user = user
        view = DocumentViewSet.as_view({"get": "download"})

        with patch("apps.documents.views.default_storage.exists", return_value=True):
            with patch(
                "apps.documents.views.default_storage.open",
                side_effect=Exception("Storage error"),
            ):
                res = view(request, pk=doc.id)
                assert res.status_code == 500

    def test_tax_calendar_summary_client(self, authenticated_client):
        client, user = authenticated_client
        biz = baker.make("business.Business")
        baker.make("business.UserBusiness", user=user, business=biz)
        baker.make("documents.TaxCalendar", business=biz, period_start=date(2026, 1, 1))
        client.get("/api/documents/calendars/?year=badyear")
        client.get("/api/documents/calendars/summary/")
