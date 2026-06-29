from rest_framework import serializers

from .models import Profile, User


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["display_name", "call_sign", "avatar_url", "locale", "timezone"]


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


class StudentRegisterSerializer(serializers.Serializer):
    """
    Guardian-only: create a child sub-account.
    Students log in with call_sign + PIN — no email ever required or shown.
    An internal email is auto-generated so the User model constraint is satisfied.
    PIN must be exactly 4 digits.
    """

    call_sign = serializers.CharField(max_length=64)
    pin = serializers.CharField(write_only=True, min_length=4, max_length=4)
    date_of_birth = serializers.DateField()

    def validate_pin(self, value: str) -> str:
        if not value.isdigit():
            raise serializers.ValidationError("PIN must be exactly 4 digits.")
        return value

    def validate_call_sign(self, value: str) -> str:
        if Profile.objects.filter(call_sign__iexact=value).exists():
            raise serializers.ValidationError("This call sign is already taken.")
        return value

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
        import re
        import uuid
        call_sign = validated_data["call_sign"]
        pin = validated_data["pin"]
        dob = validated_data["date_of_birth"]
        # Internal-only email — never shown or used for login
        slug = re.sub(r"[^a-z0-9]", "", call_sign.lower())
        internal_email = f"{slug}-{uuid.uuid4().hex[:6]}@students.boltabacus.internal"
        user = User.objects.create_user(
            email=internal_email,
            password=pin,
            role="STUDENT",
            date_of_birth=dob,
        )
        Profile.objects.create(user=user, display_name=call_sign, call_sign=call_sign)
        return user
