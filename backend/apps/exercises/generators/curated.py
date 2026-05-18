from .base import Question, QuestionGenerator
from .procedural import ProceduralGenerator


class CuratedGenerator(QuestionGenerator):
    """
    Generates questions from a curriculum-defined ExerciseTemplate.
    Delegates to ProceduralGenerator with the template's config_json.

    Future: curriculum_rules.py will add invariants per lesson
    (e.g., Level 2 Big Friend: additions that require tens-place regrouping).
    """

    def __init__(self, seed: int, template_config: dict):
        self._inner = ProceduralGenerator(seed=seed, config=template_config)

    def generate(self) -> list[Question]:
        return self._inner.generate()
