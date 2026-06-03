import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.users.tests.factories import GuardianFactory
from apps.exercises.tests.factories import (
    ArenaSessionFactory,
    ExerciseTemplateFactory,
    LevelFactory,
    LessonFactory,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def user():
    return GuardianFactory()


@pytest.fixture
def auth_client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def level1():
    return LevelFactory(order=1)


@pytest.fixture
def level2(level1):
    return LevelFactory(order=2)


@pytest.fixture
def template1(level1):
    lesson = LessonFactory(level=level1)
    return ExerciseTemplateFactory(lesson=lesson)


@pytest.fixture
def session1(user, template1):
    return ArenaSessionFactory(user=user, template=template1)


# ---------------------------------------------------------------------------
# StartPracticeView
# ---------------------------------------------------------------------------

_PRACTICE_PAYLOAD = {
    "mode": "TIME_ATTACK",
    "operation": "ADD",
    "digits": 2,
    "rows": 2,
    "question_count": 5,
    "time_limit_sec": 120,
}


@pytest.mark.django_db
def test_start_practice_time_attack(auth_client):
    url = reverse("practice-start")
    response = auth_client.post(url, _PRACTICE_PAYLOAD, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert "session_id" in data
    assert data["kind"] == "TIME_ATTACK"
    assert data["time_limit_sec"] == 120
    assert len(data["questions"]) == 5
    assert all("answer" not in q for q in data["questions"])


@pytest.mark.django_db
def test_start_practice_zen_zero_timer(auth_client):
    url = reverse("practice-start")
    payload = {**_PRACTICE_PAYLOAD, "mode": "ZEN", "time_limit_sec": 0}
    response = auth_client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["time_limit_sec"] == 0


@pytest.mark.django_db
def test_start_practice_invalid_mode(auth_client):
    url = reverse("practice-start")
    payload = {**_PRACTICE_PAYLOAD, "mode": "INVALID"}
    response = auth_client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "mode" in response.json()


@pytest.mark.django_db
def test_start_practice_missing_fields(auth_client):
    url = reverse("practice-start")
    response = auth_client.post(url, {}, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert len(response.json()) > 1


@pytest.mark.django_db
def test_start_practice_invalid_digits(auth_client):
    url = reverse("practice-start")
    payload = {**_PRACTICE_PAYLOAD, "digits": 10}
    response = auth_client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "digits" in response.json()


@pytest.mark.django_db
def test_start_practice_requires_auth():
    url = reverse("practice-start")
    response = APIClient().post(url, _PRACTICE_PAYLOAD, format="json")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# StartClassworkView
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_start_classwork_locked_level(auth_client, level1, level2):
    url = reverse("classwork-start", kwargs={"level_id": level2.id})
    response = auth_client.post(url, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_start_classwork_no_template(auth_client, level1):
    url = reverse("classwork-start", kwargs={"level_id": level1.id})
    response = auth_client.post(url, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_start_classwork_success(auth_client, level1, template1):
    url = reverse("classwork-start", kwargs={"level_id": level1.id})
    response = auth_client.post(url, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert "session_id" in data
    assert len(data["questions"]) == 3
    assert all("answer" not in q for q in data["questions"])


@pytest.mark.django_db
def test_start_classwork_idempotent(auth_client, level1, template1):
    url = reverse("classwork-start", kwargs={"level_id": level1.id})
    r1 = auth_client.post(url, format="json")
    r2 = auth_client.post(url, format="json")
    assert r1.json()["session_id"] == r2.json()["session_id"]


# ---------------------------------------------------------------------------
# SubmitAttemptView
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_submit_attempt_correct(auth_client, session1):
    url = reverse("session-attempt", kwargs={"session_id": session1.id})
    response = auth_client.post(
        url,
        {"question_index": 0, "answer": 2, "elapsed_ms": 500},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["is_correct"] is True


@pytest.mark.django_db
def test_submit_attempt_wrong(auth_client, session1):
    url = reverse("session-attempt", kwargs={"session_id": session1.id})
    response = auth_client.post(
        url,
        {"question_index": 0, "answer": 99, "elapsed_ms": 500},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["is_correct"] is False


@pytest.mark.django_db
def test_submit_attempt_idempotent(auth_client, session1):
    url = reverse("session-attempt", kwargs={"session_id": session1.id})
    payload = {"question_index": 0, "answer": 2, "elapsed_ms": 500}
    r1 = auth_client.post(url, payload, format="json")
    r2 = auth_client.post(url, payload, format="json")
    assert r1.status_code == status.HTTP_200_OK
    assert r2.status_code == status.HTTP_200_OK
    assert r2.json()["is_correct"] == r1.json()["is_correct"]


# ---------------------------------------------------------------------------
# FinalizeSessionView
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_finalize_session(auth_client, session1):
    # Submit 1 correct attempt; 2 unanswered
    auth_client.post(
        reverse("session-attempt", kwargs={"session_id": session1.id}),
        {"question_index": 0, "answer": 2, "elapsed_ms": 500},
        format="json",
    )
    url = reverse("session-submit", kwargs={"session_id": session1.id})
    response = auth_client.post(url, format="json")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["score_total"] == 3  # len(questions_json), not len(attempts)
    assert data["score_correct"] == 1
    assert data["xp_earned"] >= 10


@pytest.mark.django_db
def test_finalize_session_idempotent(auth_client, session1):
    url = reverse("session-submit", kwargs={"session_id": session1.id})
    r1 = auth_client.post(url, format="json")
    r2 = auth_client.post(url, format="json")
    assert r1.status_code == status.HTTP_200_OK
    assert r2.status_code == status.HTTP_200_OK
    assert r1.json()["score_total"] == r2.json()["score_total"]


# ---------------------------------------------------------------------------
# SessionReportView
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_session_report_after_finalize(auth_client, session1):
    auth_client.post(
        reverse("session-submit", kwargs={"session_id": session1.id}),
        format="json",
    )
    url = reverse("session-report", kwargs={"session_id": session1.id})
    response = auth_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "progress" in data
    assert "attempts" in data
    assert isinstance(data["attempts"], list)


@pytest.mark.django_db
def test_session_report_before_finalize(auth_client, session1):
    url = reverse("session-report", kwargs={"session_id": session1.id})
    response = auth_client.get(url)
    assert response.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# SessionDetailView
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_session_detail_no_answers(auth_client, session1):
    url = reverse("session-detail", kwargs={"session_id": session1.id})
    response = auth_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    for q in response.json()["questions"]:
        assert "answer" not in q
        assert "text" in q
        assert "index" in q
        assert "operation" in q


# ---------------------------------------------------------------------------
# Fix 2E/2F — elapsed_ms guard + MIN_ANSWER_MS warning
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_submit_attempt_handles_non_integer_elapsed_ms(auth_client, session1):
    url = reverse("session-attempt", kwargs={"session_id": session1.id})
    response = auth_client.post(
        url,
        {"question_index": 0, "answer": 2, "elapsed_ms": "not_a_number"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK  # must not 500


@pytest.mark.django_db
def test_submit_attempt_handles_negative_elapsed_ms(auth_client, session1):
    url = reverse("session-attempt", kwargs={"session_id": session1.id})
    response = auth_client.post(
        url,
        {"question_index": 0, "answer": 2, "elapsed_ms": -500},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK  # must not 500


@pytest.mark.django_db
def test_min_answer_ms_logs_warning_but_does_not_block(auth_client, session1):
    import logging
    from unittest.mock import patch

    url = reverse("session-attempt", kwargs={"session_id": session1.id})
    with patch.object(logging.getLogger("apps.exercises.anticheat"), "warning") as mock_warn:
        response = auth_client.post(
            url,
            {"question_index": 0, "answer": 2, "elapsed_ms": 10},
            format="json",
        )
    assert response.status_code == status.HTTP_200_OK  # must not block
    mock_warn.assert_called_once()
    assert "min_answer_ms_violation" in mock_warn.call_args[0][0]


# ---------------------------------------------------------------------------
# Fix 2G — time_limit_sec upper bound
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_start_practice_rejects_time_limit_above_3600(auth_client):
    url = reverse("practice-start")
    payload = {**_PRACTICE_PAYLOAD, "time_limit_sec": 9999}
    response = auth_client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "time_limit_sec" in response.json()


# ---------------------------------------------------------------------------
# Fix 2H — schema endpoint requires admin
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_schema_endpoint_requires_admin(auth_client):
    response = auth_client.get("/api/v1/schema/")
    assert response.status_code in (401, 403)


@pytest.mark.django_db
def test_schema_endpoint_accessible_to_admin(client):
    from apps.users.tests.factories import UserFactory
    admin_user = UserFactory(role="ADMIN", is_staff=True)
    c = APIClient()
    c.force_authenticate(user=admin_user)
    response = c.get("/api/v1/schema/")
    assert response.status_code == 200
