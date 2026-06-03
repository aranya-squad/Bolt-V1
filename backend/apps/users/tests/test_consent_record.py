import pytest
from django.utils import timezone

from apps.users.models import ConsentRecord


def _make_consent(**kwargs):
    defaults = dict(
        guardian_email="guardian@test.com",
        student_dob="2018-01-01",
        consent_given_at=timezone.now(),
        consent_method="implicit_form_submission",
        ip_address="127.0.0.1",
        user_agent="test",
        jurisdiction="IN",
    )
    defaults.update(kwargs)
    return ConsentRecord.objects.create(**defaults)


@pytest.mark.django_db
def test_consent_record_create_succeeds():
    record = _make_consent()
    assert record.pk is not None


@pytest.mark.django_db
def test_consent_record_save_after_initial_create_raises_value_error():
    record = _make_consent()
    with pytest.raises(ValueError, match="immutable"):
        record.save()


@pytest.mark.django_db
def test_consent_record_delete_raises_value_error():
    record = _make_consent()
    with pytest.raises(ValueError, match="cannot be deleted"):
        record.delete()
