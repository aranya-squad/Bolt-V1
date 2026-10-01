"""Reproducible isolated PostgreSQL classroom baseline/candidate measurements.

Run from backend after migrating an EMPTY local database named
bolt_teacher_benchmark; BOLT_CLASSROOM_BENCHMARK=1 is required. Redis must use
an isolated loopback database. No fixture survives each rolled-back scenario.
"""

import copy
import json
import os
import re
import sys
import uuid
from collections import Counter
from pathlib import Path
from time import perf_counter
from urllib.parse import urlparse

import django


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")
    django.setup()

    from django.conf import settings
    from django.core.cache import cache
    from django.db import connection, transaction
    from django.test import override_settings
    from django.test.utils import CaptureQueriesContext
    from django.urls import reverse
    from django.utils import timezone
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import AccessToken

    from apps.classroom.models import Class, Enrollment
    from apps.courses.models import Lesson, Level
    from apps.exercises.models import ArenaSession, SessionKind
    from apps.progress.models import LessonCompletion, LevelCompletion, ProgressRecord, XPEvent
    from apps.users.models import Profile, Role, User

    if len(sys.argv) != 3:
        raise SystemExit("Usage: python -m apps.classroom.tests.benchmark_reporting OUTPUT_JSON SHA")
    if os.environ.get("BOLT_CLASSROOM_BENCHMARK") != "1":
        raise SystemExit("Set BOLT_CLASSROOM_BENCHMARK=1 only for the isolated fixture runtime")
    database = connection.settings_dict
    redis_url = urlparse(settings.CACHES["default"]["LOCATION"])
    if os.environ.get("REPLICA_DATABASE_URL") or set(settings.DATABASES) != {"default"}:
        raise SystemExit("Benchmark refuses configured replica/other database connections")
    if (
        database["NAME"] != "bolt_teacher_benchmark"
        or database.get("HOST") not in {"127.0.0.1", "localhost", "postgres"}
        or connection.vendor != "postgresql"
        or not 160000 <= connection.pg_version < 170000
        or redis_url.hostname not in {"127.0.0.1", "localhost", "redis"}
        or redis_url.path in {"", "/", "/0"}
    ):
        raise SystemExit("Requires isolated local PostgreSQL16 + dedicated nonzero Redis database")
    if User.objects.exists() or Level.objects.exists() or Class.objects.exists():
        raise SystemExit("Benchmark refuses a nonempty synthetic database")

    isolated_caches = copy.deepcopy(settings.CACHES)
    isolated_caches["default"]["KEY_PREFIX"] = f"classroom-benchmark-{uuid.uuid4()}"

    def seed(n, class_count, history):
        teacher = User.objects.create_user(
            email=f"bench-t-{n}-{class_count}-{history}@example.com",
            password="synthetic-benchmark-password",
            role=Role.TEACHER,
        )
        users = [
            User(email=f"bench-s-{n}-{class_count}-{history}-{i}@example.com", role=Role.STUDENT)
            for i in range(n + max(1, n // 5))
        ]
        User.objects.bulk_create(users)
        Profile.objects.bulk_create([
            Profile(user=u, display_name=f"Bench {i}", call_sign=f"bench-{i}")
            for i, u in enumerate(users)
        ])
        levels = [Level(order=i + 1, name=f"Bench L{i + 1}") for i in range(10)]
        Level.objects.bulk_create(levels)
        lessons = [
            Lesson(level=levels[0], order=i + 1, name=f"Bench lesson {i + 1}")
            for i in range(14)
        ]
        Lesson.objects.bulk_create(lessons)
        classes = [
            Class(name=f"Bench class {i:02}", teacher=teacher, join_code=f"B{class_count:02}{i:03}")
            for i in range(class_count)
        ]
        Class.objects.bulk_create(classes)
        relation = Class.assigned_levels.through
        relation.objects.bulk_create([
            relation(class_id=c.id, level_id=level.id) for c in classes for level in levels[:3]
        ])
        # Full overlap exposes multiplication/active-inactive membership errors.
        Enrollment.objects.bulk_create([
            Enrollment(class_room=c, student=u, is_active=i < n)
            for c in classes for i, u in enumerate(users)
        ])
        length = 2 if history == "short" else 20
        sessions = [
            ArenaSession(
                user=u, kind=SessionKind.ZEN, config_json={}, seed=j,
                questions_json=[], submitted_at=timezone.now(),
            )
            for u in users for j in range(length)
        ]
        ArenaSession.objects.bulk_create(sessions)
        records = [
            ProgressRecord(
                session=s, user_id=s.user_id, score_correct=1, score_total=2,
                accuracy_pct=50 if i % 2 else 90, time_taken_sec=1, xp_earned=10,
            )
            for i, s in enumerate(sessions)
        ]
        ProgressRecord.objects.bulk_create(records)
        best = {r.user_id: r for r in records}
        XPEvent.objects.bulk_create([
            XPEvent(user=u, event_type="SESSION_COMPLETE", delta=10)
            for u in users for _ in range(3)
        ])
        LevelCompletion.objects.bulk_create([
            LevelCompletion(user=u, level=level, kind="CLASSWORK", best_progress_record=best[u.id])
            for u in users for level in levels[:(1 if history == "short" else 8)]
        ])
        LessonCompletion.objects.bulk_create([
            LessonCompletion(
                user=u, lesson=lesson, kind=k, best_accuracy_pct=90, best_progress_record=best[u.id],
            )
            for u in users for lesson in lessons[:(1 if history == "short" else 14)]
            for k in ("CLASSWORK", "HOMEWORK")
        ])
        return teacher, classes, levels, {
            "users": len(users), "active_per_class": n, "inactive_per_class": len(users) - n,
            "classes": class_count, "progress_records": len(records),
            "lesson_completions": len(users) * (2 if history == "short" else 28),
        }

    def run_request(client, url, endpoint):
        durations = []

        def timed_execute(execute, sql, params, many, context):
            started = perf_counter()
            try:
                return execute(sql, params, many, context)
            finally:
                durations.append((perf_counter() - started) * 1000)

        with CaptureQueriesContext(connection) as captured, connection.execute_wrapper(timed_execute):
            started = perf_counter()
            response = client.get(url)
            elapsed = (perf_counter() - started) * 1000
        if response.status_code != 200:
            raise RuntimeError(f"Unexpected endpoint failure: {response.status_code}")
        queries = list(captured.captured_queries)
        auth = [
            q for q in queries
            if q["sql"].startswith("SELECT") and 'FROM "users_user" WHERE' in q["sql"]
        ]
        data = [q for q in queries if q["sql"].startswith("SELECT") and q not in auth]
        overhead = [q for q in queries if q not in auth and q not in data]
        payload = response.json()
        if endpoint == "list":
            values = {"student_counts": [row["student_count"] for row in payload]}
        elif endpoint == "roster":
            values = {
                "current_levels": dict(Counter(row["current_level"] for row in payload)),
                "accuracies": dict(Counter(str(row["accuracy_pct"]) for row in payload)),
            }
        else:
            values = {"classes": payload["classes"], "lesson_count": len(payload["lessons"])}
        rows = len(payload if isinstance(payload, list) else payload["classes"])
        plans, seen = [], set()
        for query in data:
            shape = re.sub(r"'[a-f0-9-]{32,36}'|\b\d+\b", "?", query["sql"])
            if shape in seen:
                continue
            seen.add(shape)
            with connection.cursor() as cursor:
                cursor.execute("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + query["sql"])
                plans.append({"sql": query["sql"], "plan": cursor.fetchone()[0]})
        return {
            "sql_total": len(queries), "data_queries": len(data), "auth_queries": len(auth),
            "transaction_queries": len(overhead), "sql_ms": round(sum(durations), 3),
            "endpoint_ms": round(elapsed, 3), "non_sql_endpoint_ms": round(elapsed - sum(durations), 3),
            "response_rows": rows, "values": values, "representative_query_plans": plans,
        }

    output = {
        "application_commit": sys.argv[2],
        "measurement_label": os.environ.get("BOLT_CLASSROOM_MEASUREMENT_LABEL", "candidate"),
        "unchanged_runtime_baseline_commit": os.environ.get("BOLT_CLASSROOM_RUNTIME_BASELINE_SHA"),
        "postgres_version": connection.pg_version,
        "cache_note": "Cold/warm are isolated Redis application-cache conditions; PostgreSQL buffers are not reset. Timings are local/CI observations, not production estimates. Requests run inside a rolled-back outer transaction; savepoint overhead is reported separately from data SQL.",
        "scenarios": [],
    }
    with override_settings(CACHES=isolated_caches):
        info = cache.client.get_client().info("server")
        output["redis_version"] = info["redis_version"]
        if not info["redis_version"].startswith("7."):
            raise SystemExit("Benchmark requires Redis7")
        try:
            for n in (5, 10, 50, 150):
                for count in (1, 5, 20):
                    for history in ("short", "long"):
                        with transaction.atomic():
                            teacher, classes, levels, sizes = seed(n, count, history)
                            # Refresh planner statistics outside request timing/capture.
                            with connection.cursor() as cursor:
                                for model in (
                                    User, Profile, Class, Enrollment, Class.assigned_levels.through,
                                    Level, Lesson, ArenaSession, ProgressRecord, XPEvent,
                                    LevelCompletion, LessonCompletion,
                                ):
                                    cursor.execute(f"ANALYZE {connection.ops.quote_name(model._meta.db_table)}")
                            client = APIClient()
                            client.credentials(HTTP_AUTHORIZATION=f"Bearer {AccessToken.for_user(teacher)}")
                            row = {"students": n, "classes": count, "history": history, "fixture_rows": sizes, "endpoints": {}}
                            urls = {
                                "list": reverse("class-list-create"),
                                "roster": reverse("class-roster", kwargs={"pk": classes[0].id}),
                                "matrix": reverse("teacher-level-dashboard", kwargs={"level_id": levels[0].id}),
                            }
                            for name, url in urls.items():
                                cache.delete_pattern("*")
                                row["endpoints"][name] = {
                                    "cold": run_request(client, url, name),
                                    "warm": run_request(client, url, name),
                                }
                            output["scenarios"].append(row)
                            print(f"{n}/{count}/{history}: " + ", ".join(
                                f"{name}={value['cold']['data_queries']}/{value['warm']['data_queries']}"
                                for name, value in row["endpoints"].items()
                            ), flush=True)
                            transaction.set_rollback(True)
        finally:
            cache.delete_pattern("*")
    Path(sys.argv[1]).write_text(json.dumps(output, indent=2, default=str))


if __name__ == "__main__":
    main()
