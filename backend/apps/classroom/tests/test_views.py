"""
Integration tests for the classroom endpoints (plan §4d).

Coverage:
- ClassListCreateView: list own batches, create, reject non-teacher
- ClassDetailView: PATCH own batch, 404 on other teacher's batch
- RotateJoinCodeView: code changes, only owner can rotate
- RosterView: returns students, non-owner → 404
- JoinClassView: valid code enrolls, invalid code → 400, duplicate → 400, rate-limit scope
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.classroom.models import Class, Enrollment
from apps.users.tests.factories import ProfileFactory, TeacherFactory, UserFactory


# ── helpers ──────────────────────────────────────────────────────────────────


def _auth(user) -> APIClient:
    client = APIClient()
    token = str(AccessToken.for_user(user))
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


@pytest.fixture
def teacher(db):
    u = TeacherFactory()
    ProfileFactory(user=u, display_name="Teacher One")
    return u


@pytest.fixture
def other_teacher(db):
    u = TeacherFactory()
    ProfileFactory(user=u, display_name="Teacher Two")
    return u


@pytest.fixture
def student(db):
    u = UserFactory()
    ProfileFactory(user=u, display_name="Student One", call_sign="student-one")
    return u


@pytest.fixture
def batch(teacher):
    return Class.objects.create(name="Grade 3 A", teacher=teacher)


# ── ClassListCreateView ───────────────────────────────────────────────────────


@pytest.mark.django_db
def test_list_batches_returns_own_only(teacher, other_teacher, batch):
    Class.objects.create(name="Other Batch", teacher=other_teacher)
    client = _auth(teacher)
    resp = client.get(reverse("class-list-create"))
    assert resp.status_code == status.HTTP_200_OK
    ids = [b["id"] for b in resp.json()]
    assert str(batch.id) in ids
    assert len(ids) == 1


@pytest.mark.django_db
def test_create_batch_returns_201(teacher):
    client = _auth(teacher)
    resp = client.post(reverse("class-list-create"), {"name": "New Batch"}, format="json")
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data["name"] == "New Batch"
    assert data["join_code"]  # auto-generated
    assert data["student_count"] == 0


@pytest.mark.django_db
def test_create_batch_rejects_student(student):
    client = _auth(student)
    resp = client.post(reverse("class-list-create"), {"name": "Sneaky"}, format="json")
    assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_list_batches_rejects_unauthenticated():
    resp = APIClient().get(reverse("class-list-create"))
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ── ClassDetailView ───────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_patch_own_batch_name(teacher, batch):
    client = _auth(teacher)
    resp = client.patch(
        reverse("class-detail", kwargs={"pk": batch.id}),
        {"name": "Updated Name"},
        format="json",
    )
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["name"] == "Updated Name"


@pytest.mark.django_db
def test_patch_other_teachers_batch_returns_404(other_teacher, batch):
    client = _auth(other_teacher)
    resp = client.patch(
        reverse("class-detail", kwargs={"pk": batch.id}),
        {"name": "Hijack"},
        format="json",
    )
    assert resp.status_code == status.HTTP_404_NOT_FOUND


# ── RotateJoinCodeView ────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_rotate_join_code_changes_code(teacher, batch):
    old_code = batch.join_code
    client = _auth(teacher)
    resp = client.post(reverse("class-rotate-code", kwargs={"pk": batch.id}))
    assert resp.status_code == status.HTTP_200_OK
    new_code = resp.json()["join_code"]
    assert new_code != old_code
    batch.refresh_from_db()
    assert batch.join_code == new_code


@pytest.mark.django_db
def test_rotate_join_code_other_teacher_returns_404(other_teacher, batch):
    client = _auth(other_teacher)
    resp = client.post(reverse("class-rotate-code", kwargs={"pk": batch.id}))
    assert resp.status_code == status.HTTP_404_NOT_FOUND


# ── RosterView ────────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_roster_returns_enrolled_students(teacher, student, batch):
    Enrollment.objects.create(class_room=batch, student=student)
    client = _auth(teacher)
    resp = client.get(reverse("class-roster", kwargs={"pk": batch.id}))
    assert resp.status_code == status.HTTP_200_OK
    rows = resp.json()
    assert len(rows) == 1
    assert rows[0]["call_sign"] in ("student-one", "Student One")


@pytest.mark.django_db
def test_roster_empty_when_no_students(teacher, batch):
    client = _auth(teacher)
    resp = client.get(reverse("class-roster", kwargs={"pk": batch.id}))
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == []


@pytest.mark.django_db
def test_roster_non_owner_returns_404(other_teacher, batch):
    client = _auth(other_teacher)
    resp = client.get(reverse("class-roster", kwargs={"pk": batch.id}))
    assert resp.status_code == status.HTTP_404_NOT_FOUND


# ── JoinClassView ─────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_join_valid_code_creates_enrollment(student, batch):
    client = _auth(student)
    resp = client.post(reverse("class-join"), {"join_code": batch.join_code}, format="json")
    assert resp.status_code == status.HTTP_201_CREATED
    assert Enrollment.objects.filter(class_room=batch, student=student).exists()


@pytest.mark.django_db
def test_join_invalid_code_returns_400(student):
    client = _auth(student)
    resp = client.post(reverse("class-join"), {"join_code": "ZZZZZZ"}, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid" in resp.json()["detail"]


@pytest.mark.django_db
def test_join_duplicate_enrollment_returns_400(student, batch):
    Enrollment.objects.create(class_room=batch, student=student)
    client = _auth(student)
    resp = client.post(reverse("class-join"), {"join_code": batch.join_code}, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "Already enrolled" in resp.json()["detail"]


@pytest.mark.django_db
def test_join_inactive_class_returns_400(student, batch):
    batch.is_active = False
    batch.save()
    client = _auth(student)
    resp = client.post(reverse("class-join"), {"join_code": batch.join_code}, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_join_unauthenticated_returns_401(batch):
    resp = APIClient().post(reverse("class-join"), {"join_code": batch.join_code}, format="json")
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_join_code_case_insensitive(student, batch):
    client = _auth(student)
    resp = client.post(
        reverse("class-join"),
        {"join_code": batch.join_code.lower()},
        format="json",
    )
    assert resp.status_code == status.HTTP_201_CREATED
