from django.contrib import admin

from .models import ArenaSession, ExerciseTemplate


@admin.register(ExerciseTemplate)
class ExerciseTemplateAdmin(admin.ModelAdmin):
    list_display = ["lesson", "kind", "question_count", "time_limit_sec"]
    list_filter = ["kind"]


@admin.register(ArenaSession)
class ArenaSessionAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "kind", "started_at", "submitted_at", "abandoned_at"]
    list_filter = ["kind"]
    raw_id_fields = ["user", "template"]
    readonly_fields = ["id", "seed", "questions_json", "started_at"]

    def has_change_permission(self, request, obj=None):
        # Sessions are immutable after creation
        return False
