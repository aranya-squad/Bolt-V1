from rest_framework import serializers

from .models import Profile, User


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["display_name", "avatar_url", "locale", "timezone"]


class UserMeSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "role", "profile", "stats"]
        read_only_fields = ["id", "email", "role"]

    def get_profile(self, user):
        try:
            return ProfileSerializer(user.profile).data
        except Profile.DoesNotExist:
            return None

    def get_stats(self, user):
        from datetime import timedelta

        from django.db.models import Sum
        from django.utils import timezone

        from apps.progress.models import LevelCompletion, ProgressRecord, XPEvent

        total_xp = XPEvent.objects.filter(user=user).aggregate(t=Sum("delta"))["t"] or 0

        today = timezone.now().date()
        yesterday = today - timedelta(days=1)
        dates = set(
            ProgressRecord.objects.filter(user=user).values_list("created_at__date", flat=True)
        )
        start = today if today in dates else (yesterday if yesterday in dates else None)
        streak = 0
        if start is not None:
            d = start
            while d in dates:
                streak += 1
                d -= timedelta(days=1)

        levels_completed = LevelCompletion.objects.filter(user=user, kind="CLASSWORK").count()

        return {"total_xp": total_xp, "streak_days": streak, "levels_completed": levels_completed}


class GuardianRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=10)
    display_name = serializers.CharField(write_only=True, max_length=64)

    class Meta:
        model = User
        fields = ["email", "password", "display_name"]

    def create(self, validated_data):
        display_name = validated_data.pop("display_name")
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            role="GUARDIAN",
        )
        Profile.objects.create(user=user, display_name=display_name)
        return user


class StudentRegisterSerializer(serializers.ModelSerializer):
    """Guardian-only: create a child sub-account."""

    password = serializers.CharField(write_only=True, min_length=6)
    display_name = serializers.CharField(write_only=True, max_length=64)
    date_of_birth = serializers.DateField()

    class Meta:
        model = User
        fields = ["email", "password", "display_name", "date_of_birth"]

    def create(self, validated_data):
        display_name = validated_data.pop("display_name")
        dob = validated_data.pop("date_of_birth")
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            role="STUDENT",
            date_of_birth=dob,
        )
        Profile.objects.create(user=user, display_name=display_name)
        return user
