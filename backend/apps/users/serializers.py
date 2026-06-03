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
        from apps.users.stats import get_user_stats
        return get_user_stats(user)


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

    def validate_date_of_birth(self, value):
        from datetime import date

        today = date.today()
        if value > today:
            raise serializers.ValidationError("Date of birth cannot be in the future.")
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age > 18:
            raise serializers.ValidationError("Student must be 18 or younger.")
        return value

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
