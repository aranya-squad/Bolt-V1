import pytest
from unittest.mock import MagicMock

from apps.users.models import Guardianship
from apps.users.permissions import IsGuardian, IsGuardianOfStudent, IsStudent, IsTeacher
from apps.users.tests.factories import GuardianFactory, UserFactory


def _request(user):
    req = MagicMock()
    req.user = user
    return req


# ---------------------------------------------------------------------------
# IsStudent / IsGuardian / IsTeacher
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_is_student_true_for_student_role():
    user = UserFactory(role="STUDENT")
    assert IsStudent().has_permission(_request(user), None) is True


@pytest.mark.django_db
def test_is_student_false_for_guardian():
    user = GuardianFactory()
    assert IsStudent().has_permission(_request(user), None) is False


@pytest.mark.django_db
def test_is_guardian_true_for_guardian_role():
    user = GuardianFactory()
    assert IsGuardian().has_permission(_request(user), None) is True


@pytest.mark.django_db
def test_is_guardian_false_for_student():
    user = UserFactory(role="STUDENT")
    assert IsGuardian().has_permission(_request(user), None) is False


@pytest.mark.django_db
def test_is_teacher_true_for_teacher_role():
    user = UserFactory(role="TEACHER")
    assert IsTeacher().has_permission(_request(user), None) is True


# ---------------------------------------------------------------------------
# IsGuardianOfStudent
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_is_guardian_of_student_true_when_guardianship_exists(client):
    from django.utils import timezone
    from apps.users.models import ConsentRecord

    guardian = GuardianFactory()
    student = UserFactory(role="STUDENT", date_of_birth="2016-01-01")
    consent = ConsentRecord.objects.create(
        guardian_email=guardian.email,
        student_dob="2016-01-01",
        consent_given_at=timezone.now(),
        consent_method="implicit_form_submission",
        ip_address="127.0.0.1",
        user_agent="test",
        jurisdiction="IN",
    )
    Guardianship.objects.create(guardian=guardian, student=student, consent_record=consent)

    request = _request(guardian)
    assert IsGuardianOfStudent().has_object_permission(request, None, student) is True


@pytest.mark.django_db
def test_is_guardian_of_student_false_without_guardianship():
    guardian = GuardianFactory()
    student = UserFactory(role="STUDENT")

    request = _request(guardian)
    assert IsGuardianOfStudent().has_object_permission(request, None, student) is False
