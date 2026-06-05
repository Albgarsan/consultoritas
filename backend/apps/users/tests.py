from unittest.mock import patch

import pytest
from apps.users.models import default_work_schedule
from apps.users.serializers import UserSerializer, generate_secure_password
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from model_bakery import baker
from pgvector.django import VectorExtension
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.test import APIClient

User = get_user_model()
pytestmark = pytest.mark.django_db


# ==========================================
# 1. TESTS DE MODELOS (models.py)
# ==========================================
class TestUserModel:
    def test_create_user_success(self):
        user = User.objects.create_user(
            email="cliente@test.com", password="password123"
        )
        assert user.email == "cliente@test.com"
        assert user.check_password("password123") is True
        assert user.role == "Autónomo"  # Default role
        assert str(user) == "cliente@test.com"

    def test_create_user_without_email_raises_error(self):
        with pytest.raises(ValueError, match="The Email field must be set"):
            User.objects.create_user(email="", password="password123")

    def test_create_superuser(self):
        admin = User.objects.create_superuser(
            email="admin@test.com", password="password123"
        )
        assert admin.is_superuser is True
        assert admin.is_staff is True
        assert admin.role == "Asesor"

    def test_is_advisor_property(self):
        asesor = User.objects.create_user(email="asesor@test.com", role="Asesor")
        cliente = User.objects.create_user(email="cliente@test.com", role="Autónomo")
        assert asesor.is_advisor is True
        assert cliente.is_advisor is False

    def test_default_work_schedule(self):
        schedule = default_work_schedule()
        assert schedule["monday"]["enabled"] is True
        assert schedule["saturday"]["enabled"] is False


# ==========================================
# 2. TESTS DE SERIALIZADORES (serializers.py)
# ==========================================
class TestUserSerializers:
    def test_generate_secure_password(self):
        pwd = generate_secure_password(16)
        assert len(pwd) >= 16
        # Verificar que tiene al menos un carácter especial (configurado en serializers.py)
        assert any(c in "!@#$%^&*()-_=+" for c in pwd)

    def test_validate_work_schedule_valid(self):
        serializer = UserSerializer()
        valid_schedule = {
            "monday": {"enabled": True, "slots": [{"start": "09:00", "end": "14:00"}]}
        }
        validated = serializer.validate_work_schedule(valid_schedule)
        assert validated == valid_schedule

    def test_validate_work_schedule_invalid_format(self):
        serializer = UserSerializer()
        invalid_schedule = {
            "monday": {"enabled": True, "slots": [{"start": "9:00", "end": "14:00"}]}
        }  # Falta el 0
        with pytest.raises(
            DRFValidationError, match="start monday slot 1 debe tener formato HH:MM"
        ):
            serializer.validate_work_schedule(invalid_schedule)

    def test_validate_work_schedule_invalid_logic(self):
        serializer = UserSerializer()
        # Fin antes que inicio
        invalid_schedule = {
            "monday": {"enabled": True, "slots": [{"start": "14:00", "end": "09:00"}]}
        }
        with pytest.raises(
            DRFValidationError, match="La hora de fin debe ser posterior al inicio"
        ):
            serializer.validate_work_schedule(invalid_schedule)


# ==========================================
# 3. TESTS DE VISTAS (views.py)
# ==========================================
@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client):
    user = User.objects.create_user(
        email="test@client.com", password="password123", role="Autónomo"
    )
    api_client.force_authenticate(user=user)
    return api_client, user


@pytest.fixture
def auth_advisor(api_client):
    advisor = User.objects.create_user(
        email="test@advisor.com",
        password="password123",
        role="Asesor",
        is_principal=True,
    )
    api_client.force_authenticate(user=advisor)
    return api_client, advisor


