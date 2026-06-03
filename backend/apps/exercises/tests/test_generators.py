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


def test_sub_answer_always_non_negative():
    """Constructive generation must never produce a negative answer for any rows/digits combo."""
    for seed in range(100):
        for rows in range(2, 9):
            for digits in range(1, 5):
                g = ProceduralGenerator(seed=seed, config=_config(op="SUB", rows=rows, digits=digits, count=5))
                for q in g.generate():
                    assert q.answer >= 0, f"Negative answer {q.answer} for seed={seed} rows={rows} digits={digits}: {q.text}"


def test_sub_text_matches_answer():
    """The displayed expression must equal the computed answer — would have caught the original abs() bug."""
    for seed in range(50):
        for rows in range(2, 6):
            g = ProceduralGenerator(seed=seed, config=_config(op="SUB", rows=rows, count=5))
            for q in g.generate():
                parts = [int(x.strip()) for x in q.text.split("-")]
                expected = parts[0] - sum(parts[1:])
                assert expected == q.answer, f"Text={q.text!r} answer={q.answer} expected={expected}"


def test_mul_uses_exactly_two_operands():
    """MUL questions must contain exactly one × and match the product."""
    g = ProceduralGenerator(seed=42, config=_config(op="MUL", rows=5, count=20))
    for q in g.generate():
        assert q.text.count("×") == 1, f"Expected one × in {q.text!r}"
        a_str, b_str = q.text.split("×")
        assert int(a_str.strip()) * int(b_str.strip()) == q.answer


def test_div_quotient_variance():
    """1-digit DIV should produce at least 4 distinct quotients in 1000 questions."""
    g = ProceduralGenerator(seed=7, config=_config(op="DIV", digits=1, count=1000))
    quotients = {q.answer for q in g.generate()}
    assert len(quotients) >= 4, f"Only {len(quotients)} distinct quotients — variance too low"
