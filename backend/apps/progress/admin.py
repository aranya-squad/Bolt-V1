from django.contrib import admin

from .models import LevelCompletion, ProgressRecord, QuestionAttempt, XPEvent


class ReadOnlyAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ProgressRecord)
class ProgressRecordAdmin(ReadOnlyAdmin):
    list_display = ["user", "session", "score_correct", "score_total", "accuracy_pct", "xp_earned", "created_at"]
    list_filter = ["session__kind"]
    raw_id_fields = ["user", "session"]


@admin.register(QuestionAttempt)
class QuestionAttemptAdmin(ReadOnlyAdmin):
    list_display = ["session", "question_index", "is_correct", "elapsed_ms", "submitted_at"]
    list_filter = ["is_correct"]
    raw_id_fields = ["session"]


@admin.register(XPEvent)
class XPEventAdmin(ReadOnlyAdmin):
    list_display = ["user", "event_type", "delta", "created_at"]
    list_filter = ["event_type"]
    raw_id_fields = ["user", "source_session"]


@admin.register(LevelCompletion)
class LevelCompletionAdmin(ReadOnlyAdmin):
    list_display = ["user", "level", "kind", "first_completed_at"]
    list_filter = ["kind"]
    raw_id_fields = ["user", "level", "best_progress_record"]