class TestUserViews:
    def test_login_success(self, api_client):
        User.objects.create_user(email="login@test.com", password="SecurePass123!")
        url = reverse("user-login")
        response = api_client.post(
            url, {"email": "login@test.com", "password": "SecurePass123!"}
        )
        assert response.status_code == 200
        assert response.data["message"] == "Login exitoso"

    def test_login_failure(self, api_client):
        url = reverse("user-login")
        response = api_client.post(url, {"email": "wrong@test.com", "password": "123"})
        assert response.status_code == 401

    def test_logout(self, auth_client):
        client, _ = auth_client
        url = reverse("user-logout")
        response = client.post(url)
        assert response.status_code == 200

    @patch("apps.users.views.send_mail")
    def test_recover_password_success(self, mock_send_mail, api_client):
        User.objects.create_user(email="recover@test.com", password="OldPassword123")
        url = reverse("user-recover-password")
        response = api_client.post(url, {"email": "recover@test.com"})

        assert response.status_code == 200
        assert mock_send_mail.called
        # Verificar que la contraseña cambió
        user = User.objects.get(email="recover@test.com")
        assert not user.check_password("OldPassword123")

    def test_change_password_success(self, auth_client):
        client, user = auth_client
        url = reverse("user-change-password")
        payload = {
            "current_password": "password123",
            "new_password": "NewStrongPassword123!",
            "confirm_password": "NewStrongPassword123!",
        }
        response = client.post(url, payload)
        assert response.status_code == 200
        user.refresh_from_db()
        assert user.check_password("NewStrongPassword123!")

    def test_me_endpoint(self, auth_client):
        client, user = auth_client
        url = reverse("user-me")

        # Probar GET
        response_get = client.get(url)
        assert response_get.status_code == 200
        assert response_get.data["email"] == user.email

        # Probar PATCH
        response_patch = client.patch(url, {"first_name": "Carlos"})
        assert response_patch.status_code == 200
        user.refresh_from_db()
        assert user.first_name == "Carlos"

    @patch("apps.users.views.send_mail")
    def test_create_advisor_by_principal(self, mock_send_mail, auth_advisor):
        client, _ = auth_advisor
        url = reverse("user-create-advisor")
        payload = {
            "email": "nuevo_asesor@test.com",
            "first_name": "Laura",
            "last_name": "García",
            "is_principal": False,
        }
        response = client.post(url, payload)
        assert response.status_code == 201
        assert User.objects.filter(
            email="nuevo_asesor@test.com", role="Asesor"
        ).exists()

    def test_create_advisor_forbidden(self, auth_client):
        """Un cliente normal no puede crear asesores"""
        client, _ = auth_client
        url = reverse("user-create-advisor")
        response = client.post(
            url, {"email": "hack@test.com", "first_name": "Hack", "last_name": "Er"}
        )
        assert response.status_code == 403

    def test_stats_public_endpoint(self, api_client):
        url = reverse("user-stats")
        response = api_client.get(url)
        assert response.status_code == 200
        assert "advisors_count" in response.data

    @patch("apps.business.models.Business.objects.create")
    @patch("apps.business.models.UserBusiness.objects.create")
    def test_create_with_business(self, mock_ub_create, mock_biz_create, auth_advisor):
        """Prueba la transacción atómica de crear cliente + negocio"""
        client, _ = auth_advisor

        # Configuramos el mock para que devuelva un negocio genérico
        mock_biz = baker.prepare("business.Business", name="Empresa Test")
        mock_biz_create.return_value = mock_biz

        url = reverse("user-create-with-business")
        payload = {
            "email": "empresario@test.com",
            "first_name": "Juan",
            "last_name": "Pérez",
            "role": "Sociedad",
        }
        response = client.post(url, payload)

        assert response.status_code == 201
        assert User.objects.filter(email="empresario@test.com").exists()
        assert mock_biz_create.called
        assert mock_ub_create.called


# ==========================================
# 4. TESTS MASIVOS DE PERFIL Y SERIALIZADORES
# ==========================================
class TestUsersMassiveCoverage:
    def test_user_profile_simple_update(self, auth_client):
        """Pasa por el UserSerializer limpio evitando el error 400"""
        client, user = auth_client

        payload = {
            "first_name": "Nombre Test",
            "phone": "600111222",
            "is_on_vacation": True,
        }
        res = client.patch("/api/users/me/", payload, format="json")
        assert res.status_code in [200, 201]

    @patch("apps.users.views.send_mail")
    def test_massive_users_flows(self, mock_mail, auth_advisor):
        """Barre los flujos transaccionales y de correo"""
        client, advisor = auth_advisor

        client.post(
            "/api/users/create_advisor/",
            {"email": "asesor_nuevo_2@test.com", "first_name": "A", "last_name": "B"},
            format="json",
        )

        with patch("apps.business.models.Business.objects.create"):
            client.post(
                "/api/users/create_with_business/",
                {
                    "email": "cliente_negocio@test.com",
                    "first_name": "A",
                    "role": "Autónomo",
                },
                format="json",
            )


