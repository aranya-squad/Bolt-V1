"""Assigned levels remain atomic owner-controlled reporting metadata."""

import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from django.db import connections
from django.test import override_settings
from django.urls import reverse

from apps.classroom.models import Class, Enrollment
from apps.classroom.serializers import ClassPatchSerializer
from apps.classroom.views import ClassDetailView
from apps.exercises.models import ArenaSession
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
from apps.users.tests.factories import TeacherFactory, UserFactory

from .test_reporting import ReportingReplicaRouter, auth


@pytest.fixture
def assignment(db):
    teacher = TeacherFactory()
    levels = LevelFactory.create_batch(3)
    batch = Class.objects.create(teacher=teacher, name="Assignment")
    batch.assigned_levels.add(levels[0])
    return teacher, batch, levels


def assigned(batch):
    return list(
        Class.assigned_levels.through.objects.filter(class_id=batch.id)
        .order_by("level__order")
        .values_list("level_id", flat=True)
    )


@pytest.mark.django_db
def test_assignment_replacement_canonicalization_omission_and_clear(assignment):
    teacher, batch, levels = assignment
    client = auth(teacher)
    url = reverse("class-detail", kwargs={"pk": batch.id})
    response = client.patch(
        url,
        {"assigned_level_ids": [str(levels[2].id).upper(), levels[0].id.hex]},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["assigned_level_ids"] == [
        str(levels[0].id),
        str(levels[2].id),
    ]
    assert assigned(batch) == [levels[0].id, levels[2].id]
    assert client.patch(url, {"name": "Name-only legacy caller"}, format="json").json()[
        "assigned_level_ids"
    ] == [str(levels[0].id), str(levels[2].id)]
    assert (
        client.patch(url, {"assigned_level_ids": []}, format="json").json()["assigned_level_ids"]
        == []
    )
    assert assigned(batch) == []
    assert client.patch(url, {}, format="json").json()["assigned_level_ids"] == []


@pytest.mark.django_db
def test_assignment_fields_are_additive_on_list_create_join_and_not_rotate(assignment):
    teacher, batch, levels = assignment
    batch.assigned_levels.set([levels[2], levels[0]])
    client = auth(teacher)
    listed = client.get(reverse("class-list-create")).json()
    assert listed[0]["assigned_level_ids"] == [str(levels[0].id), str(levels[2].id)]
    created = client.post(reverse("class-list-create"), {"name": "Name-only create"}, format="json")
    assert created.status_code == 201
    assert created.json()["assigned_level_ids"] == []
    student = UserFactory()
    joined = auth(student).post(
        reverse("class-join"), {"join_code": batch.join_code}, format="json"
    )
    assert joined.status_code == 201
    assert joined.json()["assigned_level_ids"] == listed[0]["assigned_level_ids"]
    assert joined.json()["student_count"] == 1
    assert set(client.post(reverse("class-rotate-code", kwargs={"pk": batch.id})).json()) == {
        "join_code"
    }


@pytest.mark.django_db
@pytest.mark.parametrize("value", [[], None, "not-an-array", ["not-a-uuid"]])
def test_post_assignment_is_rejected_before_creating_any_class(assignment, value):
    teacher, batch, _ = assignment
    before = Class.objects.count()
    response = auth(teacher).post(
        reverse("class-list-create"),
        {"name": "Must not persist", "assigned_level_ids": value},
        format="json",
    )
    assert response.status_code == 400
    assert "assigned_level_ids" in response.json()
    assert Class.objects.count() == before
    assert assigned(batch)


@pytest.mark.django_db
@pytest.mark.parametrize(
    "value",
    [None, 5, True, "not-a-list", {}, [5], [True], [None], [{}], [[]], ["not-a-uuid"]],
)
def test_assignment_input_invalid_types_reject_all_scalar_changes(assignment, value):
    teacher, batch, levels = assignment
    response = auth(teacher).patch(
        reverse("class-detail", kwargs={"pk": batch.id}),
        {
            "name": "Must not persist",
            "live_session_link": "https://example.com/changed",
            "is_active": False,
            "assigned_level_ids": value,
        },
        format="json",
    )
    assert response.status_code == 400
    assert "assigned_level_ids" in response.json()
    batch.refresh_from_db()
    assert (batch.name, batch.live_session_link, batch.is_active) == (
        "Assignment",
        "",
        True,
    )
    assert assigned(batch) == [levels[0].id]


@pytest.mark.django_db
@pytest.mark.parametrize(
    "case", ["unknown", "mixed_unknown", "duplicate_uppercase", "duplicate_hex"]
)
def test_unknown_and_normalized_duplicate_ids_write_nothing(assignment, case):
    teacher, batch, levels = assignment
    known = str(levels[1].id)
    unknown = str(uuid.uuid4())
    payload = {
        "unknown": [unknown],
        "mixed_unknown": [known, unknown],
        "duplicate_uppercase": [known, known.upper()],
        "duplicate_hex": [known, levels[1].id.hex],
    }[case]
    response = auth(teacher).patch(
        reverse("class-detail", kwargs={"pk": batch.id}),
        {"name": "Invalid mixed update", "assigned_level_ids": payload},
        format="json",
    )
    assert response.status_code == 400
    assert "assigned_level_ids" in response.json()
    batch.refresh_from_db()
    assert batch.name == "Assignment"
    assert assigned(batch) == [levels[0].id]


@pytest.mark.django_db
def test_invalid_scalar_does_not_replace_valid_assignment(assignment):
    teacher, batch, levels = assignment
    response = auth(teacher).patch(
        reverse("class-detail", kwargs={"pk": batch.id}),
        {"name": "", "assigned_level_ids": [str(levels[1].id)]},
        format="json",
    )
    assert response.status_code == 400
    assert "name" in response.json()
    assert assigned(batch) == [levels[0].id]


@pytest.mark.django_db
def test_foreign_or_missing_owner_rejected_before_assignment_validation(assignment):
    _, batch, _ = assignment
    client = auth(TeacherFactory())
    for pk in (batch.id, uuid.uuid4()):
        response = client.patch(
            reverse("class-detail", kwargs={"pk": pk}),
            {"assigned_level_ids": [None]},
            format="json",
        )
        assert response.status_code == 404
        assert "assigned_level_ids" not in response.json()


@pytest.mark.django_db
@pytest.mark.parametrize("role", ["STUDENT", "GUARDIAN", "ADMIN"])
def test_assignment_mutation_never_grants_non_teacher_portal_access(assignment, role):
    _, batch, levels = assignment
    client = auth(UserFactory(role=role))
    assert (
        client.patch(
            reverse("class-detail", kwargs={"pk": batch.id}),
            {"assigned_level_ids": []},
            format="json",
        ).status_code
        == 403
    )
    assert client.get(reverse("class-list-create")).status_code == 403
    assert (
        client.get(
            reverse("teacher-level-dashboard", kwargs={"level_id": levels[0].id})
        ).status_code
        == 403
    )
    assert assigned(batch) == [levels[0].id]


@pytest.mark.django_db(transaction=True)
def test_assignment_only_controls_report_inclusion_and_preserves_history_access(
    assignment,
):
    teacher, batch, levels = assignment
    student = UserFactory()
    Enrollment.objects.create(class_room=batch, student=student)
    lesson = LessonFactory(level=levels[0])
    LessonFactory(level=levels[0], order=2)
    third_lesson = LessonFactory(level=levels[2])
    session = ArenaSessionFactory(user=student, template=ExerciseTemplateFactory(lesson=lesson))
    question = session.questions_json[0]
    record_attempt(session, 0, 1, question["text"], question["answer"], question["answer"], 1000)
    finalize_session(session)
    ExerciseTemplateFactory(lesson=third_lesson)
    student_client = auth(student)
    access_before = student_client.get(reverse("level-list")).json()
    lesson_urls = [
        reverse("lesson-list", kwargs={"level_id": level.id}) for level in (levels[0], levels[2])
    ]
    lessons_before = [student_client.get(lesson_url).json() for lesson_url in lesson_urls]
    # Even an unassigned level remains playable: assignment governs reports.
    start_url = reverse(
        "lesson-classwork-start", kwargs={"level_id": levels[2].id, "lesson_id": third_lesson.id}
    )
    started = student_client.post(start_url, format="json")
    assert started.status_code == 201

    def history_values():
        # Freeze IDs, scores, completion pointers and timestamps, not just row
        # counts: an accidental in-place rewrite must fail this regression.
        return tuple(
            list(model.objects.order_by("pk").values())
            for model in (
                ProgressRecord,
                LessonCompletion,
                LevelCompletion,
                QuestionAttempt,
                XPEvent,
                ArenaSession,
            )
        )

    history_before = history_values()
    assert all(history_before)
    client = auth(teacher)
    url = reverse("class-detail", kwargs={"pk": batch.id})
    matrix_url = reverse("teacher-level-dashboard", kwargs={"level_id": levels[2].id})
    assert client.get(matrix_url).json()["classes"] == []
    assert (
        client.patch(
            url,
            {"assigned_level_ids": [str(levels[0].id), str(levels[2].id)]},
            format="json",
        ).status_code
        == 200
    )
    assert client.get(matrix_url).json()["classes"][0]["id"] == str(batch.id)
    assert client.patch(url, {"assigned_level_ids": []}, format="json").status_code == 200
    assert client.get(matrix_url).json()["classes"] == []
    assert history_values() == history_before
    assert Enrollment.objects.get(class_room=batch, student=student).is_active
    assert student_client.get(reverse("level-list")).json() == access_before
    assert (
        client.patch(
            url,
            {"is_active": False, "assigned_level_ids": [str(levels[2].id)]},
            format="json",
        ).status_code
        == 200
    )
    assert client.patch(
        url,
        {"assigned_level_ids": [str(levels[0].id), str(levels[2].id)]},
        format="json",
    ).json()["assigned_level_ids"] == [str(levels[0].id), str(levels[2].id)]
    assert client.get(matrix_url).json()["classes"] == []
    assert history_values() == history_before
    assert Enrollment.objects.get(class_room=batch, student=student).is_active
    assert [student_client.get(lesson_url).json() for lesson_url in lesson_urls] == lessons_before
    resumed = student_client.post(start_url, format="json")
    assert resumed.status_code == 200
    assert resumed.json()["session_id"] == started.json()["session_id"]
    assert history_values() == history_before


@pytest.mark.django_db
def test_assignment_validation_and_serialization_pin_primary(assignment):
    teacher, batch, levels = assignment
    with override_settings(DATABASE_ROUTERS=[ReportingReplicaRouter()]):
        response = auth(teacher).patch(
            reverse("class-detail", kwargs={"pk": batch.id}),
            {"assigned_level_ids": [str(levels[2].id), str(levels[0].id)]},
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["assigned_level_ids"] == [
            str(levels[0].id),
            str(levels[2].id),
        ]
        assert (
            auth(teacher).get(reverse("class-list-create")).json()[0]["assigned_level_ids"]
            == response.json()["assigned_level_ids"]
        )


@pytest.mark.django_db(transaction=True)
def test_assignment_write_rolls_back_without_atomic_requests(monkeypatch):
    teacher = TeacherFactory()
    levels = LevelFactory.create_batch(2)
    batch = Class.objects.create(teacher=teacher, name="Rollback")
    batch.assigned_levels.add(levels[0])
    monkeypatch.setitem(connections["default"].settings_dict, "ATOMIC_REQUESTS", False)
    manager_class = Class.assigned_levels.related_manager_cls
    original_set = manager_class.set

    def failing_set(self, *args, **kwargs):
        original_set(self, *args, **kwargs)
        raise RuntimeError("synthetic failure after relation write")

    monkeypatch.setattr(manager_class, "set", failing_set)
    with pytest.raises(RuntimeError, match="synthetic failure"):
        auth(teacher).patch(
            reverse("class-detail", kwargs={"pk": batch.id}),
            {"name": "Must roll back", "assigned_level_ids": [str(levels[1].id)]},
            format="json",
        )
    batch.refresh_from_db()
    assert batch.name == "Rollback"
    assert assigned(batch) == [levels[0].id]


@pytest.mark.django_db(transaction=True)
def test_separate_connection_replacements_serialize_owned_row_without_atomic_requests(
    monkeypatch,
):
    teacher = TeacherFactory()
    levels = LevelFactory.create_batch(3)
    batch = Class.objects.create(teacher=teacher, name="Before")
    monkeypatch.setitem(connections["default"].settings_dict, "ATOMIC_REQUESTS", False)
    first_locked, release_first, second_lookup = (
        threading.Event(),
        threading.Event(),
        threading.Event(),
    )
    second_pid = []
    original_update = ClassPatchSerializer.update
    original_get_own = ClassDetailView._get_own

    def paused_update(self, instance, validated_data):
        if validated_data.get("name") == "First":
            first_locked.set()
            if not release_first.wait(10):
                raise TimeoutError("First replacement release missing")
        return original_update(self, instance, validated_data)

    def watched_get_own(self, request, pk):
        if request.data.get("name") == "Second":
            with connections["default"].cursor() as cursor:
                cursor.execute("SELECT pg_backend_pid()")
                second_pid.append(cursor.fetchone()[0])
            second_lookup.set()
        return original_get_own(self, request, pk)

    monkeypatch.setattr(ClassPatchSerializer, "update", paused_update)
    monkeypatch.setattr(ClassDetailView, "_get_own", watched_get_own)

    def replace(name, ids, is_active):
        connections.close_all()
        try:
            return auth(teacher).patch(
                reverse("class-detail", kwargs={"pk": batch.id}),
                {
                    "name": name,
                    "is_active": is_active,
                    "assigned_level_ids": [str(value) for value in ids],
                },
                format="json",
            )
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=2) as executor:
        first = executor.submit(replace, "First", [levels[0].id, levels[2].id], True)
        try:
            assert first_locked.wait(10)
            second = executor.submit(replace, "Second", [levels[1].id], False)
            assert second_lookup.wait(10)
            waited = False
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline:
                with connections["default"].cursor() as cursor:
                    cursor.execute(
                        "SELECT wait_event_type FROM pg_stat_activity WHERE pid = %s",
                        [second_pid[0]],
                    )
                    result = cursor.fetchone()
                if result and result[0] == "Lock":
                    waited = True
                    break
                time.sleep(0.02)
            assert waited, "Second actual PostgreSQL connection did not block on the owned row"
            assert not second.done()
        finally:
            release_first.set()
        first_response, second_response = (
            first.result(timeout=10),
            second.result(timeout=10),
        )
    assert first_response.status_code == second_response.status_code == 200
    assert first_response.json()["assigned_level_ids"] == [
        str(levels[0].id),
        str(levels[2].id),
    ]
    assert second_response.json()["assigned_level_ids"] == [str(levels[1].id)]
    batch.refresh_from_db()
    assert (batch.name, batch.is_active) == ("Second", False)
    assert assigned(batch) == [levels[1].id]


@pytest.mark.django_db(transaction=True, databases="__all__")
def test_assignment_validates_known_ids_against_primary_not_available_stale_catalogue():
    from django.conf import settings
    from django.test.utils import CaptureQueriesContext

    from apps.courses.models import Level

    alias = "classroom_stale_replica"
    if alias not in settings.DATABASES:
        pytest.skip("Separate classroom_stale_replica test database was not provisioned")
    assert settings.DATABASES[alias]["NAME"] != settings.DATABASES["default"]["NAME"]
    assert not settings.DATABASES[alias].get("TEST", {}).get("MIRROR")
    teacher = TeacherFactory()
    level = LevelFactory()
    stale_id = uuid.uuid4()
    Level.objects.using(alias).create(id=stale_id, order=level.order, name="Stale deleted level")
    batch = Class.objects.create(teacher=teacher, name="Primary catalogue")

    class AvailableStaleCatalogueRouter(ReportingReplicaRouter):
        def db_for_read(self, model, **hints):
            if model._meta.app_label == "courses":
                return alias
            return "default"

    router = AvailableStaleCatalogueRouter()
    assert router.db_for_read(Level) == alias
    assert not Level.objects.using(alias).filter(id=level.id).exists()
    client = auth(teacher)
    url = reverse("class-detail", kwargs={"pk": batch.id})
    with (
        override_settings(DATABASE_ROUTERS=[router]),
        CaptureQueriesContext(connections[alias]) as replica_queries,
    ):
        known = client.patch(url, {"assigned_level_ids": [str(level.id)]}, format="json")
        stale = client.patch(
            url,
            {"name": "Must not save", "assigned_level_ids": [str(stale_id)]},
            format="json",
        )
    assert len(replica_queries) == 0
    assert known.status_code == 200
    assert known.json()["assigned_level_ids"] == [str(level.id)]
    assert stale.status_code == 400
    assert "assigned_level_ids" in stale.json()
    batch.refresh_from_db()
    assert batch.name == "Primary catalogue"
    assert assigned(batch) == [level.id]
