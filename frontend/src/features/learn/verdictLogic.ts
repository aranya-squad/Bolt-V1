// Pure verdict transition logic — extracted for unit testing.

export interface VerdictState {
  isCorrect: boolean;
  testMode: boolean;
  retriedThisQuestion: boolean;
  wasSkip: boolean;
  isLastQuestion: boolean;
}

export type VerdictAction = "retry" | "advance" | "finalize";

export function resolveVerdictAction(state: VerdictState): VerdictAction {
  const canRetry =
    !state.isCorrect &&
    !state.testMode &&
    !state.retriedThisQuestion &&
    !state.wasSkip;

  if (canRetry) return "retry";
  return state.isLastQuestion ? "finalize" : "advance";
}
