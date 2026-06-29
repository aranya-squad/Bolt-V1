"""W1-T01 — call_sign integrity bundle (plan §1a, pass-3 #1/#2)."""
from datetime import date

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.users.models import Profile, User
from apps.users.serializers import StudentRegisterSerializer


def _student(call_sign: str, pin: str = "1234") -> User:
    user = User.objects.create_user(
        email=f"{call_sign.lower()}-x@students.boltabacus.internal",
        password=pin,
        role="STUDENT",
        date_of_birth=date(2015, 1, 1),
    )
    Profile.objects.create(user=user, display_name=call_sign, call_sign=call_sign)
    return user


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
def test_callsign_login_unaffected_by_cross_role_name(client):
    """pass-3 #1: a teacher sharing a student's name must not 500 student login."""
    _student("Nova", pin="1234")
    teacher = User.objects.create_user(
        email="coach@example.com", password="teacherpass10", role="TEACHER"
    )
    Profile.objects.create(user=teacher, display_name="Nova")  # same name, no call_sign

    resp = client.post(
        reverse("auth-callsign-login"), {"call_sign": "nova", "pin": "1234"}, format="json"
    )
    assert resp.status_code == 200
    assert "access" in resp.json()


@pytest.mark.django_db
def test_duplicate_call_sign_rejected_case_insensitively():
    _student("Nova")
    ser = StudentRegisterSerializer(
        data={"call_sign": "nova", "pin": "1234", "date_of_birth": "2015-01-01"}
    )
    assert not ser.is_valid()
    assert "call_sign" in ser.errors


@pytest.mark.django_db
def test_call_sign_rename_collision_returns_409(client):
    """pass-3 #2: ProfileUpdateView is a second write path; it must guard uniqueness."""
    _student("Nova")
    comet = _student("Comet")
    client.force_authenticate(user=comet)

    resp = client.patch(reverse("auth-me-profile"), {"call_sign": "nova"}, format="json")
    assert resp.status_code == 409


@pytest.mark.django_db
def test_call_sign_rename_success(client):
    comet = _student("Comet")
    client.force_authenticate(user=comet)

    resp = client.patch(reverse("auth-me-profile"), {"call_sign": "Comet2"}, format="json")
    assert resp.status_code == 200
    comet.profile.refresh_from_db()
    assert comet.profile.call_sign == "Comet2"


@pytest.mark.django_db
def test_non_student_cannot_set_call_sign(client):
    teacher = User.objects.create_user(
        email="t2@example.com", password="teacherpass10", role="TEACHER"
    )
    Profile.objects.create(user=teacher, display_name="Coach")
    client.force_authenticate(user=teacher)

    resp = client.patch(reverse("auth-me-profile"), {"call_sign": "Coach"}, format="json")
    assert resp.status_code == 400
