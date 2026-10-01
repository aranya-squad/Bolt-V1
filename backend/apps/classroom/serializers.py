from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from .models import Class, Enrollment


class ClassSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()

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
        ]
        read_only_fields = ["id", "join_code", "created_at", "student_count"]

    def get_student_count(self, obj):
        if hasattr(obj, "active_student_count"):
            return obj.active_student_count
        # Single-object create/patch/join responses do not have list annotations.
        return Enrollment.objects.using("default").filter(class_room_id=obj.id, is_active=True).count()


class ClassCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Class
        fields = ["name"]

    def create(self, validated_data):
        return Class.objects.create(teacher=self.context["request"].user, **validated_data)


class ClassPatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Class
        fields = ["name", "live_session_link", "is_active"]


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
