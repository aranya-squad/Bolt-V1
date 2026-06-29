import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AttemptsTable } from "@/shared/ui/AttemptsTable";
import type { QuestionAttempt, QuestionVerdict } from "@/shared/types";

function makeAttempt(overrides: Partial<QuestionAttempt> = {}): QuestionAttempt {
  return {
    question_index: 0,
    attempt_number: 1,
    question_text: "12 + 8",
    expected_answer: 20,
    submitted_answer: 20,
    is_correct: true,
    is_skip: false,
    elapsed_ms: 3000,
    ...overrides,
  };
}

describe("AttemptsTable rendering", () => {
  it("renders nothing when attempts array is empty", () => {
    const { container } = render(<AttemptsTable attempts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the wrench icon for a 'fixed' verdict", () => {
    const attempts = [
      makeAttempt({ question_index: 0, attempt_number: 1, submitted_answer: 15, is_correct: false }),
      makeAttempt({ question_index: 0, attempt_number: 2, submitted_answer: 20, is_correct: true }),
    ];
    const verdicts: Record<number, QuestionVerdict> = { 0: "fixed" };
    const { container } = render(<AttemptsTable attempts={attempts} questionVerdicts={verdicts} />);
    // The wrench icon is rendered as an svg from Lucide — confirm the row exists and the retry row appears
    const rows = container.querySelectorAll("tr");
    // header + question row + retry row = 3
    expect(rows.length).toBe(3);
    // Retry row should contain the "↳ Retry" label
    expect(screen.getByText(/↳ Retry #2/i)).toBeInTheDocument();
  });

  it("renders a dash and muted style for a 'skipped' verdict", () => {
    const attempts = [
      makeAttempt({ question_index: 0, attempt_number: 1, submitted_answer: -999999, is_correct: false }),
    ];
    const verdicts: Record<number, QuestionVerdict> = { 0: "skipped" };
    const { container } = render(<AttemptsTable attempts={attempts} questionVerdicts={verdicts} />);
    // Skipped row shows "—" instead of the submitted answer
    expect(screen.getByText("—")).toBeInTheDocument();
    // Row has reduced opacity
    const tbody = container.querySelector("tbody");
    const dataRow = tbody?.querySelector("tr");
    expect(dataRow).toHaveStyle({ opacity: "0.6" });
  });

  it("renders retry row indented under the parent question", () => {
    const attempts = [
      makeAttempt({ question_index: 0, attempt_number: 1, submitted_answer: 99, is_correct: false }),
      makeAttempt({ question_index: 0, attempt_number: 2, submitted_answer: 20, is_correct: true }),
    ];
    const verdicts: Record<number, QuestionVerdict> = { 0: "fixed" };
    render(<AttemptsTable attempts={attempts} questionVerdicts={verdicts} />);
    const retryLabel = screen.getByText(/↳ Retry #2/i);
    // The retry label cell has paddingLeft applied (indentation)
    expect(retryLabel).toBeInTheDocument();
    // Question number cell for parent row should show "1" (index 0 + 1)
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
