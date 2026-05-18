import pytest

from apps.exercises.generators.procedural import ProceduralGenerator


def _config(op="ADD", digits=2, rows=3, count=10):
    return {"operation": op, "digits": digits, "rows": rows, "question_count": count}


def test_procedural_deterministic():
    """Same seed + config must produce identical questions."""
    g1 = ProceduralGenerator(seed=42, config=_config())
    g2 = ProceduralGenerator(seed=42, config=_config())
    assert [q.to_dict() for q in g1.generate()] == [q.to_dict() for q in g2.generate()]


def test_procedural_different_seeds_differ():
    g1 = ProceduralGenerator(seed=1, config=_config())
    g2 = ProceduralGenerator(seed=2, config=_config())
    assert [q.answer for q in g1.generate()] != [q.answer for q in g2.generate()]


def test_procedural_correct_count():
    g = ProceduralGenerator(seed=99, config=_config(count=30))
    assert len(g.generate()) == 30


def test_procedural_add_answer_correct():
    g = ProceduralGenerator(seed=7, config=_config(op="ADD"))
    for q in g.generate():
        operands = [int(x.strip()) for x in q.text.split("+")]
        assert sum(operands) == q.answer


def test_procedural_div_no_remainder():
    g = ProceduralGenerator(seed=5, config=_config(op="DIV"))
    for q in g.generate():
        dividend_str, divisor_str = q.text.split("÷")
        dividend = int(dividend_str.strip())
        divisor = int(divisor_str.strip())
        assert dividend % divisor == 0
        assert q.answer == dividend // divisor
