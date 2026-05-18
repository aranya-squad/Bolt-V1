from rest_framework import serializers

from .models import Profile, User


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["display_name", "avatar_url", "locale", "timezone"]


class UserMeSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    # TODO(debt): add HUD stats (total_xp, streak, level) once XPEvent model is ready

    class Meta:
        model = User
        fields = ["id", "email", "role", "profile"]
        read_only_fields = ["id", "email", "role"]


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