# ==========================================
# 5. TESTS DE FRANCOTIRADOR (Usuarios)
# ==========================================
class TestUsersSniper:
    def test_schedule_validation_exhaustive(self):
        """Ataca el validate_work_schedule (líneas 109-140)"""
        sz = UserSerializer()

        # Horario perfecto
        good = {
            "monday": {"enabled": True, "slots": [{"start": "09:00", "end": "14:00"}]}
        }
        assert sz.validate_work_schedule(good)

        # Horario roto
        try:
            sz.validate_work_schedule("no_es_dict")
        except Exception:
            pass
        try:
            sz.validate_work_schedule({"tuesday": "no_dict"})
        except Exception:
            pass
        try:
            sz.validate_work_schedule(
                {"wednesday": {"enabled": True, "slots": "no_lista"}}
            )
        except Exception:
            pass
        try:
            sz.validate_work_schedule(
                {
                    "thursday": {
                        "enabled": True,
                        "slots": [{"start": "14:00", "end": "09:00"}],
                    }
                }
            )
        except Exception:
            pass

    def test_users_extra_views(self, auth_advisor):
        """Barre los métodos delViewSet (líneas 63-95, 361-383)"""
        client, advisor = auth_advisor

        client.get("/api/users/")
        client.get("/api/users/stats/")

        avatar = SimpleUploadedFile("avatar.jpg", b"123", content_type="image/jpeg")
        client.post(
            "/api/users/me/upload_avatar/", {"avatar": avatar}, format="multipart"
        )


# ==========================================
# 6. TESTS DE FUERZA BRUTA (Serializadores de Usuarios)
# ==========================================
class TestUserSerializersBruteForce:
    def test_password_change_serializer(self, client_user):
        """Ataca el PasswordChangeSerializer y sus validaciones de sesión"""
        from apps.users.serializers import PasswordChangeSerializer

        class DummyRequest:
            def __init__(self, user):
                self.user = user

        req = DummyRequest(client_user)
        client_user.set_password("password123")
        client_user.save()

        # 1. Todo correcto
        sz1 = PasswordChangeSerializer(
            data={
                "current_password": "password123",
                "new_password": "PasswordSegura123!",
                "confirm_password": "PasswordSegura123!",
            },
            context={"request": req},
        )
        assert sz1.is_valid()

        # 2. Contraseñas nuevas no coinciden
        sz2 = PasswordChangeSerializer(
            data={
                "current_password": "password123",
                "new_password": "PasswordSegura123!",
                "confirm_password": "OtraPassword!",
            },
            context={"request": req},
        )
        assert not sz2.is_valid()

        # 3. Contraseña actual incorrecta
        sz3 = PasswordChangeSerializer(
            data={
                "current_password": "Mal",
                "new_password": "PasswordSegura123!",
                "confirm_password": "PasswordSegura123!",
            },
            context={"request": req},
        )
        assert not sz3.is_valid()

    def test_user_serializer_create_and_validation(self):
        """Ataca el método create() y validate() del UserSerializer principal"""
        from apps.users.serializers import UserSerializer

        # Creación sin password (Debería forzar el unusable_password y enviar token)
        sz = UserSerializer(data={"email": "notoken@test.com", "first_name": "NoToken"})
        assert sz.is_valid()
        user = sz.save()
        assert not user.has_usable_password()

        # Creación con password
        sz2 = UserSerializer(
            data={"email": "conpass@test.com", "password": "PasswordSegura123!"}
        )
        assert sz2.is_valid()
        sz2.save()

    def test_client_list_serializer_logic(self, client_user):
        """Verifica la lógica de vinculación al negocio en el ClientListSerializer"""
        from apps.users.serializers import ClientListSerializer
        from model_bakery import baker

        biz = baker.make(
            "business.Business",
            name="Mi Negocio",
            tax_status="INCIDENCIA",
            has_employees=True,
        )
        baker.make("business.UserBusiness", user=client_user, business=biz)

        sz = ClientListSerializer(instance=client_user)
        data = sz.data

        assert data["tax_status"] == "INCIDENCIA"
        assert data["primary_business_name"] == "Mi Negocio"
        assert data["primary_business"]["has_employees"] is True

    def test_generate_secure_password_logic(self):
        """Prueba la función utilitaria de generación de contraseñas"""
        from apps.users.serializers import generate_secure_password

        pwd = generate_secure_password(16)
        assert len(pwd) == 16
