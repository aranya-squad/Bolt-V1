import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.users.models import User


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
def test_health_ok(client):
    url = reverse("health")
    response = client.get(url)
    assert response.status_code in (200, 503)  # 503 if redis not available in CI
    assert "status" in response.json()


@pytest.mark.django_db
def test_guardian_register(client):
    url = reverse("auth-register")
    payload = {
        "email": "guardian@test.com",
        "password": "StrongPass1!",
        "display_name": "Test Guardian",
    }
    response = client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert "access" in response.json()
    assert User.objects.filter(email="guardian@test.com", role="GUARDIAN").exists()


@pytest.mark.django_db
def test_guardian_register_short_password(client):
    url = reverse("auth-register")
    payload = {"email": "g@test.com", "password": "short", "display_name": "G"}
    response = client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_me_requires_auth(client):
    url = reverse("auth-me")
    response = client.get(url)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
