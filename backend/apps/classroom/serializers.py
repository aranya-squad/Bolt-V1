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
        return obj.enrollments.filter(is_active=True).count()


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
        except Exception:
            return ""

    def get_current_level(self, enrollment):
        from apps.users.stats import get_user_stats
        return get_user_stats(enrollment.student).get("current_level", 1)

    def get_accuracy_pct(self, enrollment):
        from django.db.models import Avg
        from apps.progress.models import ProgressRecord
        result = ProgressRecord.objects.filter(user=enrollment.student).aggregate(avg=Avg("accuracy_pct"))
        acc = result["avg"]
        return round(float(acc), 1) if acc is not None else None


class JoinClassSerializer(serializers.Serializer):
    join_code = serializers.CharField(max_length=12)
