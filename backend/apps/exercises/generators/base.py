from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class Question:
    text: str
    answer: int
    operation: str

    def to_dict(self) -> dict:
        return {"text": self.text, "answer": self.answer, "operation": self.operation}


class QuestionGenerator(ABC):
    @abstractmethod
    def generate(self) -> list[Question]:
        """Generate the full question set for a session."""
