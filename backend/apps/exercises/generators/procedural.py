import random

from .base import Question, QuestionGenerator


class ProceduralGenerator(QuestionGenerator):
    """
    Generates arithmetic questions from runtime config.
    Used by Practice sessions (Custom, Time Attack, Zen, Flash Cards).

    Config keys:
        operation:      ADD | SUB | MUL | DIV | MIXED (MIXED picks ADD or SUB per question)
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
        # Resolve MIXED to a concrete operation per question so the stored
        # Question.operation reflects what was actually generated. Drawn only in
        # the MIXED branch so non-MIXED seeds keep an identical RNG sequence.
        if op == "MIXED":
            op = self.rng.choice(["ADD", "SUB"])
        digits = self.config.get("digits", 2)
        rows = self.config.get("rows", 2)

        lo = 10 ** (digits - 1)
        hi = 10**digits - 1

        if op == "ADD":
            operands = [self.rng.randint(lo, hi) for _ in range(rows)]
            answer = sum(operands)
            text = " + ".join(map(str, operands))
        elif op == "SUB":
            # Bounded generation: all operands including minuend stay in [lo, hi], answer >= 0.
            # When (rows-1)*lo > hi the constraint is infeasible; degrade to 2-operand subtraction.
            if (rows - 1) * lo > hi:
                a = self.rng.randint(lo, hi)
                b = self.rng.randint(lo, a)
                answer = a - b
                operands = [a, b]
            else:
                # Minuend must be >= lo*rows to leave room for rows-1 subtractors (each >= lo)
                # plus a non-negative answer; clamp to hi when lo*rows would exceed it.
                minuend = self.rng.randint(min(lo * rows, hi), hi)
                remaining = minuend
                subtractors = []
                for slots_left in range(rows - 1, 0, -1):
                    # Reserve lo for each subsequent slot so answer stays >= 0.
                    upper = min(hi, remaining - lo * (slots_left - 1))
                    sub = self.rng.randint(lo, max(lo, upper))
                    subtractors.append(sub)
                    remaining -= sub
                answer = remaining
                operands = [minuend] + subtractors
            text = " - ".join(map(str, operands))
        elif op == "MUL":
            # Per-row digit config (D-6): row 1 = multiplicand, row 2 = multiplier.
            # Falls back to `digits` for sessions created before D-6 (backward compat).
            d1 = self.config.get("digits_row1", digits)
            d2 = self.config.get("digits_row2", digits)
            lo1, hi1 = 10 ** (d1 - 1), 10**d1 - 1
            lo2, hi2 = 10 ** (d2 - 1), 10**d2 - 1
            a, b = self.rng.randint(lo1, hi1), self.rng.randint(lo2, hi2)
            answer = a * b
            text = f"{a} × {b}"
        elif op == "DIV":
            # Per-row digit config (D-6): row 2 = divisor digits. Dividend derived.
            # Falls back to `digits` for sessions created before D-6 (backward compat).
            d2 = self.config.get("digits_row2", digits)
            lo2, hi2 = 10 ** (d2 - 1), 10**d2 - 1
            divisor = self.rng.randint(lo2, hi2)
            quotient_hi = max(hi2 // max(divisor, 1), 5)
            quotient = self.rng.randint(1, quotient_hi)
            dividend = divisor * quotient
            answer = quotient
            text = f"{dividend} ÷ {divisor}"
        else:
            raise ValueError(f"Unknown operation: {op}")

        return Question(text=text, answer=answer, operation=op)
