import random

from .base import Question, QuestionGenerator


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

        if op == "ADD":
            operands = [self.rng.randint(lo, hi) for _ in range(rows)]
            answer = sum(operands)
            text = " + ".join(map(str, operands))
        elif op == "SUB":
            # Constructive generation: pick subtractors and answer first, compute minuend.
            # Guarantees answer >= 0 without rejection sampling (which can infinite-loop for
            # large rows with small digits, e.g. digits=1, rows=8 → all combos are negative).
            subtractors = [self.rng.randint(lo, hi) for _ in range(rows - 1)]
            answer = self.rng.randint(0, hi)
            minuend = sum(subtractors) + answer
            operands = [minuend] + subtractors
            text = " - ".join(map(str, operands))
        elif op == "MUL":
            # Exactly 2 operands for multiplication to keep difficulty sane at v1.
            a, b = self.rng.randint(lo, hi), self.rng.randint(lo, hi)
            answer = a * b
            text = f"{a} × {b}"
        elif op == "DIV":
            # Generate dividend from a clean multiple to avoid remainders.
            # quotient_hi raised to avoid collapsed range on 1-digit operands.
            divisor = self.rng.randint(lo, hi)
            quotient_hi = max(hi // max(divisor, 1), 5)
            quotient = self.rng.randint(1, quotient_hi)
            dividend = divisor * quotient
            answer = quotient
            text = f"{dividend} ÷ {divisor}"
        else:
            raise ValueError(f"Unknown operation: {op}")

        return Question(text=text, answer=answer, operation=op)
