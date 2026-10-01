"""AR API-01..09 / DATA-01: HTTP receipts, durable rows and PostgreSQL lock races.

The old tests named submit_attempt_idempotent/bulk_submit_idempotent remain
legacy compatibility limitations: absent-version transport retries allocate rows.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier, Event
from time import monotonic
from unittest.mock import patch

import pytest
from django.db import close_old_connections, connection, transaction
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.exercises.constants import SKIP_ANSWER_SENTINEL
from apps.exercises.models import ArenaSession, SessionKind
from apps.exercises.tasks import abandon_stale_sessions
from apps.exercises.tests.factories import (
    ArenaSessionFactory,
    ExerciseTemplateFactory,
    LessonFactory,
    LevelFactory,
)
from apps.progress.models import ProgressRecord, QuestionAttempt, XPEvent
from apps.progress.services import record_attempt
from apps.users.tests.factories import GuardianFactory
from config.dbrouter import PrimaryReplicaRouter


@pytest.fixture
def session():
    return ArenaSessionFactory(kind=SessionKind.ZEN, template=None)


@pytest.fixture
def client(session):
    client = APIClient()
    client.force_authenticate(session.user)
    return client


def url(session, route="session-attempt"):
    return reverse(route, kwargs={"session_id": session.pk})


def item(q=0, number=1, answer=99, elapsed=500, **extra):
    return {
        "question_index": q,
        "attempt_number": number,
        "answer": answer,
        "elapsed_ms": elapsed,
        **extra,
    }


def single(client, session, attempt):
    return client.post(url(session), {"contract_version": 2, **attempt}, format="json")


def bulk(client, session, attempts):
    return client.post(
        url(session, "session-attempts-bulk"),
        {"contract_version": 2, "attempts": attempts},
        format="json",
    )


def finish(client, session, identities=None):
    return client.post(
        url(session, "session-submit"),
        {"contract_version": 2, "expected_attempts": identities or []},
        format="json",
    )


@pytest.mark.django_db
def test_api01_replay_single_bulk_cross_path_and_closed_result(client, session):
    attempt = item(answer=2, elapsed=2500)
    accepted = single(client, session, attempt)
    assert accepted.status_code == 200
    receipt = accepted.json()
    assert receipt == {
        "contract_version": 2,
        "question_index": 0,
        "attempt_number": 1,
        "accepted": True,
        "submitted_answer": 2,
        "elapsed_ms": 2500,
        "is_skip": False,
        "is_correct": True,
        "xp_delta": 0,
    }
    for _ in range(3):
        assert single(client, session, attempt).json() == receipt
        assert bulk(client, session, [attempt]).json() == {
            "contract_version": 2,
            "verdicts": [receipt],
        }
    result = finish(client, session, [{"question_index": 0, "attempt_number": 1}])
    assert result.status_code == 200
    assert result.json()["score_correct"] == 1
    assert result.json()["time_taken_sec"] == 2
    for _ in range(3):
        assert finish(client, session).json() == result.json()
        assert single(client, session, attempt).json() == receipt
        assert bulk(client, session, [attempt]).json()["verdicts"] == [receipt]
    assert session.attempts.count() == 1
    assert XPEvent.objects.filter(source_session=session).count() == 1
    assert (
        client.get(url(session, "session-report")).json()["progress"]["id"] == result.json()["id"]
    )


@pytest.mark.django_db
@pytest.mark.parametrize(
    "changed", [{"answer": 7}, {"elapsed_ms": 501}, {"answer": 0, "is_skip": True}]
)
def test_api02_conflict_rolls_back_new_items_and_returns_private_receipt(client, session, changed):
    original = item()
    receipt = single(client, session, original).json()
    response = bulk(client, session, [item(q=1), {**original, **changed}])
    assert response.status_code == 409
    assert response.json()["code"] == "identity_conflict"
    assert response.json()["receipt"] == receipt
    assert session.attempts.count() == 1


_BAD_VALUES = [
    {"question_index": True},
    {"question_index": "0"},
    {"question_index": 0.0},
    {"question_index": -1},
    {"question_index": 3},
    {"attempt_number": 0},
    {"attempt_number": 32768},
    {"attempt_number": False},
    {"attempt_number": "1"},
    {"attempt_number": 1.5},
    {"answer": True},
    {"answer": "2"},
    {"answer": 2.0},
    {"answer": 2147483648},
    {"answer": -2147483649},
    {"elapsed_ms": True},
    {"elapsed_ms": "500"},
    {"elapsed_ms": 0.1},
    {"elapsed_ms": -1},
    {"elapsed_ms": 2147483648},
    {"is_skip": 1},
    {"is_skip": None},
    {"is_skip": False, "answer": SKIP_ANSWER_SENTINEL},
    {"is_skip": True, "answer": 7},
]


@pytest.mark.django_db
@pytest.mark.parametrize("invalid", _BAD_VALUES)
def test_api03_invalid_second_item_entire_batch_has_zero_writes(client, session, invalid):
    response = bulk(client, session, [item(), {**item(q=1), **invalid}])
    assert response.status_code == 400
    assert response.json()["code"] == "invalid_attempt"
    assert response.json()["items"][-1]["index"] == 1
    assert session.attempts.count() == 0


@pytest.mark.django_db
@pytest.mark.parametrize("attempts", [[item(), item()], [item()] * 101, [item(), None]])
def test_api03_duplicate_oversize_nonobject_no_writes(client, session, attempts):
    response = bulk(client, session, attempts)
    assert response.status_code == 400
    if len(attempts) == 2 and attempts[1] is not None:
        assert response.json()["code"] == "duplicate_identity"
        assert {error["index"] for error in response.json()["items"]} == {0, 1}
    assert session.attempts.count() == 0


@pytest.mark.django_db
def test_api03_replays_not_acknowledged_when_other_item_is_invalid(client, session):
    single(client, session, item())
    response = bulk(client, session, [item(), item(q=1, elapsed=-1)])
    assert response.status_code == 400
    assert "verdicts" not in response.json()
    assert session.attempts.count() == 1


@pytest.mark.django_db
@pytest.mark.parametrize("kind", SessionKind.values)
def test_api04_wrong_then_correct_reversed_batch_every_mode(client, session, kind):
    session.kind = kind
    session.save(update_fields=["kind"])
    response = bulk(client, session, [item(number=8, answer=2), item(number=3)])
    assert response.status_code == 200
    assert [r["attempt_number"] for r in response.json()["verdicts"]] == [8, 3]
    assert [r["is_correct"] for r in response.json()["verdicts"]] == [True, False]
    assert single(client, session, item(number=9)).json()["code"] == "attempt_limit"
    assert bulk(client, session, [item(number=8, answer=2)]).status_code == 200
    result = finish(client, session).json()
    assert result["score_correct"] == 1 and result["score_total"] == 3
    report = client.get(url(session, "session-report")).json()
    assert report["question_verdicts"] == {"0": "fixed", "1": "unanswered", "2": "unanswered"}


@pytest.mark.django_db
@pytest.mark.parametrize(
    "answer,flag,skip",
    [
        (0, {}, False),
        (0, {"is_skip": False}, False),
        (0, {"is_skip": True}, True),
        (SKIP_ANSWER_SENTINEL, {}, True),
        (SKIP_ANSWER_SENTINEL, {"is_skip": True}, True),
    ],
)
def test_api04_zero_and_skip_normalization(client, session, answer, flag, skip):
    session.questions_json = [dict(q) for q in session.questions_json]
    session.questions_json[0]["answer"] = 0
    session.save(update_fields=["questions_json"])
    response = single(client, session, item(answer=answer, **flag))
    assert response.status_code == 200
    assert response.json()["is_skip"] == skip
    assert response.json()["is_correct"] is (not skip)
    assert response.json()["submitted_answer"] == (SKIP_ANSWER_SENTINEL if skip else 0)
    if skip:
        assert single(client, session, item(answer=SKIP_ANSWER_SENTINEL)).json() == response.json()
    assert session.attempts.count() == 1


@pytest.mark.django_db
@pytest.mark.parametrize("kind", [SessionKind.CLASSWORK, SessionKind.TIME_ATTACK])
def test_api04_fast_item_rejects_full_batch(client, session, kind):
    session.kind = kind
    session.save(update_fields=["kind"])
    response = bulk(client, session, [item(), item(q=1, elapsed=199)])
    assert response.status_code == 400
    assert response.json()["items"][0]["question_index"] == 1
    assert session.attempts.count() == 0
    assert bulk(client, session, [item(answer=0, elapsed=0, is_skip=True)]).status_code == 200


@pytest.mark.django_db
@pytest.mark.parametrize(
    "kind", [SessionKind.ZEN, SessionKind.CUSTOM, SessionKind.FLASH_CARDS, SessionKind.HOMEWORK]
)
def test_api04_fast_nonenforced_modes_accept(client, session, kind):
    session.kind = kind
    session.save(update_fields=["kind"])
    assert single(client, session, item(elapsed=0)).status_code == 200


@pytest.mark.django_db
def test_api05_classwork_cap_counts_rows_and_replays_across_paths(client, session):
    session.kind = SessionKind.CLASSWORK
    session.save(update_fields=["kind"])
    assert single(client, session, item(number=100)).status_code == 200
    assert bulk(client, session, [item(number=500), item(number=300)]).status_code == 200
    for _ in range(3):
        assert single(client, session, item(number=100)).status_code == 200
        assert bulk(client, session, [item(number=300)]).status_code == 200
    response = single(client, session, item(number=32767))
    assert response.status_code == 409 and response.json()["code"] == "attempt_limit"
    assert session.attempts.count() == 3


@pytest.mark.django_db
@pytest.mark.parametrize(
    "kind", [SessionKind.ZEN, SessionKind.CUSTOM, SessionKind.FLASH_CARDS, SessionKind.TIME_ATTACK]
)
def test_api05_practice_wrong_retries_remain_unlimited(client, session, kind):
    session.kind = kind
    session.save(update_fields=["kind"])
    assert bulk(client, session, [item(number=n) for n in range(1, 101)]).status_code == 200
    assert single(client, session, item(number=101)).status_code == 200
    assert bulk(client, session, [item(number=102, answer=2)]).status_code == 200
    assert session.attempts.count() == 102
    assert finish(client, session).json()["score_correct"] == 1


@pytest.mark.django_db
@pytest.mark.parametrize("bulk_first", [False, True])
def test_api05_test_mode_no_skip_one_answer_shared_paths(client, session, bulk_first):
    session.is_test_mode = True
    session.save(update_fields=["is_test_mode"])
    assert bulk(client, session, [item(answer=0, is_skip=True)]).status_code == 400
    first = (
        bulk(client, session, [item(number=32766)])
        if bulk_first
        else single(client, session, item(number=32766))
    )
    assert first.status_code == 200
    assert single(client, session, item(number=32766)).status_code == 200
    assert bulk(client, session, [item(number=32767, answer=2)]).status_code == 409
    assert session.attempts.count() == 1


@pytest.mark.django_db
def test_api05_cap_prevalidation_no_partial_insert(client, session):
    session.kind = SessionKind.CLASSWORK
    session.save(update_fields=["kind"])
    assert bulk(client, session, [item(number=n) for n in range(1, 5)]).status_code == 409
    assert session.attempts.count() == 0


@pytest.mark.django_db
def test_api07_required_manifest_after_finalize_and_closed_new_write(client, session):
    missing = [{"question_index": 0, "attempt_number": 5}]
    response = finish(client, session, missing)
    assert response.status_code == 409
    assert response.json()["missing_attempts"] == missing
    assert not ProgressRecord.objects.filter(session=session).exists()
    assert not XPEvent.objects.filter(source_session=session).exists()
    assert single(client, session, item(number=5)).status_code == 200
    result = finish(client, session, missing).json()
    assert result["contract_version"] == 2
    assert finish(client, session, [{"question_index": 1, "attempt_number": 6}]).status_code == 409
    assert finish(client, session, missing).json() == result
    assert single(client, session, item(number=6)).json()["code"] == "session_closed"


@pytest.mark.django_db
@pytest.mark.parametrize(
    "manifest",
    [None, {}, [item()] * 201, [{"question_index": True, "attempt_number": 1}], [item(), item()]],
)
def test_api07_manifest_required_bounded_and_distinct(client, session, manifest):
    response = client.post(
        url(session, "session-submit"),
        {"contract_version": 2, "expected_attempts": manifest},
        format="json",
    )
    assert response.status_code == 400
    assert not ProgressRecord.objects.filter(session=session).exists()


@pytest.mark.django_db
def test_api07_abandoned_accepts_only_exact_replay(client, session):
    receipt = single(client, session, item()).json()
    ArenaSession.objects.filter(pk=session.pk).update(abandoned_at=timezone.now())
    assert single(client, session, item()).json() == receipt
    assert bulk(client, session, [item(), item(q=1)]).json()["code"] == "session_closed"
    assert finish(client, session).json()["code"] == "session_closed"
    assert client.get(url(session, "session-detail")).json()["state"] == "abandoned"
    assert session.attempts.count() == 1
    assert not XPEvent.objects.filter(source_session=session).exists()


@pytest.mark.django_db
def test_api08_legacy_zero_based_number_uses_max_identity_and_legacy_shapes(client, session):
    assert single(client, session, item(number=20)).status_code == 200
    response = client.post(
        url(session, "session-attempts-bulk"), {"attempts": [item(number=0)]}, format="json"
    )
    assert response.status_code == 200
    assert response.json() == {
        "verdicts": [{"question_index": 0, "is_correct": False, "xp_delta": 0}]
    }
    response = client.post(url(session), item(number=0), format="json")
    assert response.status_code == 200
    assert "contract_version" not in response.json()
    assert list(
        session.attempts.order_by("attempt_number").values_list("attempt_number", flat=True)
    ) == [20, 21, 22]


@pytest.mark.django_db
@pytest.mark.parametrize("version", [1, 3, "2", True, None, 2.0])
@pytest.mark.parametrize("route", ["session-attempt", "session-attempts-bulk", "session-submit"])
def test_api08_unsupported_explicit_version(client, session, version, route):
    response = client.post(
        url(session, route),
        {"contract_version": version, **item(), "attempts": [item()], "expected_attempts": []},
        format="json",
    )
    assert response.status_code == 400
    assert response.json()["code"] == "unsupported_contract"
    assert session.attempts.count() == 0
    assert not ProgressRecord.objects.filter(session=session).exists()


@pytest.mark.django_db
def test_data01_historical_null_identity_no_backfill_and_capability1(client, session):
    historical = record_attempt(session, 0, None, "1+1", 2, 99, 500)
    metadata = client.get(url(session, "session-detail")).json()
    assert metadata["attempt_contract_version"] == 1
    assert metadata["question_states"][0] == {
        "question_index": 0,
        "max_attempt_number": 0,
        "attempt_count": 1,
        "terminal": False,
        "latest_receipt": None,
    }
    assert single(client, session, item()).json()["code"] == "unsupported_contract"
    historical.refresh_from_db()
    assert historical.attempt_number is None and session.attempts.count() == 1


@pytest.mark.django_db
def test_api09_metadata_receipts_context_timing_and_privacy(client, session):
    single(client, session, item(number=9))
    single(client, session, item(number=15, answer=2))
    metadata = client.get(url(session, "session-detail")).json()
    assert metadata["attempt_contract_version"] == 2 and metadata["state"] == "active"
    assert metadata["started_at"] and metadata["server_now"]
    assert metadata["lesson_id"] is None and metadata["level_id"] is None
    assert len(metadata["question_states"]) == len(session.questions_json)
    state = metadata["question_states"][0]
    assert state["max_attempt_number"] == 15 and state["attempt_count"] == 2 and state["terminal"]
    assert state["latest_receipt"]["attempt_number"] == 15
    assert (
        "expected_answer" not in state["latest_receipt"]
        and "question_text" not in state["latest_receipt"]
    )
    session.kind = SessionKind.CLASSWORK
    session.save(update_fields=["kind"])
    assert all(
        "answer" not in q for q in client.get(url(session, "session-detail")).json()["questions"]
    )


@pytest.mark.django_db
@pytest.mark.parametrize(
    "route,method",
    [
        ("session-detail", "get"),
        ("session-report", "get"),
        ("session-attempt", "post"),
        ("session-attempts-bulk", "post"),
        ("session-submit", "post"),
    ],
)
def test_api09_other_owner_cannot_read_write_or_get_conflict_receipt(session, route, method):
    single_client = APIClient()
    single_client.force_authenticate(session.user)
    single(single_client, session, item())
    client = APIClient()
    client.force_authenticate(GuardianFactory())
    if method == "get":
        response = client.get(url(session, route))
    else:
        response = client.post(
            url(session, route),
            {
                "contract_version": 2,
                **item(answer=2),
                "attempts": [item()],
                "expected_attempts": [],
            },
            format="json",
        )
    assert response.status_code == 404
    assert "receipt" not in response.json()
    assert session.attempts.count() == 1


@pytest.mark.django_db
def test_api09_unauthenticated_write_and_read(session):
    assert APIClient().get(url(session, "session-detail")).status_code == 401
    assert single(APIClient(), session, item()).status_code == 401


@pytest.mark.django_db
def test_data01_historical_finalized_report_record_xp_remain_unchanged(client, session):
    record_attempt(session, 0, 1, "1+1", 2, 2, 500)
    record_attempt(session, 0, 2, "1+1", 2, 99, 500)
    # Synthetic old durable record, made before the scoring marker existed.
    record = ProgressRecord.objects.create(
        session=session,
        user=session.user,
        score_correct=1,
        score_total=3,
        accuracy_pct=33.33,
        time_taken_sec=1,
        xp_earned=13,
    )
    XPEvent.objects.create(
        user=session.user, event_type="SESSION_COMPLETE", delta=13, source_session=session
    )
    ArenaSession.objects.filter(pk=session.pk).update(submitted_at=timezone.now())
    report_before = client.get(url(session, "session-report")).json()
    assert report_before["question_verdicts"] == {"0": "wrong"}
    result = finish(client, session).json()
    assert result["id"] == str(record.id) and result["xp_earned"] == 13
    assert client.get(url(session, "session-report")).json() == report_before
    session.refresh_from_db()
    assert "scoring_version" not in session.config_json
    assert XPEvent.objects.get(source_session=session).delta == 13


@pytest.mark.django_db
def test_data01_new_score_and_report_count_one_question_even_with_legacy_duplicate_corrects(
    client, session
):
    record_attempt(session, 0, 1, "1+1", 2, 2, 500)
    record_attempt(session, 0, 2, "1+1", 2, 2, 500)
    result = finish(client, session).json()
    assert result["score_correct"] == 1 and result["score_total"] == 3
    assert result["time_taken_sec"] == 1
    session.refresh_from_db()
    assert session.config_json["scoring_version"] == 2 and session.config_json["operation"] == "ADD"
    assert client.get(url(session, "session-report")).json()["question_verdicts"]["0"] == "correct"


@pytest.mark.django_db
def test_api09_new_classwork_freezes_effective_limit_and_context():
    user = GuardianFactory()
    level = LevelFactory(order=1)
    lesson = LessonFactory(level=level)
    template = ExerciseTemplateFactory(lesson=lesson, time_limit_sec=123)
    client = APIClient()
    client.force_authenticate(user)
    response = client.post(
        reverse("lesson-classwork-start", kwargs={"level_id": level.pk, "lesson_id": lesson.pk}),
        format="json",
    )
    assert response.status_code == 201
    data = response.json()
    assert (
        data["time_limit_sec"] == 123
        and data["lesson_id"] == str(lesson.pk)
        and data["level_id"] == str(level.pk)
    )
    session = ArenaSession.objects.get(pk=data["session_id"])
    assert session.config_json["time_limit_sec"] == 123
    template.time_limit_sec = 999
    template.save(update_fields=["time_limit_sec"])
    assert client.get(url(session, "session-detail")).json()["time_limit_sec"] == 123


def ordered_race(session, first_action, second_action):
    """First holds the row lock; second really waits in PostgreSQL before commit.

    Barriers coordinate independent thread-local connections/transactions. We
    observe pg_stat_activity rather than assuming a sleep establishes a race.
    """
    rendezvous = Barrier(2, timeout=5)
    second_pid = {}
    queried = Event()

    def first():
        close_old_connections()
        try:
            with transaction.atomic():
                ArenaSession.objects.select_for_update().get(pk=session.pk)
                result = first_action()
                rendezvous.wait()
                deadline = monotonic() + 5
                with connection.cursor() as cursor:
                    while monotonic() < deadline:
                        cursor.execute(
                            "SELECT wait_event_type FROM pg_stat_activity WHERE pid = %s",
                            [second_pid["pid"]],
                        )
                        if cursor.fetchone() == ("Lock",):
                            queried.set()
                            break
                        # Refresh pg_stat_activity's per-transaction snapshot.
                        cursor.execute("SELECT pg_stat_clear_snapshot()")
                    assert (
                        queried.is_set()
                    ), "Second connection never waited on the held session lock"
            return result
        finally:
            connection.close()

    def second():
        close_old_connections()
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_backend_pid()")
                second_pid["pid"] = cursor.fetchone()[0]
            rendezvous.wait()
            return second_action()
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        one, two = pool.submit(first), pool.submit(second)
        return one.result(timeout=10), two.result(timeout=10)


def own_client(session):
    client = APIClient()
    client.force_authenticate(session.user)
    return client


@pytest.mark.django_db(transaction=True)
def test_api06_concurrent_exact_writes_share_one_receipt_and_row(session):
    one, two = ordered_race(
        session,
        lambda: single(own_client(session), session, item()),
        lambda: bulk(own_client(session), session, [item()]),
    )
    assert one.status_code == two.status_code == 200
    assert one.json() == two.json()["verdicts"][0]
    assert session.attempts.count() == 1


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("write_first", [True, False])
def test_api06_write_finalize_order_and_no_duplicate_xp(session, write_first):
    def write():
        return single(own_client(session), session, item(answer=2))

    def finalize():
        return finish(own_client(session), session)

    first, second = ordered_race(
        session, write if write_first else finalize, finalize if write_first else write
    )
    assert first.status_code == 200
    assert second.status_code == (200 if write_first else 409)
    record = ProgressRecord.objects.get(session=session)
    assert record.score_correct == (1 if write_first else 0)
    assert session.attempts.count() == (1 if write_first else 0)
    assert XPEvent.objects.filter(source_session=session).count() == 1
    assert finish(own_client(session), session).json()["id"] == str(record.id)


@pytest.mark.django_db(transaction=True)
def test_api06_concurrent_finalizations_return_one_result_and_xp(session):
    one, two = ordered_race(
        session,
        lambda: finish(own_client(session), session),
        lambda: finish(own_client(session), session),
    )
    assert one.status_code == two.status_code == 200 and one.json() == two.json()
    assert XPEvent.objects.filter(source_session=session).count() == 1
    assert ProgressRecord.objects.filter(session=session).count() == 1


@pytest.mark.django_db(transaction=True)
def test_api06_stale_cleanup_scan_cannot_abandon_finalized_session(session):
    ArenaSession.objects.filter(pk=session.pk).update(
        started_at=timezone.now() - timedelta(hours=3)
    )
    original_update = type(ArenaSession.objects.all()).update
    scanned = Event()

    def mark_scanned(queryset, **kwargs):
        if "abandoned_at" in kwargs:
            scanned.set()
        return original_update(queryset, **kwargs)

    with patch("django.db.models.query.QuerySet.update", mark_scanned):
        one, two = ordered_race(
            session, lambda: finish(own_client(session), session), abandon_stale_sessions
        )
    assert scanned.is_set() and one.status_code == 200 and two == {"abandoned": 0}
    session.refresh_from_db()
    assert session.submitted_at is not None and session.abandoned_at is None
    assert XPEvent.objects.filter(source_session=session).count() == 1


@pytest.mark.django_db
def test_api04_late_gap_reducer_and_latest_receipt_follow_accepted_order(client, session):
    assert single(client, session, item(number=10)).status_code == 200
    response = single(client, session, item(number=4, answer=2))
    assert response.status_code == 200
    state = client.get(url(session, "session-detail")).json()["question_states"][0]
    assert state["max_attempt_number"] == 10 and state["latest_receipt"] == response.json()
    assert state["terminal"] and state["attempt_count"] == 2
    assert finish(client, session).json()["score_correct"] == 1
    assert client.get(url(session, "session-report")).json()["question_verdicts"]["0"] == "fixed"


@pytest.mark.django_db
@pytest.mark.parametrize("answer", [-2147483648, 2147483647])
def test_api03_integer_boundaries_are_accepted_and_replayed(client, session, answer):
    attempt = item(number=32767, answer=answer, elapsed=2147483647)
    response = single(client, session, attempt)
    assert response.status_code == 200
    assert single(client, session, attempt).json() == response.json()
    assert (
        response.json()["submitted_answer"] == answer
        and response.json()["elapsed_ms"] == 2147483647
    )
    assert session.attempts.count() == 1


@pytest.mark.django_db
def test_api08_legacy_adapter_also_enforces_test_mode_cap_and_skip(client, session):
    session.is_test_mode = True
    session.save(update_fields=["is_test_mode"])
    legacy_url = url(session, "session-attempts-bulk")
    assert (
        client.post(
            legacy_url, {"attempts": [item(answer=SKIP_ANSWER_SENTINEL)]}, format="json"
        ).status_code
        == 400
    )
    assert single(client, session, item(number=50)).status_code == 200
    assert client.post(legacy_url, {"attempts": [item(number=0)]}, format="json").status_code == 400
    assert session.attempts.count() == 1


@pytest.mark.django_db
def test_api09_legacy_correct_then_wrong_latest_receipt_remains_terminal(client, session):
    record_attempt(session, 0, 1, "1+1", 2, 2, 500)
    latest = record_attempt(session, 0, 2, "1+1", 2, 99, 500)
    metadata = client.get(url(session, "session-detail")).json()
    assert metadata["question_states"][0]["terminal"] is True
    assert metadata["question_states"][0]["latest_receipt"]["is_correct"] is False
    assert (
        metadata["question_states"][0]["latest_receipt"]["attempt_number"] == latest.attempt_number
    )
    assert metadata["question_states"][1:] == [
        {
            "question_index": q,
            "max_attempt_number": 0,
            "attempt_count": 0,
            "terminal": False,
            "latest_receipt": None,
        }
        for q in [1, 2]
    ]
    response = single(client, session, item(number=3))
    assert response.status_code == 409 and response.json()["code"] == "attempt_limit"
    assert session.attempts.count() == 2
    assert finish(client, session).json()["score_correct"] == 1
    assert client.get(url(session, "session-report")).json()["question_verdicts"]["0"] == "correct"


class StaleProgressReplicaRouter(PrimaryReplicaRouter):
    """Any unpinned authoritative read fails instead of accidentally passing on primary."""

    def db_for_read(self, model, **hints):
        if model._meta.app_label in {"progress", "courses"}:
            return "unavailable_stale_replica"
        return super().db_for_read(model, **hints)


@pytest.mark.django_db
def test_replica_router_recovery_receipts_manifest_score_and_legacy_are_primary(client, session):
    router = StaleProgressReplicaRouter()
    assert router.db_for_read(QuestionAttempt) == "unavailable_stale_replica"
    assert router.db_for_read(ProgressRecord) == "unavailable_stale_replica"
    historical = ArenaSessionFactory(user=session.user, kind=SessionKind.ZEN, template=None)
    record_attempt(historical, 0, None, "1+1", 2, 99, 500)
    with override_settings(DATABASE_ROUTERS=[router]):
        accepted = single(client, session, item(number=20))
        assert accepted.status_code == 200
        assert single(client, session, item(number=20)).json() == accepted.json()
        legacy = client.post(
            url(session, "session-attempts-bulk"), {"attempts": [item(number=0)]}, format="json"
        )
        assert legacy.status_code == 200
        legacy = client.post(url(session), item(number=0), format="json")
        assert legacy.status_code == 200
        corrected = bulk(client, session, [item(number=23, answer=2)])
        assert corrected.status_code == 200
        metadata = client.get(url(session, "session-detail")).json()
        assert metadata["question_states"][0]["attempt_count"] == 4
        assert metadata["question_states"][0]["latest_receipt"] == corrected.json()["verdicts"][0]
        assert metadata["attempt_contract_version"] == 2
        assert client.get(url(historical, "session-detail")).json()["attempt_contract_version"] == 1
        assert single(client, historical, item()).json()["code"] == "unsupported_contract"
        manifest = [{"question_index": 0, "attempt_number": 23}]
        response = finish(client, session, manifest)
        assert response.status_code == 200
        result = response.json()
        assert result["score_correct"] == 1 and result["time_taken_sec"] == 2
        assert finish(client, session, manifest).json() == result
        assert (
            finish(client, session, [{"question_index": 1, "attempt_number": 1}]).json()["code"]
            == "pending_attempts"
        )
        assert single(client, session, item(number=20)).json() == accepted.json()
        report = client.get(url(session, "session-report"))
        assert report.status_code == 200
        assert report.json()["progress"]["id"] == result["id"]
        assert report.json()["question_verdicts"]["0"] == "fixed"
    assert session.attempts.count() == 4
    assert XPEvent.objects.filter(source_session=session).count() == 1


@pytest.mark.django_db
def test_replica_router_legacy_finalize_and_retake_best_record_use_primary(client, session):
    curated = ArenaSessionFactory(user=session.user)
    retake = ArenaSessionFactory(user=session.user, template=curated.template)
    with override_settings(DATABASE_ROUTERS=[StaleProgressReplicaRouter()]):
        metadata = client.get(url(curated, "session-detail"))
        assert metadata.status_code == 200
        assert metadata.json()["level_id"] == str(curated.template.lesson.level_id)
        first = client.post(url(curated, "session-submit"), format="json")
        assert first.status_code == 200 and first.json()["score_correct"] == 0
        assert single(client, retake, item(answer=2)).status_code == 200
        second = client.post(url(retake, "session-submit"), format="json")
        assert second.status_code == 200
        assert second.json()["score_correct"] == 1 and second.json()["xp_earned"] == 0
        assert client.post(url(curated, "session-submit"), format="json").json() == first.json()
        assert client.post(url(retake, "session-submit"), format="json").json() == second.json()
    assert XPEvent.objects.filter(source_session__in=[curated, retake]).count() == 2
