import random

from .base import Question, QuestionGenerator

# Minimum elapsed ms before we accept a submission (anti-cheat: catches bot submissions)
MIN_ANSWER_MS = 200


class ProceduralGenerator(QuestionGenerator):
    """
    Generates arithmetic questions from runtime config.
    Used by Practice sessions (Custom, Time Attack, Zen, Flash Cards).

    Config keys:
        operation:      ADD | SUB | MUL | DIV
        digits:         int (1–4) — digit count of each operand
        rows:           int (2–8) — number of operands
        question_count: int
    """

    def __init__(self, seed: int, config: dict):
        self.rng = random.Random(seed)
        self.config = config

    def generate(self) -> list[Question]:
        return [self._one(i) for i in range(self.config["question_count"])]

    def _one(self, _idx: int) -> Question:
        op = self.config["operation"]
        digits = self.config.get("digits", 2)
        rows = self.config.get("rows", 2)

        lo = 10 ** (digits - 1)
        hi = 10**digits - 1
        operands = [self.rng.randint(lo, hi) for _ in range(rows)]

        if op == "ADD":
            answer = sum(operands)
            text = " + ".join(map(str, operands))
        elif op == "SUB":
            # Sort descending so result is non-negative (appropriate for ages 5–10)
            operands.sort(reverse=True)
            answer = operands[0] - sum(operands[1:])
            if answer < 0:
                answer = abs(answer)
            text = " - ".join(map(str, operands))
        elif op == "MUL":
            # Limit to 2 operands for multiplication to keep difficulty sane at v1
            a, b = operands[0], operands[1]
            answer = a * b
            text = f"{a} × {b}"
        elif op == "DIV":
            # Generate dividend from a clean multiple to avoid remainders
            divisor = self.rng.randint(lo, hi)
            quotient = self.rng.randint(1, hi // max(divisor, 1) or 1)
            dividend = divisor * quotient
            answer = quotient
            text = f"{dividend} ÷ {divisor}"
        else:
            raise ValueError(f"Unknown operation: {op}")

        return Question(text=text, answer=answer, operation=op)
