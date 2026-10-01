"""Synthetic teacher real-API browser fixture and guarded persistence inspection.

Run in the backend directory with apps.classroom.tests.browser_settings and
TEACHER_E2E=1. Output contains only synthetic credentials/data. The active student
has no precreated session; --inspect-session exposes answers only to the test
process after the real classwork-start endpoint creates its random questions.
"""

import argparse
import json
import os
import uuid
from urllib.parse import urlparse

import django


def main():
    django.setup()
    from django.conf import settings
    from django.contrib.auth.hashers import identify_hasher
    from django.db import connection, transaction

    from apps.classroom.models import Class, Enrollment
    from apps.courses.models import Lesson, Level
    from apps.exercises.models import ArenaSession, ExerciseTemplate, SessionKind
    from apps.progress.models import (
        LessonCompletion,
        LevelCompletion,
        ProgressRecord,
        QuestionAttempt,
    )
    from apps.progress.services import finalize_session, record_attempt
    from apps.users.models import Profile, Role, User

    parser = argparse.ArgumentParser()
    parser.add_argument("--inspect", action="store_true")
    parser.add_argument("--inspect-session")
    args = parser.parse_args()
    redis = urlparse(settings.CACHES["default"]["LOCATION"])
    database = connection.settings_dict
    if (
        os.environ.get("TEACHER_E2E") != "1"
        or database["NAME"] != "bolt_teacher_browser"
        or database.get("HOST") not in {"localhost", "127.0.0.1"}
        or connection.vendor != "postgresql"
        or not 160000 <= connection.pg_version < 170000
        or os.environ.get("REPLICA_DATABASE_URL")
        or "replica" in settings.DATABASES
        or "classroom_stale_replica" in settings.DATABASES
        or redis.hostname not in {"localhost", "127.0.0.1"}
        or redis.path != "/14"
    ):
        raise SystemExit(
            "Requires TEACHER_E2E=1 and isolated local bolt_teacher_browser PG16/Redis14 without replicas"
        )

    prefix = "teacher-e2e-"

    def synthetic_users():
        return User.objects.filter(email__startswith=prefix, email__endswith="@example.invalid")

    def inspect():
        owned = Class.objects.get(name="Teacher verification batch", teacher__in=synthetic_users())
        foreign = Class.objects.get(
            name="Other teacher private batch", teacher__in=synthetic_users()
        )
        result = {
            "owned_class_id": str(owned.id),
            "foreign_class_id": str(foreign.id),
            "assigned_level_ids": [
                str(value)
                for value in owned.assigned_levels.order_by("order").values_list("id", flat=True)
            ],
            "enrollments": list(
                owned.enrollments.order_by("student__profile__call_sign").values(
                    "student_id", "student__profile__call_sign", "is_active"
                )
            ),
            "progress_records": ProgressRecord.objects.filter(user__in=synthetic_users()).count(),
            "lesson_completions": LessonCompletion.objects.filter(
                user__in=synthetic_users()
            ).count(),
            "level_completions": LevelCompletion.objects.filter(user__in=synthetic_users()).count(),
            "question_attempts": QuestionAttempt.objects.filter(
                session__user__in=synthetic_users()
            ).count(),
        }

        result["history_counts"] = {
            key: result[key]
            for key in (
                "progress_records",
                "lesson_completions",
                "level_completions",
                "question_attempts",
            )
        }
        return result

    if args.inspect_session:
        session = ArenaSession.objects.get(pk=args.inspect_session, user__in=synthetic_users())
        record = ProgressRecord.objects.filter(session=session).first()
        output = {
            "session_id": str(session.id),
            "answers": [question["answer"] for question in session.questions_json],
            "attempt_count": session.attempts.count(),
            "result_count": ProgressRecord.objects.filter(session=session).count(),
            "score_correct": record.score_correct if record else None,
            "score_total": record.score_total if record else None,
        }
    elif args.inspect:
        output = inspect()
    else:
        if User.objects.exists() or Class.objects.exists() or Level.objects.exists():
            raise SystemExit("Teacher fixture refuses a nonempty database")
        with transaction.atomic():
            run_id = uuid.uuid4().hex[:8]
            teachers = []
            for index in (1, 2):
                email = f"{prefix}{run_id}-teacher-{index}@example.invalid"
                password = "TeacherE2E2468!"
                user = User.objects.create_user(email=email, password=password, role=Role.TEACHER)
                Profile.objects.create(user=user, display_name=f"Synthetic teacher {index}")
                teachers.append(
                    {
                        "id": str(user.id),
                        "email": email,
                        "password": password,
                        "display_name": f"Synthetic teacher {index}",
                    }
                )
            students = {}
            for kind in ("active", "inactive"):
                call_sign = f"TeacherE2E{run_id}{kind}"
                user = User.objects.create_user(
                    email=f"{prefix}{run_id}-{kind}@example.invalid",
                    password="2468",
                    role=Role.STUDENT,
                )
                Profile.objects.create(
                    user=user, display_name=f"Synthetic {kind} student", call_sign=call_sign
                )
                students[kind] = {"id": str(user.id), "call_sign": call_sign, "pin": "2468"}
            if any(
                identify_hasher(user.password).algorithm != "pbkdf2_sha256"
                for user in synthetic_users()
            ):
                raise ValueError("Browser fixtures must use the actual PBKDF2 password hasher")
            levels, template = [], None
            for order in (1, 2, 3):
                level = Level.objects.create(order=order, name=f"Teacher test level {order}")
                lesson = Lesson.objects.create(
                    level=level, order=1, name=f"Teacher test lesson {order}"
                )
                exercise = ExerciseTemplate.objects.create(
                    lesson=lesson,
                    kind=SessionKind.CLASSWORK,
                    question_count=3,
                    time_limit_sec=120,
                    config_json={"operation": "ADD", "digits": 1, "rows": 2, "question_count": 3},
                )
                if order == 1:
                    template = exercise
                levels.append(
                    {
                        "id": str(level.id),
                        "order": order,
                        "name": level.name,
                        "lesson_id": str(lesson.id),
                        "lesson_name": lesson.name,
                    }
                )
            owned = Class.objects.create(
                teacher_id=teachers[0]["id"], name="Teacher verification batch"
            )
            owned.assigned_levels.add(levels[0]["id"])
            foreign = Class.objects.create(
                teacher_id=teachers[1]["id"], name="Other teacher private batch"
            )
            foreign.assigned_levels.add(levels[0]["id"])
            Enrollment.objects.create(class_room=owned, student_id=students["active"]["id"])
            Enrollment.objects.create(
                class_room=owned, student_id=students["inactive"]["id"], is_active=False
            )
            inactive_session = ArenaSession.objects.create(
                user_id=students["inactive"]["id"],
                kind=SessionKind.CLASSWORK,
                template=template,
                config_json=dict(template.config_json),
                seed=42,
                questions_json=[
                    {"text": text, "answer": answer, "operation": "ADD"}
                    for text, answer in [("1 + 1", 2), ("2 + 3", 5), ("4 + 5", 9)]
                ],
            )
            for index, question in enumerate(inactive_session.questions_json):
                record_attempt(
                    inactive_session,
                    index,
                    1,
                    question["text"],
                    question["answer"],
                    question["answer"],
                    1000,
                )
            finalize_session(inactive_session)
            output = {
                "teachers": teachers,
                "students": students,
                "levels": levels,
                "classes": {
                    "owned": {
                        "id": str(owned.id),
                        "name": owned.name,
                        "join_code": owned.join_code,
                    },
                    "foreign": {"id": str(foreign.id), "name": foreign.name},
                },
                "hasher": "pbkdf2_sha256",
                "inactive_answers": [2, 5, 9],
                "inactive_session_id": str(inactive_session.id),
            }
    print(json.dumps(output, default=str))


if __name__ == "__main__":
    main()
