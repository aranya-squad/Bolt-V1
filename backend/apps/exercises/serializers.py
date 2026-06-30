from rest_framework import serializers

from apps.progress.models import ProgressRecord, QuestionAttempt

from .models import ArenaSession, SessionKind

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
