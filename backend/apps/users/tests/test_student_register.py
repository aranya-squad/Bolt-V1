"""W1-T05 — self-serve student signup with join-at-signup (plan §1d / Q1 / R1)."""
from datetime import date

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.classroom.models import Class, Enrollment, EnrollmentConsent
from apps.users.models import User

_TODAY = date.today()


def _dob(years_ago: int) -> str:
    return _TODAY.replace(year=_TODAY.year - years_ago).isoformat()


def _teacher_with_class():
    teacher = User.objects.create_user(
        email="coach@example.com", password="teacherpass10", role="TEACHER"
    )
    klass = Class.objects.create(name="Batch Alpha", teacher=teacher)
    return teacher, klass


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
def test_student_self_register_join_at_signup(client):
    teacher, klass = _teacher_with_class()
    resp = client.post(
        reverse("auth-register-student"),
        {"call_sign": "Nova", "pin": "1234", "date_of_birth": _dob(8), "join_code": klass.join_code, "jurisdiction": "IN"},
        format="json",
    )
    assert resp.status_code == 201
    body = resp.json()
    assert "access" in body and "student_id" in body

    student = User.objects.select_related("profile").get(id=body["student_id"])
    assert student.role == "STUDENT"
    assert student.profile.call_sign == "Nova"

    enrollment = Enrollment.objects.get(student=student, class_room=klass)
    consent = EnrollmentConsent.objects.get(enrollment=enrollment)
    assert consent.attested_by == teacher
    assert consent.method == "teacher_attested"
    assert consent.under_13 is True  # 8 years old
    assert consent.jurisdiction == "IN"


@pytest.mark.django_db
def test_student_register_requires_join_code(client):
    _teacher_with_class()
    resp = client.post(
        reverse("auth-register-student"),
        {"call_sign": "NoCode", "pin": "1234", "date_of_birth": _dob(8)},
        format="json",
    )
    assert resp.status_code == 400
    assert not User.objects.filter(profile__call_sign="NoCode").exists()


@pytest.mark.django_db
def test_student_register_invalid_join_code(client):
    resp = client.post(
        reverse("auth-register-student"),
        {"call_sign": "Ghost", "pin": "1234", "date_of_birth": _dob(8), "join_code": "ZZZZZZ"},
        format="json",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_student_register_inactive_class_rejected(client):
    teacher, klass = _teacher_with_class()
    klass.is_active = False
    klass.save(update_fields=["is_active"])
    resp = client.post(
        reverse("auth-register-student"),
        {"call_sign": "Dim", "pin": "1234", "date_of_birth": _dob(8), "join_code": klass.join_code},
        format="json",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_student_register_over_18_rejected(client):
    teacher, klass = _teacher_with_class()
    resp = client.post(
        reverse("auth-register-student"),
        {"call_sign": "OldOne", "pin": "1234", "date_of_birth": _dob(25), "join_code": klass.join_code},
        format="json",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_student_register_future_dob_rejected(client):
    teacher, klass = _teacher_with_class()
    resp = client.post(
        reverse("auth-register-student"),
        {"call_sign": "FutureKid", "pin": "1234", "date_of_birth": "2099-01-01", "join_code": klass.join_code},
        format="json",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_under_13_flag_false_for_teen(client):
    teacher, klass = _teacher_with_class()
    resp = client.post(
        reverse("auth-register-student"),
        {"call_sign": "Teen", "pin": "1234", "date_of_birth": _dob(15), "join_code": klass.join_code},
        format="json",
    )
    assert resp.status_code == 201
    consent = EnrollmentConsent.objects.get(enrollment__student__profile__call_sign="Teen")
    assert consent.under_13 is False
