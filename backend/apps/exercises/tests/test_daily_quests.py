"""Daily mission eligibility/calendar, durable effort and independent-connection races."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from threading import Barrier
from time import monotonic
from unittest.mock import patch

import pytest
from django.db import close_old_connections, connection, transaction
from django.db.models.deletion import RestrictedError
from django.urls import reverse
from rest_framework.test import APIClient

from apps.exercises.attempt_contract import ContractError, is_integer
from apps.exercises.constants import MAX_SESSION_SECONDS, SKIP_ANSWER_SENTINEL
from apps.exercises.models import ArenaSession, DailyQuest, SessionKind
from apps.exercises.tasks import abandon_stale_sessions
from apps.exercises.tests.factories import (
    ArenaSessionFactory,
    ExerciseTemplateFactory,
    LessonFactory,
    LevelFactory,
)
from apps.progress.models import (
    LessonCompletion,
    LevelCompletion,
    ProgressRecord,
    QuestionAttempt,
    XPEvent,
)
from apps.progress.services import finalize_session, record_attempt
from apps.users.models import User
from apps.users.tests.factories import ProfileFactory, UserFactory
from config.dbrouter import PrimaryReplicaRouter


@pytest.fixture
def student():
    return UserFactory()


@pytest.fixture
def client(student):
    client = APIClient()
    client.force_authenticate(student)
    return client


@pytest.fixture
def template():
    return ExerciseTemplateFactory(lesson=LessonFactory(level=LevelFactory(order=1)))


def today(client):
    response = client.get(reverse("daily-quests-today"))
    assert response.status_code == 200
    assert response["Cache-Control"] == "no-store"
    return response.json()


def start(client, mission, **overrides):
    return client.post(reverse("daily-quests-start", kwargs={"mission_id": mission["id"]}), overrides, format="json")


def attempt(client, session, index, answer, v2=True):
    data = {"question_index": index, "answer": answer, "elapsed_ms": 500}
    if v2:
        data.update(contract_version=2, attempt_number=1)
    return client.post(reverse("session-attempt", kwargs={"session_id": session.pk}), data, format="json")


def finish(client, session, count=5, v2=True):
    data = {"contract_version": 2, "expected_attempts": [
        {"question_index": index, "attempt_number": 1} for index in range(count)
    ]} if v2 else {}
    return client.post(reverse("session-submit", kwargs={"session_id": session.pk}), data, format="json")


def durable_attempts(session, count=5, correct=5):
    for index, question in enumerate(session.questions_json[:count]):
        record_attempt(session, index, 1, question["text"], question["answer"],
                       question["answer"] if index < correct else question["answer"] + 1, 500)


def complete_lesson(user, lesson, kind=SessionKind.CLASSWORK):
    session = ArenaSessionFactory(user=user, template=ExerciseTemplateFactory(lesson=lesson, kind=kind), kind=kind)
    finalize_session(session)


@pytest.mark.django_db
def test_assignment_freezes_content_start_ignores_forged_overrides(client, student, template):
    original = today(client)["mission"]
    assert original["state"] == "available" and original["progress"] == 0
    frozen = DailyQuest.objects.get(pk=original["id"]).config_json
    assert frozen == {**template.config_json, "question_count": 5, "time_limit_sec": 0}
    template.config_json = {"operation": "DIV", "digits": 4, "rows": 8}
    template.save()
    template.lesson.name = "Changed lesson"
    template.lesson.save()
    ProfileFactory(user=student, timezone="Pacific/Honolulu")
    assert today(client)["mission"] == original
    response = start(client, original, date="2000-01-01", user_id="forged", config_json={}, target=99, is_test_mode=False)
    assert response.status_code == 201 and response["Cache-Control"] == "no-store"
    meta = response.json()
    assert meta["daily_quest"]["id"] == original["id"]
    assert meta["daily_quest"]["state"] == "in_progress"
    assert meta["time_limit_sec"] == 0 and meta["is_test_mode"] is True and len(meta["questions"]) == 5
    session = ArenaSession.objects.get(pk=meta["session_id"])
    assert session.template_id is None and session.kind == "ZEN" and session.config_json == frozen
    replay = start(client, original)
    assert replay.status_code == 200 and replay.json()["session_id"] == meta["session_id"]
    assert ArenaSession.objects.filter(user=student).count() == 1


@pytest.mark.django_db
def test_primary_highest_unlocked_earliest_supported_and_final_level(client, student):
    low = LevelFactory(order=2)
    high = LevelFactory(order=9)
    locked = LevelFactory(order=15)
    low_lesson = LessonFactory(level=low, order=3)
    complete_lesson(student, low_lesson)
    first = LessonFactory(level=high, order=2)
    second = LessonFactory(level=high, order=8)
    third = LessonFactory(level=high, order=9)
    # First is unlocked but its malformed config is unavailable; second stays locked.
    ExerciseTemplateFactory(lesson=first, config_json={"operation": "ADD"})
    wanted = ExerciseTemplateFactory(lesson=second)
    ExerciseTemplateFactory(lesson=third)
    ExerciseTemplateFactory(lesson=LessonFactory(level=locked))
    assert today(client)["mission"] is None
    prior = ArenaSessionFactory(user=student, template=None)
    record = finalize_session(prior)
    LessonCompletion.objects.create(user=student, lesson=first, kind="CLASSWORK", best_accuracy_pct=0, best_progress_record=record)
    with patch.object(PrimaryReplicaRouter, "db_for_read", return_value="poisoned"), \
            patch("django.db.router.routers", [PrimaryReplicaRouter()]):
        mission = today(client)["mission"]
        assert mission["level_order"] == 9 and mission["lesson_order"] == 8
        started = start(client, mission)
        assert started.status_code == 201
    assert DailyQuest.objects.get(pk=mission["id"]).source_template_id == wanted.pk
    LevelCompletion.objects.create(user=student, level=high, kind="CLASSWORK", best_progress_record=record)
    LevelCompletion.objects.create(user=student, level=locked, kind="CLASSWORK", best_progress_record=record)
    with patch("apps.exercises.daily_quests.timezone.now", return_value=datetime(2030, 1, 1, tzinfo=UTC)):
        assert today(client)["mission"]["level_order"] == 15


@pytest.mark.parametrize("config", [
    [], {"operation": [], "digits": 1, "rows": 2},
    {}, {"operation": "UNKNOWN", "digits": 1, "rows": 2},
    {"operation": "ADD", "rows": 2}, {"operation": "ADD", "digits": 1},
    {"operation": "ADD", "digits": True, "rows": 2},
    {"operation": "ADD", "digits": "1", "rows": 2},
    {"operation": "SUB", "digits": 5, "rows": 2},
    {"operation": "MUL", "digits": 1, "rows": 1},
    {"operation": "DIV", "digits": 1, "rows": 9},
    {"operation": "MUL", "digits": 1, "rows": 2, "digits_row1": 5},
    {"operation": "DIV", "digits": 1, "rows": 2, "digits_row2": 3},
])
@pytest.mark.django_db
def test_malformed_config_is_unavailable_without_fallback(client, template, config):
    template.config_json = config
    template.save()
    result = today(client)
    assert result["mission"] is None and result["reason"] == "No mission available yet"
    assert DailyQuest.objects.count() == ArenaSession.objects.count() == 0


@pytest.mark.parametrize("operation", ["ADD", "SUB", "MUL", "DIV", "MIXED"])
@pytest.mark.django_db
def test_supported_operations_generate_nonnegative_integer_answers(client, template, operation):
    template.config_json = {"operation": operation, "digits": 4, "rows": 8, "digits_row1": 4, "digits_row2": 2}
    template.save()
    response = start(client, today(client)["mission"])
    assert response.status_code == 201
    questions = ArenaSession.objects.get(pk=response.json()["session_id"]).questions_json
    assert len(questions) == 5 and all(is_integer(q["answer"]) and q["answer"] >= 0 for q in questions)


@pytest.mark.parametrize("zone,instant,hours", [
    ("America/New_York", "2026-03-08T05:00:00+00:00", 23),
    ("America/New_York", "2026-11-01T04:00:00+00:00", 25),
    ("Asia/Kolkata", "2026-10-01T18:29:59+00:00", 1 / 3600),
    ("Not/AZone", "2026-10-01T00:00:00+00:00", 24),
])
@pytest.mark.django_db
def test_pinned_zone_calendar_dst_rollover_and_missing_dates(client, student, template, zone, instant, hours):
    profile = ProfileFactory(user=student, timezone=zone)
    now = datetime.fromisoformat(instant)
    with patch("apps.exercises.daily_quests.timezone.now", return_value=now):
        result = today(client)
        session_id = start(client, result["mission"]).json()["session_id"]
    reset = datetime.fromisoformat(result["reset_at"])
    assert (reset - now).total_seconds() == pytest.approx(hours * 3600)
    assert result["timezone"] == ("UTC" if zone == "Not/AZone" else zone)
    profile.timezone = "Pacific/Honolulu"
    profile.save()
    with patch("apps.exercises.daily_quests.timezone.now", return_value=reset - timedelta(seconds=0.001)):
        assert today(client)["mission"]["id"] == result["mission"]["id"]
    with patch("apps.exercises.daily_quests.timezone.now", return_value=reset + timedelta(days=3)):
        later = today(client)
        assert later["timezone"] == result["timezone"]
        assert later["mission"]["id"] != result["mission"]["id"]
        assert later["previous_unfinished"]["id"] == result["mission"]["id"]
        assert start(client, result["mission"]).json()["session_id"] == session_id
    assert DailyQuest.objects.count() == 2
    old_session = ArenaSession.objects.get(pk=session_id)
    durable_attempts(old_session)
    finalize_session(old_session)
    old_quest = DailyQuest.objects.get(pk=result["mission"]["id"])
    assert old_quest.mission_date.isoformat() == result["mission"]["date"]
    assert XPEvent.objects.filter(source_session=old_session).count() == 1


@pytest.mark.parametrize("v2", [True, False])
@pytest.mark.parametrize("correct", [0, 3, 5])
@pytest.mark.django_db
def test_all_effort_wrong_correct_skip_replay_partial_and_reward(client, student, template, v2, correct):
    mission = today(client)["mission"]
    session = ArenaSession.objects.get(pk=start(client, mission).json()["session_id"])
    for count in (0, 4):
        if count:
            for index in range(4):
                q = session.questions_json[index]
                assert attempt(client, session, index, q["answer"] if index < correct else q["answer"] + 1, v2).status_code == 200
        response = finish(client, session, count, v2)
        assert response.status_code == 409 and response.json()["code"] == "mission_incomplete"
        with pytest.raises(ContractError) as error:
            finalize_session(session)
        assert error.value.detail["code"] == "mission_incomplete"
        assert not ProgressRecord.objects.exists() and not XPEvent.objects.exists()
        assert DailyQuest.objects.get(pk=mission["id"]).completed_at is None
    assert attempt(client, session, 4, SKIP_ANSWER_SENTINEL, v2).status_code == 400
    q = session.questions_json[4]
    accepted = attempt(client, session, 4, q["answer"] if correct > 4 else q["answer"] + 1, v2)
    assert accepted.status_code == 200
    duplicate = attempt(client, session, 4, q["answer"] if correct > 4 else q["answer"] + 1, v2)
    assert duplicate.status_code == (200 if v2 else 400)
    saved = today(client)["mission"]
    assert saved["progress"] == 5 and saved["state"] == "in_progress" and saved["xp_earned"] is None
    response = finish(client, session, v2=v2)
    assert response.status_code == 200 and response.json()["score_correct"] == correct
    assert finish(client, session, v2=v2).json()["id"] == response.json()["id"]
    assert ProgressRecord.objects.count() == XPEvent.objects.count() == 1
    assert QuestionAttempt.objects.count() == 5
    assert not LevelCompletion.objects.filter(user=student).exists()
    assert not LessonCompletion.objects.filter(user=student).exists()
    completed = today(client)["mission"]
    assert completed["state"] == "completed" and completed["completed_at"] is not None
    expected_xp = correct * 10 + (50 if correct == 5 else 0)
    assert completed["xp_earned"] == response.json()["xp_earned"] == expected_xp
    restarted = start(client, mission)
    assert restarted.status_code == 200 and restarted.json()["state"] == "submitted"
    assert restarted.json()["daily_quest"] == completed


@pytest.mark.django_db
def test_missing_content_does_not_pin_timezone(client, student, template):
    profile = ProfileFactory(user=student, timezone="Asia/Kolkata")
    template.delete()
    assert today(client)["mission"] is None
    profile.timezone = "America/New_York"
    profile.save()
    ExerciseTemplateFactory(lesson=template.lesson)
    assert today(client)["timezone"] == "America/New_York"


@pytest.mark.django_db
def test_direct_legacy_skip_rows_do_not_count_and_completion_is_atomic(client, template):
    mission = today(client)["mission"]
    session = ArenaSession.objects.get(pk=start(client, mission).json()["session_id"])
    for index, question in enumerate(session.questions_json):
        record_attempt(session, index, 1, question["text"], question["answer"], SKIP_ANSWER_SENTINEL, 500, is_skip=True)
    assert today(client)["mission"]["progress"] == 0
    with pytest.raises(ContractError):
        finalize_session(session)
    assert not ProgressRecord.objects.exists() and not XPEvent.objects.exists()
    # Service guard also protects old/imported records with null legacy identities.
    for index, question in enumerate(session.questions_json):
        record_attempt(session, index, None, question["text"], question["answer"], question["answer"], 500)
    with patch.object(DailyQuest, "save", side_effect=RuntimeError("synthetic completion write failure")), \
            pytest.raises(RuntimeError):
        finalize_session(session)
    session.refresh_from_db()
    assert session.submitted_at is None
    assert not ProgressRecord.objects.exists() and not XPEvent.objects.exists()
    assert DailyQuest.objects.get(pk=mission["id"]).completed_at is None
    finalize_session(session)
    assert DailyQuest.objects.get(pk=mission["id"]).completed_at == ArenaSession.objects.get(pk=session.pk).submitted_at


@pytest.mark.django_db
def test_missing_profile_utc(client, template):
    assert today(client)["timezone"] == "UTC"


@pytest.mark.parametrize("role", ["GUARDIAN", "TEACHER", "ADMIN", "STUDENT"])
@pytest.mark.django_db
def test_auth_roles_inactive_and_owner_scope(client, student, template, role):
    mission = today(client)["mission"]
    other = UserFactory(role=role, is_active=role != "STUDENT")
    outsider = APIClient()
    outsider.force_authenticate(other)
    for response in (outsider.get(reverse("daily-quests-today")), start(outsider, mission)):
        assert response.status_code == 403 and response["Cache-Control"] == "no-store"
    other.is_active = True
    other.role = "STUDENT"
    other.save()
    assert start(outsider, mission).status_code == 404
    assert start(client, {"id": "00000000-0000-0000-0000-000000000000"}).status_code == 404
    anonymous = APIClient()
    assert anonymous.get(reverse("daily-quests-today")).status_code == 401
    assert start(anonymous, mission).status_code == 401


@pytest.mark.django_db
def test_stale_scan_and_guard_exclude_missions(client, template):
    mission = today(client)["mission"]
    session = ArenaSession.objects.get(pk=start(client, mission).json()["session_id"])
    ordinary = ArenaSessionFactory(kind=SessionKind.ZEN, template=None, config_json={"time_limit_sec": 0})
    stale = datetime.now(UTC) - timedelta(seconds=MAX_SESSION_SECONDS * 3)
    ArenaSession.objects.filter(pk__in=[session.pk, ordinary.pk]).update(started_at=stale)
    assert abandon_stale_sessions() == {"abandoned": 1}
    session.refresh_from_db()
    ordinary.refresh_from_db()
    assert session.abandoned_at is None and ordinary.abandoned_at is not None
    # Simulate a session becoming bound between the candidate scan and guarded update.
    unbound = ArenaSessionFactory(user=session.user, kind=SessionKind.ZEN, template=None, config_json={"time_limit_sec": 0})
    ArenaSession.objects.filter(pk=unbound.pk).update(started_at=stale)
    original_iterator = type(ArenaSession.objects.all()).iterator

    def bind_after_scan(queryset, *args, **kwargs):
        yield from original_iterator(queryset, *args, **kwargs)
        quest = DailyQuest.objects.get(pk=mission["id"])
        quest.pk = None
        quest._state.adding = True
        quest.mission_date -= timedelta(days=1)
        quest.session = unbound
        quest.save()

    with patch("django.db.models.query.QuerySet.iterator", bind_after_scan):
        assert abandon_stale_sessions() == {"abandoned": 0}
    unbound.refresh_from_db()
    assert unbound.abandoned_at is None


def race(student, operations):
    assert connection.vendor == "postgresql", "Required distinct-connection race evidence needs PostgreSQL"
    barrier = Barrier(len(operations))

    def run(operation):
        close_old_connections()
        try:
            client = APIClient()
            client.force_authenticate(student)
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_backend_pid()")
                pid = cursor.fetchone()[0]
                cursor.execute("SET lock_timeout = '8s'")
            barrier.wait(timeout=10)
            return pid, operation(client)
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=len(operations)) as executor:
        results = list(executor.map(run, operations))
    assert len({pid for pid, _ in results}) == len(operations)
    return [result for _, result in results]


@pytest.mark.django_db(transaction=True)
def test_independent_connection_assignment_start_finalize_and_start_finalize_races(student, template):
    assigned = race(student, [today, today])
    assert assigned[0]["mission"]["id"] == assigned[1]["mission"]["id"]
    mission = assigned[0]["mission"]
    starts = race(student, [lambda c: start(c, mission), lambda c: start(c, mission)])
    assert sorted(response.status_code for response in starts) == [200, 201]
    assert starts[0].json()["session_id"] == starts[1].json()["session_id"]
    session = ArenaSession.objects.get(pk=starts[0].json()["session_id"])
    durable_attempts(session, correct=3)
    finalizes = race(student, [lambda c: finish(c, session), lambda c: finish(c, session)])
    assert all(response.status_code == 200 for response in finalizes)
    assert finalizes[0].json()["id"] == finalizes[1].json()["id"]
    assert DailyQuest.objects.count() == ArenaSession.objects.count() == ProgressRecord.objects.count() == XPEvent.objects.count() == 1
    # A second assignment permits a concurrent resume/finalize on an active mission.
    with patch("apps.exercises.daily_quests.timezone.now", return_value=datetime(2030, 1, 1, tzinfo=UTC)):
        client = APIClient()
        client.force_authenticate(student)
        second = today(client)["mission"]
        session2 = ArenaSession.objects.get(pk=start(client, second).json()["session_id"])
    durable_attempts(session2)
    mixed = race(student, [lambda c: start(c, second), lambda c: finish(c, session2)])
    assert all(response.status_code == 200 for response in mixed)
    assert ProgressRecord.objects.filter(session=session2).count() == XPEvent.objects.filter(source_session=session2).count() == 1


@pytest.mark.django_db(transaction=True)
def test_start_resumes_while_finalizer_holds_session_waiting_for_mission(student, template):
    """Observe real PostgreSQL lock contention in the otherwise dangerous lock order."""
    assert connection.vendor == "postgresql"
    client = APIClient()
    client.force_authenticate(student)
    mission = today(client)["mission"]
    session = ArenaSession.objects.get(pk=start(client, mission).json()["session_id"])
    durable_attempts(session)
    rendezvous = Barrier(2, timeout=10)
    pids = {}

    def resume_holding_mission():
        close_old_connections()
        try:
            with transaction.atomic():
                User.objects.select_for_update(no_key=True).get(pk=student.pk)
                DailyQuest.objects.select_for_update().get(pk=mission["id"])
                with connection.cursor() as cursor:
                    cursor.execute("SELECT pg_backend_pid()")
                    pids["resume"] = cursor.fetchone()[0]
                    cursor.execute("SET lock_timeout = '5s'")
                    rendezvous.wait()
                    deadline = monotonic() + 5
                    waiting = False
                    while monotonic() < deadline:
                        cursor.execute("SELECT pg_stat_clear_snapshot()")
                        cursor.execute("SELECT wait_event_type FROM pg_stat_activity WHERE pid = %s", [pids["finalize"]])
                        if cursor.fetchone() == ("Lock",):
                            waiting = True
                            break
                    assert waiting, "Finalizer never waited on the held mission lock"
                # The finalizer owns the session lock now. Resume must not request it.
                own_client = APIClient()
                own_client.force_authenticate(student)
                return start(own_client, mission)
        finally:
            connection.close()

    def finalize_waiting_for_mission():
        close_old_connections()
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_backend_pid()")
                pids["finalize"] = cursor.fetchone()[0]
                cursor.execute("SET lock_timeout = '8s'")
            rendezvous.wait()
            own_client = APIClient()
            own_client.force_authenticate(student)
            return finish(own_client, session)
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        resume = executor.submit(resume_holding_mission)
        finalize = executor.submit(finalize_waiting_for_mission)
        assert resume.result(timeout=15).status_code == finalize.result(timeout=15).status_code == 200
    assert pids["resume"] != pids["finalize"]
    assert DailyQuest.objects.get(pk=mission["id"]).completed_at is not None
    assert ProgressRecord.objects.count() == XPEvent.objects.count() == 1


@pytest.mark.django_db(transaction=True)
def test_finalizer_commits_user_foreign_keys_while_start_waits_on_mission(student, template):
    """Finalizer-first: Start holds User while finalization commits deferred FK checks."""
    assert connection.vendor == "postgresql"
    client = APIClient()
    client.force_authenticate(student)
    mission = today(client)["mission"]
    session = ArenaSession.objects.get(pk=start(client, mission).json()["session_id"])
    durable_attempts(session)
    rendezvous = Barrier(2, timeout=10)
    pids = {}

    def finalize_then_commit():
        close_old_connections()
        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    cursor.execute("SELECT pg_backend_pid()")
                    pids["finalize"] = cursor.fetchone()[0]
                    cursor.execute("SET lock_timeout = '8s'")
                # Nested service transaction leaves its session/mission locks and
                # newly written ProgressRecord/XPEvent FK checks pending outer commit.
                record = finalize_session(session)
                rendezvous.wait()
                deadline = monotonic() + 5
                waiting = False
                with connection.cursor() as cursor:
                    while monotonic() < deadline:
                        cursor.execute("SELECT pg_stat_clear_snapshot()")
                        cursor.execute(
                            "SELECT wait_event_type, pg_blocking_pids(pid) FROM pg_stat_activity WHERE pid = %s",
                            [pids["start"]],
                        )
                        row = cursor.fetchone()
                        if row and row[0] == "Lock" and pids["finalize"] in row[1]:
                            waiting = True
                            break
                assert waiting, "Start never waited on finalizer's held mission lock"
            # Leaving the outer transaction performs the deferred User FK checks.
            return record.pk
        finally:
            connection.close()

    def start_waiting_on_mission():
        close_old_connections()
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_backend_pid()")
                pids["start"] = cursor.fetchone()[0]
                cursor.execute("SET lock_timeout = '8s'")
            rendezvous.wait()
            own_client = APIClient()
            own_client.force_authenticate(student)
            return start(own_client, mission)
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        finalizer = executor.submit(finalize_then_commit)
        starter = executor.submit(start_waiting_on_mission)
        assert finalizer.result(timeout=15) == ProgressRecord.objects.get(session=session).pk
        response = starter.result(timeout=15)
    assert pids["finalize"] != pids["start"]
    assert response.status_code == 200 and response.json()["daily_quest"]["state"] == "completed"
    assert DailyQuest.objects.get(pk=mission["id"]).completed_at is not None
    assert ProgressRecord.objects.filter(session=session).count() == XPEvent.objects.filter(source_session=session).count() == 1


@pytest.mark.django_db
def test_standalone_mission_session_delete_is_restricted(client, template):
    mission = today(client)["mission"]
    session = ArenaSession.objects.get(pk=start(client, mission).json()["session_id"])
    durable_attempts(session)
    finalize_session(session)
    with pytest.raises(RestrictedError):
        session.delete()
    assert DailyQuest.objects.filter(pk=mission["id"]).exists()
    assert QuestionAttempt.objects.filter(session=session).count() == 5
    assert ProgressRecord.objects.filter(session=session).count() == XPEvent.objects.filter(source_session=session).count() == 1


@pytest.mark.django_db
def test_user_cascade_includes_mission_and_history(client, student, template):
    mission = today(client)["mission"]
    session = ArenaSession.objects.get(pk=start(client, mission).json()["session_id"])
    durable_attempts(session)
    finalize_session(session)
    student_id, session_id = student.pk, session.pk
    # Django's existing User CASCADE lifecycle collects both quest and session.
    # RESTRICT must permit that collector while still protecting standalone deletes.
    student.delete()
    assert not User.objects.filter(pk=student_id).exists()
    assert not DailyQuest.objects.filter(pk=mission["id"]).exists()
    assert not ArenaSession.objects.filter(pk=session_id).exists()
    assert not QuestionAttempt.objects.filter(session_id=session_id).exists()
    assert not ProgressRecord.objects.filter(session_id=session_id).exists()
    assert not XPEvent.objects.filter(user_id=student_id).exists()


@pytest.mark.django_db
def test_all_mission_session_responses_and_errors_are_private(client, student, template):
    quest = today(client)["mission"]
    session = ArenaSession.objects.get(pk=start(client, quest).json()["session_id"])
    response = client.get(reverse("session-detail", kwargs={"session_id": session.pk}))
    assert response.status_code == 200 and response["Cache-Control"] == "no-store"
    response = finish(client, session, 0)
    assert response.status_code == 409 and response["Cache-Control"] == "no-store"
    response = client.get(reverse("session-report", kwargs={"session_id": session.pk}))
    assert response.status_code == 400 and response["Cache-Control"] == "no-store"
    response = attempt(client, session, 0, session.questions_json[0]["answer"])
    assert response.status_code == 200 and response["Cache-Control"] == "no-store"
    response = attempt(client, session, 1, SKIP_ANSWER_SENTINEL)
    assert response.status_code == 400 and response["Cache-Control"] == "no-store"
    response = client.post(reverse("session-attempts-bulk", kwargs={"session_id": session.pk}), {
        "contract_version": 2,
        "attempts": [{"question_index": i, "attempt_number": 1,
                      "answer": session.questions_json[i]["answer"], "elapsed_ms": 500}
                     for i in range(1, 5)],
    }, format="json")
    assert response.status_code == 200 and response["Cache-Control"] == "no-store"
    response = finish(client, session)
    assert response.status_code == 200 and response["Cache-Control"] == "no-store"
    response = client.get(reverse("session-report", kwargs={"session_id": session.pk}))
    assert response.status_code == 200 and response["Cache-Control"] == "no-store"
    ordinary = ArenaSessionFactory(user=student, kind=SessionKind.ZEN, template=None)
    response = client.get(reverse("session-detail", kwargs={"session_id": ordinary.pk}))
    assert response.status_code == 200 and response.get("Cache-Control") is None
