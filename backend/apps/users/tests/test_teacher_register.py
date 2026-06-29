"""W1-T04 — gated teacher signup (plan §1c, S1)."""
import pytest
from django.conf import settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.users.models import User


@pytest.fixture
def client():
    return APIClient()


def _payload(**over):
    data = {
        "email": "coach@example.com",
        "password": "longpassword123",
        "display_name": "Coach Sarah",
        "signup_secret": settings.TEACHER_SIGNUP_SECRET,
    }
    data.update(over)
    return data


@pytest.mark.django_db
def test_teacher_register_with_valid_secret(client):
    resp = client.post(reverse("auth-register-teacher"), _payload(), format="json")
    assert resp.status_code == 201
    assert "access" in resp.json()
    user = User.objects.get(email="coach@example.com")
    assert user.role == "TEACHER"
    assert settings.SIMPLE_JWT["REFRESH_COOKIE_NAME"] in resp.cookies


@pytest.mark.django_db
def test_teacher_register_wrong_secret_forbidden(client):
    resp = client.post(reverse("auth-register-teacher"), _payload(email="c2@example.com", signup_secret="wrong"), format="json")
    assert resp.status_code == 403
    assert not User.objects.filter(email="c2@example.com").exists()


@pytest.mark.django_db
def test_teacher_register_missing_secret_forbidden(client):
    data = _payload(email="c3@example.com")
    data.pop("signup_secret")
    resp = client.post(reverse("auth-register-teacher"), data, format="json")
    assert resp.status_code == 403


@pytest.mark.django_db
def test_teacher_register_ignores_client_role(client):
    resp = client.post(reverse("auth-register-teacher"), _payload(email="c4@example.com", role="ADMIN"), format="json")
    assert resp.status_code == 201
    assert User.objects.get(email="c4@example.com").role == "TEACHER"
