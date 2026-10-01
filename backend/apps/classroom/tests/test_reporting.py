"""Teacher reporting: committed membership, preserved metrics and bounded primary reads."""

from decimal import Decimal

import pytest
from django.core.cache import cache
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from rest_framework_simplejwt.tokens import AccessToken

from apps.classroom.models import Class, Enrollment
from apps.classroom.views import ClassListCreateView, RosterView, TeacherLevelDashboardView
from apps.exercises.tests.factories import ArenaSessionFactory, LessonFactory, LevelFactory
from apps.progress.models import LessonCompletion, LevelCompletion, ProgressRecord, XPEvent
from apps.users.tests.factories import ProfileFactory, TeacherFactory, UserFactory


def auth(user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {AccessToken.for_user(user)}")
    return client


def record(user, accuracy="100", total=3):
    session = ArenaSessionFactory(user=user, template=None)
    return ProgressRecord.objects.create(
        user=user,
        session=session,
        score_correct=1,
        score_total=total,
        accuracy_pct=Decimal(accuracy),
        time_taken_sec=1,
        xp_earned=10,
    )


def completed(user, lesson, kind="CLASSWORK", progress=None):
    return LessonCompletion.objects.create(
        user=user,
        lesson=lesson,
        kind=kind,
        best_accuracy_pct=100,
        best_progress_record=progress or record(user),
    )


@pytest.mark.django_db
def test_membership_agrees_without_assignment_join_multiplication():
    teacher, foreign_teacher = TeacherFactory.create_batch(2)
    level, other_level = LevelFactory.create_batch(2)
    lesson, empty_lesson = LessonFactory(level=level), LessonFactory(level=level, order=2)
    active, inactive, shared, foreign_student = UserFactory.create_batch(4)
    own = Class.objects.create(teacher=teacher, name="A")
    own.assigned_levels.set([level, other_level])
    overlap = Class.objects.create(teacher=teacher, name="B")
    overlap.assigned_levels.add(level)
    empty = Class.objects.create(teacher=teacher, name="Empty")
    empty.assigned_levels.add(level)
    archived = Class.objects.create(teacher=teacher, name="Archived", is_active=False)
    archived.assigned_levels.add(level)
    unassigned = Class.objects.create(teacher=teacher, name="Unassigned")
    foreign = Class.objects.create(teacher=foreign_teacher, name="Foreign")
    foreign.assigned_levels.add(level)
    for cls, students in [
        (own, [active, shared]),
        (overlap, [shared]),
        (archived, [active]),
        (unassigned, [active]),
        (foreign, [foreign_student]),
    ]:
        Enrollment.objects.bulk_create([Enrollment(class_room=cls, student=u) for u in students])
    Enrollment.objects.create(class_room=own, student=inactive, is_active=False)
    for user in [active, inactive, shared, foreign_student]:
        completed(user, lesson)
    completed(inactive, lesson, kind="HOMEWORK")
    completed(shared, lesson, kind="HOMEWORK")
    # No new exclusion rule based on User.is_active: active enrollment remains authoritative.
    shared.is_active = False
    shared.save(update_fields=["is_active"])
    client = auth(teacher)
    listed = {row["id"]: row for row in client.get(reverse("class-list-create")).json()}
    matrix = client.get(reverse("teacher-level-dashboard", kwargs={"level_id": level.id})).json()
    assert {row["id"] for row in matrix["classes"]} == {str(own.id), str(overlap.id), str(empty.id)}
    for row in matrix["classes"]:
        roster = client.get(reverse("class-roster", kwargs={"pk": row["id"]})).json()
        assert row["total_students"] == listed[row["id"]]["student_count"] == len(roster)
    own_stats = next(row for row in matrix["classes"] if row["id"] == str(own.id))["lessons"]
    assert own_stats == [
        {"lesson_id": str(lesson.id), "classwork_completed": 2, "homework_completed": 1},
        {"lesson_id": str(empty_lesson.id), "classwork_completed": 0, "homework_completed": 0},
    ]
    assert listed[str(archived.id)]["student_count"] == 1
    assert client.get(reverse("class-roster", kwargs={"pk": archived.id})).status_code == 200
    assert str(foreign.id) not in listed


@pytest.mark.django_db
def test_roster_metrics_preserve_gap_cap_arithmetic_mean_and_missing_profile():
    teacher = TeacherFactory()
    batch = Class.objects.create(teacher=teacher, name="Metrics")
    empty, gap, capped = UserFactory.create_batch(3)
    ProfileFactory(user=gap, call_sign="gap-sign", display_name="Gap Display")
    ProfileFactory(user=capped, display_name="Capped Display", call_sign="")
    Enrollment.objects.bulk_create(
        [Enrollment(class_room=batch, student=u) for u in (empty, gap, capped)]
    )
    gap_records = [
        record(gap, "25", total=100),
        record(gap, "100", total=1),
        record(gap, "50", total=3),
    ]
    cap_record = record(capped, "76.65")
    levels = LevelFactory.create_batch(12)
    LevelCompletion.objects.bulk_create(
        [
            LevelCompletion(
                user=gap, level=completed_level, kind="CLASSWORK", best_progress_record=gap_records[0]
            )
            for completed_level in (levels[1], levels[8])
        ]
        + [
            LevelCompletion(
                user=gap, level=levels[0], kind="HOMEWORK", best_progress_record=gap_records[0]
            )
        ]
        + [
            LevelCompletion(user=capped, level=completed_level, kind="CLASSWORK", best_progress_record=cap_record)
            for completed_level in levels
        ]
    )
    XPEvent.objects.bulk_create(
        [XPEvent(user=gap, event_type="SESSION_COMPLETE", delta=5) for _ in range(9)]
    )
    # Stale shared stats must not affect current authoritative reporting.
    cache.set(f"user_stats:{gap.id}", {"current_level": 9}, timeout=60)
    rows = {
        row["id"]: row
        for row in auth(teacher).get(reverse("class-roster", kwargs={"pk": batch.id})).json()
    }
    assert rows[str(empty.id)]["call_sign"] == ""
    assert rows[str(empty.id)]["current_level"] == 1
    assert rows[str(empty.id)]["accuracy_pct"] is None
    assert rows[str(gap.id)]["call_sign"] == "gap-sign"
    assert rows[str(gap.id)]["current_level"] == 3
    assert rows[str(gap.id)]["accuracy_pct"] == 58.3
    assert rows[str(capped.id)]["call_sign"] == "Capped Display"
    assert rows[str(capped.id)]["current_level"] == 10
    assert rows[str(capped.id)]["accuracy_pct"] == 76.7


@pytest.mark.django_db
def test_level_report_empty_lessons_missing_level_and_ownership():
    teacher, other = TeacherFactory.create_batch(2)
    level = LevelFactory()
    batch = Class.objects.create(teacher=teacher, name="No lessons")
    batch.assigned_levels.add(level)
    client = auth(teacher)
    result = client.get(reverse("teacher-level-dashboard", kwargs={"level_id": level.id})).json()
    assert result["lessons"] == []
    assert result["classes"] == [
        {"id": str(batch.id), "name": "No lessons", "total_students": 0, "lessons": []}
    ]
    assert (
        auth(other)
        .get(reverse("teacher-level-dashboard", kwargs={"level_id": level.id}))
        .json()["classes"]
        == []
    )
    assert (
        client.get(
            reverse(
                "teacher-level-dashboard",
                kwargs={"level_id": "00000000-0000-0000-0000-000000000000"},
            )
        ).status_code
        == 404
    )
    assert auth(other).get(reverse("class-roster", kwargs={"pk": batch.id})).status_code == 404


@pytest.mark.django_db
@pytest.mark.parametrize("role", [None, "STUDENT", "GUARDIAN", "ADMIN"])
def test_reporting_denies_non_teachers(role):
    teacher = TeacherFactory()
    batch = Class.objects.create(teacher=teacher, name="Private")
    level = LevelFactory()
    client = APIClient() if role is None else auth(UserFactory(role=role))
    for url in [
        reverse("class-list-create"),
        reverse("class-roster", kwargs={"pk": batch.id}),
        reverse("teacher-level-dashboard", kwargs={"level_id": level.id}),
    ]:
        assert client.get(url).status_code == (401 if role is None else 403)


@pytest.mark.django_db
@pytest.mark.parametrize("students", [5, 10, 50, 150])
@pytest.mark.parametrize("class_count", [1, 5, 20])
def test_reporting_query_budgets_do_not_grow(students, class_count):
    teacher = TeacherFactory()
    level, other_level = LevelFactory.create_batch(2)
    lesson = LessonFactory(level=level)
    users = UserFactory.create_batch(students)
    classes = [Class.objects.create(teacher=teacher, name=f"Batch {i}") for i in range(class_count)]
    Enrollment.objects.bulk_create(
        [Enrollment(class_room=c, student=u) for c in classes for u in users]
    )
    through = Class.assigned_levels.through
    through.objects.bulk_create(
        [through(class_id=c.id, level_id=assigned_level.id) for c in classes for assigned_level in (level, other_level)]
    )
    progress = record(users[0])
    completed(users[0], lesson, progress=progress)
    factory = APIRequestFactory()
    for view, kwargs, budget, expected_rows in [
        (ClassListCreateView, {}, 2, class_count),
        (RosterView, {"pk": classes[0].id}, 4, students),
        (TeacherLevelDashboardView, {"level_id": level.id}, 5, class_count),
    ]:
        for _ in range(2):
            request = factory.get("/")
            force_authenticate(request, user=teacher)
            with CaptureQueriesContext(connection) as captured:
                response = view.as_view()(request, **kwargs)
                response.render()
            assert response.status_code == 200
            assert len(captured) <= budget, [q["sql"] for q in captured]
            rows = response.data if isinstance(response.data, list) else response.data["classes"]
            assert len(rows) == expected_rows


class ReportingReplicaRouter:
    """Fail immediately if a report forgets to pin an authoritative input."""

    def db_for_read(self, model, **hints):
        if model._meta.app_label in {"classroom", "courses", "progress"}:
            return "unavailable_stale_replica"
        return "default"

    def db_for_write(self, model, **hints):
        return "default"


@pytest.mark.django_db
def test_all_report_inputs_explicitly_pin_primary():
    from django.test import override_settings

    teacher = TeacherFactory()
    student = UserFactory()
    level = LevelFactory()
    lesson = LessonFactory(level=level)
    batch = Class.objects.create(teacher=teacher, name="Primary only")
    batch.assigned_levels.add(level)
    Enrollment.objects.create(class_room=batch, student=student)
    completed(student, lesson)
    client = auth(teacher)
    with override_settings(DATABASE_ROUTERS=[ReportingReplicaRouter()]):
        assert client.get(reverse("class-list-create")).json()[0]["student_count"] == 1
        roster = client.get(reverse("class-roster", kwargs={"pk": batch.id})).json()
        assert roster[0]["accuracy_pct"] == 100
        matrix = client.get(
            reverse("teacher-level-dashboard", kwargs={"level_id": level.id})
        ).json()
        assert matrix["classes"][0]["lessons"][0]["classwork_completed"] == 1


@pytest.mark.django_db(transaction=True)
def test_report_refresh_after_committed_real_finalization_and_retake():
    from apps.exercises.tests.factories import ExerciseTemplateFactory
    from apps.progress.models import QuestionAttempt

    teacher, student = TeacherFactory(), UserFactory()
    batch = Class.objects.create(teacher=teacher, name="Refresh")
    level = LevelFactory()
    lesson = LessonFactory(level=level)
    batch.assigned_levels.add(level)
    Enrollment.objects.create(class_room=batch, student=student)
    template = ExerciseTemplateFactory(lesson=lesson)
    teacher_client, student_client = auth(teacher), auth(student)
    roster_url = reverse("class-roster", kwargs={"pk": batch.id})
    matrix_url = reverse("teacher-level-dashboard", kwargs={"level_id": level.id})
    assert teacher_client.get(roster_url).json()[0]["accuracy_pct"] is None
    assert (
        teacher_client.get(matrix_url).json()["classes"][0]["lessons"][0]["classwork_completed"]
        == 0
    )
    for expected_accuracy in (33.3, 66.7):
        session = ArenaSessionFactory(user=student, template=template)
        for i in range(1 if expected_accuracy == 33.3 else 3):
            response = student_client.post(
                reverse("session-attempt", kwargs={"session_id": session.id}),
                {
                    "question_index": i,
                    "answer": session.questions_json[i]["answer"],
                    "elapsed_ms": 1000,
                },
                format="json",
            )
            assert response.status_code == 200
        finish_url = reverse("session-submit", kwargs={"session_id": session.id})
        response = student_client.post(finish_url, format="json")
        assert response.status_code == 200
        assert student_client.post(finish_url, format="json").json() == response.json()
        assert teacher_client.get(roster_url).json()[0]["accuracy_pct"] == expected_accuracy
        assert teacher_client.get(roster_url).json()[0]["current_level"] == 2
        assert (
            teacher_client.get(matrix_url).json()["classes"][0]["lessons"][0]["classwork_completed"]
            == 1
        )
    assert ProgressRecord.objects.filter(user=student).count() == 2
    assert (
        LessonCompletion.objects.filter(user=student, lesson=lesson, kind="CLASSWORK").count() == 1
    )
    assert QuestionAttempt.objects.filter(session__user=student).count() == 4


@pytest.mark.django_db(transaction=True, databases="__all__")
def test_reports_read_primary_with_genuinely_available_stale_replica():
    from django.conf import settings
    from django.db import connections
    from django.test import override_settings

    from apps.courses.models import Lesson, Level
    from apps.exercises.tests.factories import ExerciseTemplateFactory

    alias = "classroom_stale_replica"
    if alias not in settings.DATABASES:
        pytest.skip("Separate classroom_stale_replica test database was not provisioned")
    assert settings.DATABASES[alias]["NAME"] != settings.DATABASES["default"]["NAME"]
    assert not settings.DATABASES[alias].get("TEST", {}).get("MIRROR")

    teacher, student = TeacherFactory(), UserFactory()
    level = LevelFactory()
    lesson = LessonFactory(level=level)
    Level.objects.using(alias).create(id=level.id, order=level.order, name="Stale catalogue")
    Lesson.objects.using(alias).create(
        id=lesson.id, level_id=level.id, order=lesson.order, name="Stale lesson"
    )
    batch = Class.objects.create(teacher=teacher, name="Primary membership")
    batch.assigned_levels.add(level)
    Enrollment.objects.create(class_room=batch, student=student)
    session = ArenaSessionFactory(user=student, template=ExerciseTemplateFactory(lesson=lesson))
    student_client = auth(student)
    accepted = student_client.post(
        reverse("session-attempt", kwargs={"session_id": session.id}),
        {"question_index": 0, "answer": session.questions_json[0]["answer"], "elapsed_ms": 1000},
        format="json",
    )
    assert accepted.status_code == 200
    assert (
        student_client.post(
            reverse("session-submit", kwargs={"session_id": session.id}), format="json"
        ).status_code
        == 200
    )
    assert ProgressRecord.objects.using("default").filter(user=student).count() == 1
    assert ProgressRecord.objects.using(alias).count() == 0
    assert LessonCompletion.objects.using(alias).count() == 0

    class AvailableStaleReplicaRouter(ReportingReplicaRouter):
        def db_for_read(self, model, **hints):
            if model._meta.app_label in {"courses", "progress"}:
                return alias
            return "default"

    router = AvailableStaleReplicaRouter()
    assert router.db_for_read(ProgressRecord) == alias
    assert Level.objects.using(alias).get(pk=level.id).name == "Stale catalogue"
    client = auth(teacher)
    with (
        override_settings(DATABASE_ROUTERS=[router]),
        CaptureQueriesContext(connections[alias]) as replica_queries,
        CaptureQueriesContext(connection) as primary_queries,
    ):
        roster = client.get(reverse("class-roster", kwargs={"pk": batch.id})).json()
        matrix = client.get(
            reverse("teacher-level-dashboard", kwargs={"level_id": level.id})
        ).json()
    assert len(replica_queries) == 0
    assert len(primary_queries) > 0
    assert roster[0]["accuracy_pct"] == 33.3
    assert roster[0]["current_level"] == 2
    assert matrix["level"]["name"] == level.name
    assert matrix["lessons"][0]["name"] == lesson.name
    assert matrix["classes"][0]["lessons"][0]["classwork_completed"] == 1
