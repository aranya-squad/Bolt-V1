from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from apps.courses.models import Level

from .models import Class, Enrollment


class ClassSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()
    assigned_level_ids = serializers.SerializerMethodField()

    class Meta:
        model = Class
        fields = [
            "id",
            "name",
            "join_code",
            "live_session_link",
            "is_active",
            "created_at",
            "student_count",
            "assigned_level_ids",
        ]
        read_only_fields = ["id", "join_code", "created_at", "student_count", "assigned_level_ids"]

    def get_student_count(self, obj):
        if hasattr(obj, "active_student_count"):
            return obj.active_student_count
        # Single-object create/patch/join responses do not have list annotations.
        return (
            Enrollment.objects.using("default").filter(class_room_id=obj.id, is_active=True).count()
        )

    def get_assigned_level_ids(self, obj):
        if hasattr(obj, "serialized_assigned_levels"):
            return [str(level.id) for level in obj.serialized_assigned_levels]
        # Explicit model query avoids related-manager router dispatch before
        # .using() and also keeps single-object responses primary-consistent.
        ids = (
            Class.assigned_levels.through.objects.using("default")
            .filter(class_id=obj.id)
            .order_by("level__order")
            .values_list("level_id", flat=True)
        )
        return [str(level_id) for level_id in ids]


class ClassCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Class
        fields = ["name"]

    def to_internal_value(self, data):
        if isinstance(data, dict) and "assigned_level_ids" in data:
            raise serializers.ValidationError(
                {
                    "assigned_level_ids": [
                        "Configure assigned levels through the owner PATCH after creating the class."
                    ],
                }
            )
        return super().to_internal_value(data)

    def create(self, validated_data):
        return Class.objects.using("default").create(
            teacher=self.context["request"].user, **validated_data
        )


class AssignmentUUIDField(serializers.UUIDField):
    def to_internal_value(self, data):
        if not isinstance(data, str):
            raise serializers.ValidationError("Each assigned level ID must be a UUID string.")
        return super().to_internal_value(data)


class AssignmentListField(serializers.ListField):
    def to_internal_value(self, data):
        if not isinstance(data, list):
            raise serializers.ValidationError("Expected an array of UUID strings.")
        return super().to_internal_value(data)


class ClassPatchSerializer(serializers.ModelSerializer):
    assigned_level_ids = AssignmentListField(child=AssignmentUUIDField(), required=False)

    class Meta:
        model = Class
        fields = ["name", "live_session_link", "is_active", "assigned_level_ids"]

    def validate_assigned_level_ids(self, ids):
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Duplicate assigned level IDs are not allowed.")
        known = set(Level.objects.using("default").filter(pk__in=ids).values_list("pk", flat=True))
        if known != set(ids):
            raise serializers.ValidationError("One or more assigned levels do not exist.")
        return ids

    def update(self, instance, validated_data):
        ids = validated_data.pop("assigned_level_ids", None)
        instance = super().update(instance, validated_data)
        if ids is not None:
            # The owner view holds this Class row lock and an explicit primary
            # transaction across scalar save and complete-set replacement.
            instance.assigned_levels.set(ids)
        return instance


class RosterStudentSerializer(serializers.Serializer):
    id = serializers.UUIDField(source="student.id")
    call_sign = serializers.SerializerMethodField()
    current_level = serializers.SerializerMethodField()
    accuracy_pct = serializers.SerializerMethodField()
    enrolled_at = serializers.DateTimeField()

    def get_call_sign(self, enrollment):
        try:
            p = enrollment.student.profile
            return p.call_sign or p.display_name or ""
        except ObjectDoesNotExist:
            return ""

    def get_current_level(self, enrollment):
        return min(self.context["level_counts"].get(enrollment.student_id, 0) + 1, 10)

    def get_accuracy_pct(self, enrollment):
        acc = self.context["accuracy"].get(enrollment.student_id)
        return round(float(acc), 1) if acc is not None else None


class JoinClassSerializer(serializers.Serializer):
    join_code = serializers.CharField(max_length=12)
