import pytest
from django.conf import settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.users.models import User
from apps.users.tests.factories import GuardianFactory


_COOKIE_NAME = settings.SIMPLE_JWT["REFRESH_COOKIE_NAME"]
_COOKIE_PATH = settings.SIMPLE_JWT["REFRESH_COOKIE_PATH"]


@pytest.fixture
def client():
    return APIClient()


# ---------------------------------------------------------------------------
# Liveness
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_health_ok(client):
    url = reverse("health")
    response = client.get(url)
    assert response.status_code in (200, 503)  # 503 if redis not available in CI
    assert "status" in response.json()


# ---------------------------------------------------------------------------
# Guardian registration
# ---------------------------------------------------------------------------


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
def test_guardian_register_sets_refresh_cookie(client):
    url = reverse("auth-register")
    payload = {
        "email": "guardian@test.com",
        "password": "StrongPass1!",
        "display_name": "Test Guardian",
    }
    response = client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert _COOKIE_NAME in response.cookies
    cookie = response.cookies[_COOKIE_NAME]
    assert cookie["httponly"]
    assert cookie["path"] == _COOKIE_PATH
    assert cookie["samesite"].lower() == "lax"


# ---------------------------------------------------------------------------
# Login (cookie auth)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_login_returns_access_token(client):
    user = GuardianFactory()
    url = reverse("auth-login")
    response = client.post(url, {"email": user.email, "password": "testpass123"}, format="json")
    assert response.status_code == status.HTTP_200_OK
    assert "access" in response.json()


@pytest.mark.django_db
def test_login_sets_refresh_cookie(client):
    user = GuardianFactory()
    url = reverse("auth-login")
    response = client.post(url, {"email": user.email, "password": "testpass123"}, format="json")
    assert response.status_code == status.HTTP_200_OK
    assert "refresh" not in response.json()  # must NOT be in body
    assert _COOKIE_NAME in response.cookies
    cookie = response.cookies[_COOKIE_NAME]
    assert cookie["httponly"]
    assert cookie["path"] == _COOKIE_PATH
    assert cookie["samesite"].lower() == "lax"


# ---------------------------------------------------------------------------
# Token refresh (cookie auth)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_refresh_uses_cookie_not_body(client):
    user = GuardianFactory()
    login_resp = client.post(
        reverse("auth-login"),
        {"email": user.email, "password": "testpass123"},
        format="json",
    )
    assert _COOKIE_NAME in login_resp.cookies

    client.cookies[_COOKIE_NAME] = login_resp.cookies[_COOKIE_NAME].value
    refresh_resp = client.post(reverse("auth-refresh"), {}, format="json")
    assert refresh_resp.status_code == status.HTTP_200_OK
    assert "access" in refresh_resp.json()
    assert _COOKIE_NAME in refresh_resp.cookies  # rotated cookie


@pytest.mark.django_db
def test_refresh_without_cookie_returns_401(client):
    response = client.post(reverse("auth-refresh"), {}, format="json")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# Logout (blacklist)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_logout_clears_cookie(client):
    user = GuardianFactory()
    login_resp = client.post(
        reverse("auth-login"),
        {"email": user.email, "password": "testpass123"},
        format="json",
    )
    client.cookies[_COOKIE_NAME] = login_resp.cookies[_COOKIE_NAME].value
    client.force_authenticate(user=user)
    logout_resp = client.post(reverse("auth-logout"))
    assert logout_resp.status_code == status.HTTP_204_NO_CONTENT
    # Cookie must be deleted (max-age=0 or expires in the past)
    if _COOKIE_NAME in logout_resp.cookies:
        assert int(logout_resp.cookies[_COOKIE_NAME].get("max-age", 1)) == 0


# ---------------------------------------------------------------------------
# Me endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_me_requires_auth(client):
    url = reverse("auth-me")
    response = client.get(url)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_me_returns_stats(client):
    user = GuardianFactory()
    client.force_authenticate(user=user)
    url = reverse("auth-me")
    response = client.get(url)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == user.email
    assert "stats" in data
    assert "total_xp" in data["stats"]
    assert "streak_days" in data["stats"]
    assert "levels_completed" in data["stats"]
    assert "current_level" in data["stats"]


# Student registration tests moved to test_student_register.py
# (self-serve join-at-signup replaced the guardian-creates-student flow — W1-T05).


@pytest.mark.django_db
def test_client_ip_extraction_prefers_x_forwarded_for(client):
    from apps.users.views import _client_ip
    from unittest.mock import MagicMock

    request = MagicMock()
    request.META = {"HTTP_X_FORWARDED_FOR": "1.2.3.4, 10.0.0.1", "REMOTE_ADDR": "127.0.0.1"}
    assert _client_ip(request) == "1.2.3.4"

    request.META = {"HTTP_X_FORWARDED_FOR": "", "REMOTE_ADDR": "127.0.0.1"}
    assert _client_ip(request) == "127.0.0.1"
