import { describe, it, expect } from "vitest";
import { resolveVerdictAction, type VerdictState } from "../verdictLogic";

function state(overrides: Partial<VerdictState> = {}): VerdictState {
  return {
    isCorrect: false,
    testMode: false,
    retriedThisQuestion: false,
    wasSkip: false,
    isLastQuestion: false,
    ...overrides,
  };
}

describe("resolveVerdictAction — verdict logic", () => {
  it("correct answer on first attempt → advance", () => {
    expect(resolveVerdictAction(state({ isCorrect: true }))).toBe("advance");
  });

  it("correct answer on last question → finalize", () => {
    expect(resolveVerdictAction(state({ isCorrect: true, isLastQuestion: true }))).toBe("finalize");
  });

  it("wrong answer, practice mode, no prior retry → retry", () => {
    expect(resolveVerdictAction(state({ isCorrect: false }))).toBe("retry");
  });

  it("wrong answer, practice mode, already retried → advance", () => {
    expect(resolveVerdictAction(state({ isCorrect: false, retriedThisQuestion: true }))).toBe("advance");
  });

  it("wrong answer then wrong again on last question → finalize", () => {
    expect(
      resolveVerdictAction(state({ isCorrect: false, retriedThisQuestion: true, isLastQuestion: true }))
    ).toBe("finalize");
  });

  it("wrong answer, test mode → advance immediately (no retry)", () => {
    expect(resolveVerdictAction(state({ isCorrect: false, testMode: true }))).toBe("advance");
  });

  it("wrong answer, test mode, last question → finalize immediately", () => {
    expect(
      resolveVerdictAction(state({ isCorrect: false, testMode: true, isLastQuestion: true }))
    ).toBe("finalize");
  });

  it("skip action (wasSkip) → advance without retry", () => {
    expect(resolveVerdictAction(state({ isCorrect: false, wasSkip: true }))).toBe("advance");
  });

  it("skip action on last question → finalize", () => {
    expect(
      resolveVerdictAction(state({ isCorrect: false, wasSkip: true, isLastQuestion: true }))
    ).toBe("finalize");
  });

  it("skip action in test mode → advance (test mode redundant but consistent)", () => {
    expect(
      resolveVerdictAction(state({ isCorrect: false, wasSkip: true, testMode: true }))
    ).toBe("advance");
  });

  it("correct answer on retry → advance", () => {
    expect(
      resolveVerdictAction(state({ isCorrect: true, retriedThisQuestion: true }))
    ).toBe("advance");
  });

  it("correct answer on retry, last question → finalize", () => {
    expect(
      resolveVerdictAction(state({ isCorrect: true, retriedThisQuestion: true, isLastQuestion: true }))
    ).toBe("finalize");
  });
});
