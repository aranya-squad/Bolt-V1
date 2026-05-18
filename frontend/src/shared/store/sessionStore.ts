import { create } from "zustand";
import type { AttemptVerdict, SessionQuestion } from "@/shared/types";

interface SessionState {
  sessionId: string | null;
  questions: SessionQuestion[];
  currentIndex: number;
  verdicts: AttemptVerdict[];
  timerMs: number;

  startSession: (sessionId: string, questions: SessionQuestion[], timeLimitMs: number) => void;
  recordVerdict: (verdict: AttemptVerdict) => void;
  nextQuestion: () => void;
  tickTimer: (elapsedMs: number) => void;
  clearSession: () => void;
}

const INITIAL: Pick<
  SessionState,
  "sessionId" | "questions" | "currentIndex" | "verdicts" | "timerMs"
> = {
  sessionId: null,
  questions: [],
  currentIndex: 0,
  verdicts: [],
  timerMs: 0,
};

export const useSessionStore = create<SessionState>()((set) => ({
  ...INITIAL,
  startSession: (sessionId, questions, timeLimitMs) =>
    set({ sessionId, questions, currentIndex: 0, verdicts: [], timerMs: timeLimitMs }),
  recordVerdict: (verdict) =>
    set((s) => ({ verdicts: [...s.verdicts, verdict] })),
  nextQuestion: () =>
    set((s) => ({ currentIndex: s.currentIndex + 1 })),
  tickTimer: (elapsedMs) =>
    set((s) => ({ timerMs: Math.max(0, s.timerMs - elapsedMs) })),
  clearSession: () => set(INITIAL),
}));
