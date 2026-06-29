import factory
from factory.django import DjangoModelFactory

from apps.users.models import Profile, Role, User


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    password = factory.PostGenerationMethodCall("set_password", "testpass123")
    role = Role.STUDENT
    is_active = True


class GuardianFactory(UserFactory):
    role = Role.GUARDIAN
    email = factory.Sequence(lambda n: f"guardian{n}@example.com")


class TeacherFactory(UserFactory):
    role = Role.TEACHER
    email = factory.Sequence(lambda n: f"teacher{n}@example.com")


class ProfileFactory(DjangoModelFactory):
    class Meta:
        model = Profile

    user = factory.SubFactory(UserFactory)
    display_name = factory.Sequence(lambda n: f"User {n}")
    locale = "en"
