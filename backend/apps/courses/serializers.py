from rest_framework import serializers

from .models import Level, Lesson


class LessonDetailSerializer(serializers.Serializer):
    """Read-only lesson detail with per-user completion data injected from view context."""
    id = serializers.UUIDField()
    order = serializers.IntegerField()
    name = serializers.CharField()
    description = serializers.CharField()
    classwork_completed = serializers.BooleanField()
    classwork_accuracy_pct = serializers.FloatField(allow_null=True)
    homework_completed = serializers.BooleanField()
    is_locked = serializers.BooleanField()


class LevelSerializer(serializers.ModelSerializer):
    is_locked = serializers.SerializerMethodField()
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = Level
        fields = ["id", "order", "name", "description", "xp_threshold", "is_advanced", "is_locked", "is_completed"]

    def get_is_completed(self, level):
        completed_ids = self.context.get("completed_level_ids", set())
        return str(level.id) in completed_ids

    def get_is_locked(self, level):
        if level.order == 1:
            return False
        ordered_ids = self.context.get("ordered_level_ids", [])
        completed_ids = self.context.get("completed_level_ids", set())
        try:
            idx = ordered_ids.index(str(level.id))
        except ValueError:
            return True
        if idx == 0:
            return False
        prev_id = ordered_ids[idx - 1]
        return prev_id not in completed_ids
