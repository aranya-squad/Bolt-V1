import factory
from factory.django import DjangoModelFactory

from apps.courses.models import Level, Lesson
from apps.exercises.models import ArenaSession, ExerciseTemplate, SessionKind
from apps.users.tests.factories import UserFactory

_SIMPLE_QUESTIONS = [
    {"text": "1 + 1", "answer": 2, "operation": "ADD"},
    {"text": "2 + 3", "answer": 5, "operation": "ADD"},
    {"text": "4 + 5", "answer": 9, "operation": "ADD"},
]
_SIMPLE_CONFIG = {"operation": "ADD", "digits": 1, "rows": 2, "question_count": 3}


class LevelFactory(DjangoModelFactory):
    class Meta:
        model = Level

    order = factory.Sequence(lambda n: n + 1)
    name = factory.Sequence(lambda n: f"Level {n + 1}")
    description = ""


class LessonFactory(DjangoModelFactory):
    class Meta:
        model = Lesson

    level = factory.SubFactory(LevelFactory)
    order = 1
    name = "Lesson 1"


class ExerciseTemplateFactory(DjangoModelFactory):
    class Meta:
        model = ExerciseTemplate

    lesson = factory.SubFactory(LessonFactory)
    kind = SessionKind.CLASSWORK
    question_count = 3
    time_limit_sec = 120
    config_json = factory.LazyAttribute(lambda _: dict(_SIMPLE_CONFIG))


class ArenaSessionFactory(DjangoModelFactory):
    class Meta:
        model = ArenaSession

    user = factory.SubFactory(UserFactory)
    kind = SessionKind.CLASSWORK
    template = factory.SubFactory(ExerciseTemplateFactory)
    config_json = factory.LazyAttribute(lambda _: dict(_SIMPLE_CONFIG))
    seed = 42
    questions_json = factory.LazyAttribute(lambda _: list(_SIMPLE_QUESTIONS))
