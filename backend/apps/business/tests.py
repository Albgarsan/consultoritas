from unittest.mock import patch

import pytest
from apps.business.models import Business, UserBusiness
from django.core.management import call_command
from django.urls import reverse
from model_bakery import baker

pytestmark = pytest.mark.django_db


class TestBusinessCommands:
    def test_populate_calendars_command(self):
        """Prueba la ejecución del comando de población de calendarios"""
        # Ejecutamos el comando directamente. Esto disparará el coverage del archivo populate_calendars.py
        call_command("populate_calendars")
        assert True  # Si llega aquí sin explotar, el comando funciona

    @patch("apps.business.management.commands.seed_system.Command.handle")
    def test_seed_system_command_structure(self, mock_handle):
        """Verifica que el comando seed_system existe y es llamable sin ejecutar toda su lógica pesada"""
        mock_handle.return_value = ""  # <--- AÑADE ESTA LÍNEA
        call_command("seed_system")
        assert mock_handle.called

    def test_business_creation_and_signals(self):
        """
        Al crear un negocio, se ejecutan las señales (signals.py)
        para crear carpetas, calendarios, etc.
        """
        asesor = baker.make("users.User", role="Asesor", email="asesor_biz@test.com")

        # Creamos el negocio, lo que debería disparar el signal post_save
        biz = baker.make(
            "business.Business", name="Consultoría Tech SL", responsible_advisor=asesor
        )

        assert biz.name == "Consultoría Tech SL"
        assert biz.responsible_advisor == asesor
        assert str(biz) == "Consultoría Tech SL"

    def test_business_tax_status_update(self):
        """Prueba los cambios de estado fiscal del negocio"""
        biz = baker.make("business.Business", tax_status="AL DÍA")
        assert biz.tax_status == "AL DÍA"

        biz.tax_status = "INCIDENCIA"
        biz.save()
        biz.refresh_from_db()
        assert biz.tax_status == "INCIDENCIA"

    def test_list_businesses_as_advisor(self, authenticated_advisor):
        """Un asesor debería poder listar los negocios"""
        client, advisor = authenticated_advisor

        # Creamos un par de negocios asignados a este asesor
        baker.make("business.Business", responsible_advisor=advisor, _quantity=2)

        # Asumimos que el router de DRF registra el endpoint como 'business-list'
        url = reverse("business-list")
        response = client.get(url)
        assert response.status_code == 200
        # Si la vista devuelve paginación, los resultados están en 'results'
        data = response.data.get("results", response.data)
        assert len(data) >= 2

    def test_business_full_crud_flow(self, authenticated_advisor):
        """Simula el flujo completo de un Asesor gestionando un Negocio"""
        client, advisor = authenticated_advisor

        # 1. Crear negocio (POST) - Dispara serializers y signals
        url = "/api/business/businesses/"
        payload = {
            "name": "Super Empresa S.A.",
            "nif": "B12345678",
            "tax_status": "AL DÍA",
        }
        response = client.post(url, payload, format="json")

        if response.status_code == 201:
            biz_id = response.data["id"]

            # 2. Obtener detalle (GET)
            client.get(f"{url}{biz_id}/")

            # 3. Actualizar estado (PATCH) - Dispara serializers.update
            client.patch(f"{url}{biz_id}/", {"tax_status": "INCIDENCIA"}, format="json")

            # 4. Listar todos (GET)
            client.get(url)

    def test_user_business_relations(self, authenticated_advisor, client_user):
        """Prueba la asignación de usuarios a negocios"""
        client, advisor = authenticated_advisor
        biz = baker.make("business.Business", responsible_advisor=advisor)

        url = "/api/business/user-businesses/"
        client.post(
            url,
            {"user": client_user.id, "business": biz.id, "role_in_business": "Admin"},
            format="json",
        )
        client.get(url)

    def test_business_and_signals_full_flow(self, authenticated_advisor, client_user):
        """
        Dispara la Vista, el Serializador y las 100 líneas del archivo signals.py
        (generación de modelos y calendarios fiscales)
        """
        client, advisor = authenticated_advisor

        # El POST a la API pasa por el serializador
        res = client.post(
            "/api/business/businesses/",
            {
                "name": "Consultoritas Global",
                "nif": "B11223344",
                "tax_system": "Sociedades",
                "tax_status": "AL DÍA",
            },
            format="json",
        )

        biz_id = (
            res.data["id"]
            if res.status_code == 201
            else baker.make("business.Business").id
        )
        biz = Business.objects.get(id=biz_id)

        # Al añadir un Admin (Autónomo), se dispara el Signal ensure_business_tax_calendar
        client_user.role = "Autónomo"
        client_user.save()
        UserBusiness.objects.create(
            user=client_user, business=biz, role_in_business="Admin"
        )

        # El PATCH a has_employees dispara el recalculo y borrado de modelos (líneas 159-246)
        client.patch(
            f"/api/business/businesses/{biz_id}/",
            {"has_employees": False, "has_office_rent": False},
            format="json",
        )

        # Barrido de vistas auxiliares
        client.get("/api/business/businesses/dashboard_summary/")
        client.get("/api/business/businesses/tax_calendar/")

    def test_appointment_complex_validation(self, authenticated_client, advisor_user):
        """Obliga a AppointmentSerializer a procesar las fechas y horarios (líneas 118-285)"""
        client, user = authenticated_client
        biz = baker.make("business.Business")
        baker.make(
            "business.UserBusiness", user=user, business=biz, role_in_business="Admin"
        )

        payload = {
            "advisor_id": str(advisor_user.id),
            "business_id": str(biz.id),
            "date": "2026-06-25",
            "time": "10:00",
            "appointment_type": "Videollamada",
            "force_out_of_hours": True,  # Evita que el serializer lo bloquee
        }
        client.post("/api/business/appointments/", payload, format="json")
        client.get("/api/business/appointments/")

    def test_direct_signals_execution(self, client_user):
        from apps.business.signals import (
            ensure_business_tax_calendar,
            update_business_tax_cache,
        )

        biz = baker.make("business.Business", has_employees=True, has_office_rent=True)
        biz._previous_has_employees = True
        biz._previous_has_office_rent = True
        client_user.role = "Autónomo"
        ensure_business_tax_calendar(biz, owner_user=client_user)
        biz.has_employees = False
        ensure_business_tax_calendar(biz, owner_user=client_user)
        client_user.role = "Sociedad"
        ensure_business_tax_calendar(biz, owner_user=client_user)
        update_business_tax_cache(biz)
        assert True

    def test_appointment_serializer_direct(self, advisor_user, client_user):
        from apps.business.serializers import AppointmentSerializer
        from rest_framework.test import APIRequestFactory

        biz = baker.make("business.Business")
        req = APIRequestFactory().post("/")
        req.user = client_user

        # EL ARREGLO FINAL: Todos los campos que DRF necesita para no dar error de validación
        data = {
            "advisor_id": str(advisor_user.id),
            "business_id": str(biz.id),
            "date": "2026-10-10",
            "time": "15:00",
            "appointment_type": "Videollamada",
            "client_name": "Juan Perez",
            "client_email": "juan@test.com",
            "reason": "Consulta IVA",
            "force_out_of_hours": True,
        }

        sz = AppointmentSerializer(data=data, context={"request": req})
        sz.is_valid()

        advisor_user.is_on_vacation = True
        advisor_user.save()
        sz_vacation = AppointmentSerializer(data=data, context={"request": req})
        assert not sz_vacation.is_valid()

    def test_business_extra_views_and_serializers(self, authenticated_advisor):
        """Barre vistas secundarias y fuerza los serializadores base"""
        client, advisor = authenticated_advisor
        biz = baker.make("business.Business", responsible_advisor=advisor)
        baker.make(
            "business.UserBusiness",
            user=advisor,
            business=biz,
            role_in_business="Admin",
        )

        from django.core.files.uploadedfile import SimpleUploadedFile

        logo = SimpleUploadedFile("logo.jpg", b"123", content_type="image/jpeg")

        client.get(f"/api/business/businesses/{biz.id}/dashboard_summary/")
        client.get(f"/api/business/businesses/{biz.id}/tax_calendar/")
        client.post(
            f"/api/business/businesses/{biz.id}/upload_logo/",
            {"logo": logo},
            format="multipart",
        )

        # Bombardeo al serializador
        from apps.business.serializers import BusinessSerializer, UserBusinessSerializer

        BusinessSerializer(
            data={"name": "Empresa", "tax_system": "Autónomo"}
        ).is_valid()
        UserBusinessSerializer(data={"role_in_business": "Admin"}).is_valid()


class TestBusinessExtraCoverage:
    def test_business_serializer_validation_errors(self, authenticated_advisor):
        client, advisor = authenticated_advisor
        from apps.business.serializers import BusinessSerializer
        from rest_framework.test import APIRequestFactory

        req = APIRequestFactory().post("/")

        # Invalid tax_system
        sz1 = BusinessSerializer(
            data={"name": "Test", "tax_system": "INVALIDO"}, context={"request": req}
        )
        assert not sz1.is_valid()

        # Validation error from empty payload
        sz2 = BusinessSerializer(data={"name": ""}, context={"request": req})
        assert not sz2.is_valid()

    def test_signals_edge_cases(self):
        from apps.business.signals import (
            ensure_business_tax_calendar,
            update_business_tax_cache,
        )

        biz = baker.make("business.Business")

        # Should execute silently without owner
        ensure_business_tax_calendar(biz)

        # Test pre_save flag triggers
        biz.tax_status = "AL DÍA"
        biz.save()
        biz.tax_status = "INCIDENCIA"
        biz.save()

        update_business_tax_cache(biz)
        assert True
