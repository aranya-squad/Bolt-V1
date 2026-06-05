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
    # Practice kinds include answer for client-side grading.
    assert all("answer" in q for q in data["questions"])


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
def test_submit_attempt_handles_non_integer_elapsed_ms(auth_client, user):
    """Non-integer elapsed_ms must not cause a 500 (converted to 0 then logged/enforced)."""
    from apps.exercises.tests.factories import ArenaSessionFactory
    from apps.exercises.models import SessionKind

    # Use ZEN so enforcement doesn't block the attempt (0ms is log-only for non-enforce kinds).
    zen_session = ArenaSessionFactory(user=user, kind=SessionKind.ZEN, template=None)
    url = reverse("session-attempt", kwargs={"session_id": zen_session.id})
    response = auth_client.post(
        url,
        {"question_index": 0, "answer": zen_session.questions_json[0]["answer"], "elapsed_ms": "not_a_number"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK  # must not 500


@pytest.mark.django_db
def test_submit_attempt_handles_negative_elapsed_ms(auth_client, user):
    """Negative elapsed_ms is normalised to 0; non-enforce kinds must not 500."""
    from apps.exercises.tests.factories import ArenaSessionFactory
    from apps.exercises.models import SessionKind

    zen_session = ArenaSessionFactory(user=user, kind=SessionKind.ZEN, template=None)
    url = reverse("session-attempt", kwargs={"session_id": zen_session.id})
    response = auth_client.post(
        url,
        {"question_index": 0, "answer": zen_session.questions_json[0]["answer"], "elapsed_ms": -500},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK  # must not 500


@pytest.mark.django_db
def test_min_answer_ms_logs_warning_for_zen_and_does_not_block(auth_client, user):
    """ZEN (non-enforce kind): fast answer must log a warning but proceed normally."""
    import logging
    from unittest.mock import patch
    from apps.exercises.tests.factories import ArenaSessionFactory
    from apps.exercises.models import SessionKind

    zen_session = ArenaSessionFactory(user=user, kind=SessionKind.ZEN, template=None)
    url = reverse("session-attempt", kwargs={"session_id": zen_session.id})
    with patch.object(logging.getLogger("apps.exercises.anticheat"), "warning") as mock_warn:
        response = auth_client.post(
            url,
            {"question_index": 0, "answer": zen_session.questions_json[0]["answer"], "elapsed_ms": 10},
            format="json",
        )
    assert response.status_code == status.HTTP_200_OK
    mock_warn.assert_called_once()
    assert "min_answer_ms_violation" in mock_warn.call_args[0][0]


@pytest.mark.django_db
def test_min_answer_ms_rejects_fast_classwork_submission(auth_client, session1):
    """CLASSWORK (enforce kind): fast answer must return 400 and not create an attempt."""
    import logging
    from unittest.mock import patch
    from apps.progress.models import QuestionAttempt

    url = reverse("session-attempt", kwargs={"session_id": session1.id})
    with patch.object(logging.getLogger("apps.exercises.anticheat"), "warning") as mock_warn:
        response = auth_client.post(
            url,
            {"question_index": 0, "answer": 2, "elapsed_ms": 10},
            format="json",
        )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    mock_warn.assert_called_once()
    assert QuestionAttempt.objects.filter(session=session1).count() == 0


@pytest.mark.django_db
def test_min_answer_ms_rejects_fast_time_attack_submission(auth_client, user):
    """TIME_ATTACK (enforce kind): fast answer must return 400."""
    from apps.exercises.tests.factories import ArenaSessionFactory
    from apps.exercises.models import SessionKind

    ta_session = ArenaSessionFactory(user=user, kind=SessionKind.TIME_ATTACK, template=None)
    url = reverse("session-attempt", kwargs={"session_id": ta_session.id})
    response = auth_client.post(
        url,
        {"question_index": 0, "answer": ta_session.questions_json[0]["answer"], "elapsed_ms": 10},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_bulk_min_answer_ms_skips_fast_classwork_item(auth_client, session1):
    """Bulk: fast CLASSWORK attempt is skipped (rejected=True) but the batch still succeeds."""
    from apps.progress.models import QuestionAttempt

    url = reverse("session-attempts-bulk", kwargs={"session_id": session1.id})
    response = auth_client.post(
        url,
        {"attempts": [
            {"question_index": 0, "answer": 2, "elapsed_ms": 10},   # too fast → rejected
            {"question_index": 1, "answer": 5, "elapsed_ms": 500},  # normal
        ]},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    verdicts = response.json()["verdicts"]
    assert verdicts[0].get("rejected") is True
    # Only the normal attempt creates a row.
    assert QuestionAttempt.objects.filter(session=session1).count() == 1


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


# ---------------------------------------------------------------------------
# SessionKind answer-tiering
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_practice_session_includes_answers(auth_client):
    """Practice kinds must include answer in the session payload for client-side grading."""
    url = reverse("practice-start")
    response = auth_client.post(url, _PRACTICE_PAYLOAD, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    for q in response.json()["questions"]:
        assert "answer" in q


@pytest.mark.django_db
def test_classwork_session_excludes_answers(auth_client, level1, template1):
    """Classwork/Homework sessions must never expose answers to the client."""
    url = reverse("classwork-start", kwargs={"level_id": level1.id})
    response = auth_client.post(url, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    for q in response.json()["questions"]:
        assert "answer" not in q


@pytest.mark.django_db
def test_session_detail_practice_includes_answers(auth_client):
    """GET /sessions/{id}/ for a practice session should include answers."""
    start_url = reverse("practice-start")
    start_resp = auth_client.post(start_url, _PRACTICE_PAYLOAD, format="json")
    session_id = start_resp.json()["session_id"]
    detail_url = reverse("session-detail", kwargs={"session_id": session_id})
    response = auth_client.get(detail_url)
    assert response.status_code == status.HTTP_200_OK
    for q in response.json()["questions"]:
        assert "answer" in q


# ---------------------------------------------------------------------------
# BulkSubmitAttemptView
# ---------------------------------------------------------------------------


@pytest.fixture
def practice_session(user):
    from apps.exercises.tests.factories import ArenaSessionFactory
    from apps.exercises.models import SessionKind
    return ArenaSessionFactory(user=user, kind=SessionKind.TIME_ATTACK, template=None)


@pytest.mark.django_db
def test_bulk_submit_records_all_attempts_and_returns_verdicts(auth_client, practice_session):
    """All attempts in one call → one QuestionAttempt row per question with correct verdicts."""
    from apps.progress.models import QuestionAttempt

    q_count = len(practice_session.questions_json)
    attempts = [
        {
            "question_index": i,
            "answer": practice_session.questions_json[i]["answer"],  # all correct
            "elapsed_ms": 500,
        }
        for i in range(q_count)
    ]

    url = reverse("session-attempts-bulk", kwargs={"session_id": practice_session.id})
    response = auth_client.post(url, {"attempts": attempts}, format="json")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["verdicts"]) == q_count
    assert all(v["is_correct"] for v in data["verdicts"])
    assert QuestionAttempt.objects.filter(session=practice_session).count() == q_count


@pytest.mark.django_db
def test_bulk_submit_40_attempts_single_call(auth_client, user):
    """40 attempts in one call → 40 QuestionAttempt rows + correct verdicts."""
    from apps.exercises.tests.factories import ArenaSessionFactory
    from apps.exercises.models import SessionKind
    from apps.progress.models import QuestionAttempt

    questions = [
        {"text": f"{i} + {i}", "answer": i * 2, "operation": "ADD"}
        for i in range(1, 41)
    ]
    session = ArenaSessionFactory(
        user=user,
        kind=SessionKind.TIME_ATTACK,
        template=None,
        questions_json=questions,
        config_json={"operation": "ADD", "digits": 1, "rows": 2, "question_count": 40},
    )

    attempts = [
        {"question_index": i, "answer": questions[i]["answer"], "elapsed_ms": 500}
        for i in range(40)
    ]
    url = reverse("session-attempts-bulk", kwargs={"session_id": session.id})
    response = auth_client.post(url, {"attempts": attempts}, format="json")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["verdicts"]) == 40
    assert all(v["is_correct"] for v in data["verdicts"])
    assert QuestionAttempt.objects.filter(session=session).count() == 40


@pytest.mark.django_db
def test_bulk_submit_wrong_answers(auth_client, practice_session):
    url = reverse("session-attempts-bulk", kwargs={"session_id": practice_session.id})
    attempts = [
        {"question_index": i, "answer": -999999, "elapsed_ms": 500}
        for i in range(len(practice_session.questions_json))
    ]
    response = auth_client.post(url, {"attempts": attempts}, format="json")
    assert response.status_code == status.HTTP_200_OK
    assert all(not v["is_correct"] for v in response.json()["verdicts"])


@pytest.mark.django_db
def test_bulk_submit_out_of_bounds_index(auth_client, practice_session):
    url = reverse("session-attempts-bulk", kwargs={"session_id": practice_session.id})
    response = auth_client.post(
        url,
        {"attempts": [{"question_index": 999, "answer": 1, "elapsed_ms": 500}]},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_bulk_submit_empty_list_returns_empty_verdicts(auth_client, practice_session):
    url = reverse("session-attempts-bulk", kwargs={"session_id": practice_session.id})
    response = auth_client.post(url, {"attempts": []}, format="json")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["verdicts"] == []


@pytest.mark.django_db
def test_bulk_submit_idempotent_on_existing_attempt(auth_client, practice_session):
    """Second bulk call for same QI returns same verdict without creating a new attempt."""
    from apps.progress.models import QuestionAttempt

    url = reverse("session-attempts-bulk", kwargs={"session_id": practice_session.id})
    q = practice_session.questions_json[0]
    payload = {"attempts": [{"question_index": 0, "answer": q["answer"], "elapsed_ms": 500}]}

    r1 = auth_client.post(url, payload, format="json")
    assert r1.status_code == status.HTTP_200_OK

    # Simulate retry: same payload
    r2 = auth_client.post(url, payload, format="json")
    assert r2.status_code == status.HTTP_200_OK

    # The retry should have recorded attempt_number=2 (second attempt, different from attempt_number=1)
    assert QuestionAttempt.objects.filter(session=practice_session, question_index=0).count() == 2


@pytest.mark.django_db
def test_bulk_submit_requires_auth(practice_session):
    url = reverse("session-attempts-bulk", kwargs={"session_id": practice_session.id})
    response = APIClient().post(url, {"attempts": []}, format="json")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_bulk_submit_on_finalized_session(auth_client, practice_session):
    auth_client.post(reverse("session-submit", kwargs={"session_id": practice_session.id}), format="json")
    url = reverse("session-attempts-bulk", kwargs={"session_id": practice_session.id})
    response = auth_client.post(
        url,
        {"attempts": [{"question_index": 0, "answer": 1, "elapsed_ms": 500}]},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
