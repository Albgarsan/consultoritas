import pytest
from django.contrib.auth import get_user_model
from model_bakery import baker
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def client_user():
    return baker.make(User, role="Cliente", email="cliente_test@consultoritas.es")


@pytest.fixture
def advisor_user():
    return baker.make(User, role="Asesor", email="asesor_test@consultoritas.es")


@pytest.fixture
def authenticated_client(api_client, client_user):
    api_client.force_authenticate(user=client_user)
    return api_client, client_user


@pytest.fixture
def authenticated_advisor(api_client, advisor_user):
    api_client.force_authenticate(user=advisor_user)
    return api_client, advisor_user
