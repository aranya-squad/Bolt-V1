from django.db.models import Count, Max, Q
from django.utils import timezone
from rest_framework import serializers

from apps.progress.models import ProgressRecord, QuestionAttempt

from .attempt_contract import receipt, terminal
from .models import SessionKind

_PRACTICE_KINDS = frozenset([
    SessionKind.FLASH_CARDS,
    SessionKind.ZEN,
    SessionKind.TIME_ATTACK,
    SessionKind.CUSTOM,
])


class SessionMetaSerializer(serializers.Serializer):
    session_id = serializers.CharField(source="id")
    kind = serializers.CharField()
    is_test_mode = serializers.BooleanField()
    questions = serializers.SerializerMethodField()
    time_limit_sec = serializers.SerializerMethodField()
    flash_speed_ms = serializers.SerializerMethodField()
    attempt_contract_version = serializers.SerializerMethodField()
    state = serializers.SerializerMethodField()
    started_at = serializers.DateTimeField()
    server_now = serializers.SerializerMethodField()
    lesson_id = serializers.SerializerMethodField()
    level_id = serializers.SerializerMethodField()
    question_states = serializers.SerializerMethodField()

    def get_attempt_contract_version(self, session):
        return 1 if session.attempts.filter(attempt_number__isnull=True).exists() else 2

    def get_state(self, session):
        return "submitted" if session.submitted_at else "abandoned" if session.abandoned_at else "active"

    def get_server_now(self, session):
        return timezone.now().isoformat()

    def get_lesson_id(self, session):
        return str(session.template.lesson_id) if session.template else None

    def get_level_id(self, session):
        return str(session.template.lesson.level_id) if session.template else None

    def get_question_states(self, session):
        groups = {
            row["question_index"]: row
            for row in session.attempts.values("question_index").annotate(
                count=Count("id"), maximum=Max("attempt_number"), latest=Max("id"),
                has_terminal=Count("id", filter=Q(is_correct=True) | Q(is_skip=True)),
            )
        }
        latest = {a.pk: a for a in session.attempts.filter(pk__in=[g["latest"] for g in groups.values()])}
        states = []
        for index in range(len(session.questions_json)):
            group = groups.get(index, {})
            attempt = latest.get(group.get("latest"))
            count = group.get("count", 0)
            states.append({"question_index": index, "max_attempt_number": group.get("maximum") or 0,
                           "attempt_count": count, "terminal": terminal(session, count, group.get("has_terminal", 0)),
                           "latest_receipt": receipt(attempt) if attempt and attempt.attempt_number is not None else None})
        return states

    def get_questions(self, session):
        include_answer = session.kind in _PRACTICE_KINDS
        return [
            {
                "index": i,
                "text": q["text"],
                "operation": q["operation"],
                **({"answer": q["answer"]} if include_answer else {}),
            }
            for i, q in enumerate(session.questions_json)
        ]

    def get_time_limit_sec(self, session):
        if "time_limit_sec" in session.config_json:
            return session.config_json["time_limit_sec"]
        # Pre-recovery curated sessions did not freeze the template limit.
        if session.template is not None:
            return session.template.time_limit_sec
        return session.config_json.get("time_limit_sec", 600)

    def get_flash_speed_ms(self, session):
        if session.kind != SessionKind.FLASH_CARDS:
            return None
        return session.config_json.get("flash_speed_ms", 2000)


class ProgressRecordSerializer(serializers.ModelSerializer):
    accuracy_pct = serializers.FloatField()

    class Meta:
        model = ProgressRecord
        fields = ["id", "session_id", "score_correct", "score_total", "accuracy_pct", "time_taken_sec", "xp_earned", "created_at"]


class AttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionAttempt
        fields = ["question_index", "attempt_number", "question_text", "expected_answer", "submitted_answer", "is_correct", "is_skip", "elapsed_ms"]
