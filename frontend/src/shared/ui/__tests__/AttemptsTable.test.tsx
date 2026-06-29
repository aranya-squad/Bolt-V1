import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AttemptsTable } from "../AttemptsTable";
import type { QuestionAttempt, QuestionVerdict } from "@/shared/types";

function makeAttempt(overrides: Partial<QuestionAttempt> = {}): QuestionAttempt {
  return {
    question_index: 0,
    attempt_number: 1,
    question_text: "  12\n+  8",
    expected_answer: 20,
    submitted_answer: 20,
    is_correct: true,
    is_skip: false,
    elapsed_ms: 5000,
    ...overrides,
  };
}

describe("AttemptsTable rendering", () => {
  it("renders nothing for empty attempts", () => {
    const { container } = render(<AttemptsTable attempts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the correct answer column value", () => {
    render(<AttemptsTable attempts={[makeAttempt({ submitted_answer: 20, expected_answer: 20 })]} />);
    // Two "20"s — submitted and expected — both appear
    const cells = screen.getAllByText("20");
    expect(cells.length).toBeGreaterThanOrEqual(2);
  });

  it("renders wrench icon for fixed verdict", () => {
    const attempts = [makeAttempt({ question_index: 0 })];
    const verdicts: Record<number, QuestionVerdict> = { 0: "fixed" };
    const { container } = render(
      <AttemptsTable attempts={attempts} questionVerdicts={verdicts} />
    );
    // wrench SVG should be present
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("renders retry row indented under parent question", () => {
    const attempts = [
      makeAttempt({ question_index: 0, attempt_number: 1, is_correct: false, submitted_answer: 15 }),
      makeAttempt({ question_index: 0, attempt_number: 2, is_correct: true,  submitted_answer: 20 }),
    ];
    const verdicts: Record<number, QuestionVerdict> = { 0: "fixed" };
    render(<AttemptsTable attempts={attempts} questionVerdicts={verdicts} />);
    expect(screen.getByText(/Retry #2/)).toBeTruthy();
  });

  it("renders skipped question with dash and muted style", () => {
    const attempts = [
      makeAttempt({ question_index: 0, submitted_answer: -999999, is_correct: false }),
    ];
    const verdicts: Record<number, QuestionVerdict> = { 0: "skipped" };
    render(<AttemptsTable attempts={attempts} questionVerdicts={verdicts} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("renders multiple questions", () => {
    const attempts = [
      makeAttempt({ question_index: 0, expected_answer: 20, submitted_answer: 20 }),
      makeAttempt({ question_index: 1, expected_answer: 62, submitted_answer: 62 }),
    ];
    render(<AttemptsTable attempts={attempts} />);
    // Row numbers 1 and 2 should appear
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });
});
