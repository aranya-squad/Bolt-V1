import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import InArenaPage from "../InArenaPage";
import ClassworkPage from "@/features/learn/ClassworkPage";
import { apiClient } from "@/shared/api/client";
import { useSessionStore } from "@/shared/store/sessionStore";
import { useAuthStore } from "@/shared/store/authStore";
import { storageKey } from "@/shared/store/answerRecovery";
import type { PendingAttempt } from "@/shared/store/answerRecovery";
import type { AcceptedReceipt, SessionMeta } from "@/shared/types";

const USER = { id: "ui-learner", email: "synthetic@example.test", role: "STUDENT" as const, profile: null };
function meta(kind: SessionMeta["kind"] = "ZEN"): SessionMeta {
  return {
    session_id: "ui-session", kind, attempt_contract_version: 2, state: "active", is_test_mode: false,
    level_id: kind === "CLASSWORK" ? "l1" : null, lesson_id: null,
    started_at: new Date(Date.now() - 10000).toISOString(), server_now: new Date().toISOString(),
    questions: [0, 1].map(index => ({ index, text: `${index + 1}+1`, operation: "ADD", ...(kind === "CLASSWORK" ? {} : { answer: index + 2 }) })),
    time_limit_sec: 0, flash_speed_ms: kind === "FLASH_CARDS" ? 2000 : null,
    question_states: [0, 1].map(question_index => ({ question_index, max_attempt_number: 0, attempt_count: 0, terminal: false, latest_receipt: null })),
  };
}
function accepted(a: PendingAttempt): AcceptedReceipt {
  return { contract_version: 2, accepted: true, question_index: a.question_index, attempt_number: a.attempt_number, submitted_answer: a.answer, elapsed_ms: a.elapsed_ms, is_skip: a.is_skip, is_correct: !a.is_skip && a.answer === a.question_index + 2, xp_delta: 0 };
}
const unavailable = () => new AxiosError("network dropped", "ERR_NETWORK");
function page(classwork = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = render(<StrictMode><QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[classwork ? "/learn/level/l1/classwork" : "/practice/session/ui-session"]}><Routes>
    <Route path="/learn/level/:levelId/classwork" element={<ClassworkPage />} />
    <Route path="/practice/session/:sessionId" element={<InArenaPage />} />
    <Route path="/practice/victory/:sessionId" element={<p>Confirmed victory</p>} />
    <Route path="/learn/level/:levelId/report/:sessionId" element={<p>Confirmed report</p>} />
  </Routes></MemoryRouter></QueryClientProvider></StrictMode>);
  return view;
}
async function tick(ms = 1) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-01T12:00:00Z")); sessionStorage.clear();
  useSessionStore.getState().clearSession(); useAuthStore.setState({ user: USER, accessToken: "synthetic-ui-token", isHydrating: false });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); useSessionStore.getState().clearSession(); });

describe("observable recovery in existing gameplay pages", () => {
  it("UI-01/04: classwork lost skip response stays on question; remount restores accepted verdict then advances", async () => {
    const m = meta("CLASSWORK");
    useSessionStore.getState().initialize(USER.id, m, "learn:l1:");
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: m });
    const post = vi.spyOn(apiClient, "post").mockRejectedValue(unavailable());
    const view = page(true); await tick(); await tick(250);
    fireEvent.click(screen.getByRole("button", { name: "Skip question" })); await tick();
    expect(screen.getByText(/Q 1 \/ 2/)).toBeInTheDocument();
    expect(screen.queryByText("SKIPPED")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Save failed");
    expect(screen.getByRole("button", { name: "SUBMIT" })).toBeDisabled();
    const item = useSessionStore.getState().recovery!.pending[0];
    m.question_states![0] = { question_index: 0, max_attempt_number: 1, attempt_count: 1, terminal: true, latest_receipt: accepted(item) };
    view.unmount(); useSessionStore.getState().clearSession(); page(true); await tick();
    expect(screen.getByText("SKIPPED")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "NEXT" }));
    expect(screen.getByText(/Q 2 \/ 2/)).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1); // StrictMode did not create a second write/start.
  });
  it("UI-02: practice keeps immediate wrong feedback and replay-safe wrong/correct buffer while offline", async () => {
    const m = meta(); vi.spyOn(apiClient, "get").mockResolvedValue({ data: m });
    vi.spyOn(apiClient, "post").mockRejectedValue(unavailable());
    page(); await tick(); await tick(250);
    fireEvent.change(screen.getByPlaceholderText("Answer"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "SUBMIT" })); await tick();
    expect(screen.getByText("RECALCULATE")).toBeInTheDocument();
    await tick(600); expect(screen.queryByText("RECALCULATE")).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Answer"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "SUBMIT" }));
    expect(screen.getByText("CORRECT!")).toBeInTheDocument();
    const pending = useSessionStore.getState().recovery!.pending;
    expect(pending.map(a => [a.answer, a.attempt_number])).toEqual([[1, 1], [2, 2]]);
    expect(screen.queryByText("Confirmed victory")).not.toBeInTheDocument();
  });
  it("UI-04: remount feedback uses the remaining deadline and does not reset wrong retry identity", async () => {
    const m = meta(); useSessionStore.getState().initialize(USER.id, m, "practice:ui-session");
    useSessionStore.getState().enqueue(1, false, { isCorrect: false, wasSkip: false, accepted: false });
    useSessionStore.getState().suspend(); // keeps this test focused on restored display, no write can clear it.
    const state = useSessionStore.getState().recovery!;
    sessionStorage.setItem(storageKey(USER.id, m.session_id), JSON.stringify({ ...state, feedbackUntil: Date.now() + 200 }));
    useSessionStore.getState().clearSession();
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: m }); vi.spyOn(apiClient, "post").mockRejectedValue(unavailable());
    page(); await tick(); expect(screen.getByText("RECALCULATE")).toBeInTheDocument();
    await tick(199); expect(screen.queryByText("RECALCULATE")).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Answer"), { target: { value: "2" } }); fireEvent.click(screen.getByRole("button", { name: "SUBMIT" }));
    expect(useSessionStore.getState().recovery!.pending[1].attempt_number).toBe(2);
  });
  it("UI-04: flash reload advances only the displayed expired card, never unseen cards", async () => {
    const m = meta("FLASH_CARDS"); useSessionStore.getState().initialize(USER.id, m, "practice:ui-session");
    useSessionStore.getState().update({ flashDeadline: Date.now() - 10000 });
    useSessionStore.getState().clearSession();
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: m }); vi.spyOn(apiClient, "post").mockRejectedValue(unavailable());
    page(); await tick(); await tick();
    expect(screen.getByText(/Q 2 \/ 2/)).toBeInTheDocument();
    expect(useSessionStore.getState().recovery!.pending).toHaveLength(1);
    await tick(1000); expect(useSessionStore.getState().recovery!.pending).toHaveLength(1);
  });
  it("UI-05: expired timer freezes input, retains failed writes and never redirects to success", async () => {
    const m = meta("TIME_ATTACK"); m.time_limit_sec = 9;
    useSessionStore.getState().initialize(USER.id, m, "practice:ui-session");
    useSessionStore.getState().enqueue(2, false);
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: m }); const post = vi.spyOn(apiClient, "post").mockRejectedValue(unavailable());
    page(); await tick(); await tick();
    expect(screen.getByRole("button", { name: "SUBMIT" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Retry finish" })).toBeInTheDocument();
    expect(screen.queryByText("Confirmed victory")).not.toBeInTheDocument();
    expect(post.mock.calls.every(([url]) => url.includes("attempts/bulk"))).toBe(true);
    expect(useSessionStore.getState().recovery!.manifest).toHaveLength(1);
  });
  it("UI-05: finalize failure unlocks retry action; only confirmed v2 result navigates", async () => {
    const m = meta(); m.questions = m.questions.slice(0, 1); m.question_states = m.question_states!.slice(0, 1);
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: m });
    const post = vi.spyOn(apiClient, "post").mockImplementation(async (url, body) => {
      if (url.includes("attempts/bulk")) return { data: { contract_version: 2, verdicts: (body as { attempts: PendingAttempt[] }).attempts.map(accepted) } };
      throw new AxiosError("failed", "ERR_BAD_RESPONSE", undefined, undefined, { status: 503, statusText: "failed", data: {}, headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() } });
    });
    page(); await tick(); await tick(250);
    fireEvent.change(screen.getByPlaceholderText("Answer"), { target: { value: "2" } }); fireEvent.click(screen.getByRole("button", { name: "SUBMIT" }));
    await tick(600); await tick();
    expect(screen.getByRole("button", { name: "Retry finish" })).toBeInTheDocument();
    expect(screen.queryByText("Confirmed victory")).not.toBeInTheDocument();
    post.mockResolvedValue({ data: { contract_version: 2, id: "r1", session_id: m.session_id, created_at: new Date().toISOString(), score_correct: 1, score_total: 1, accuracy_pct: 100, time_taken_sec: 11, xp_earned: 10 } });
    fireEvent.click(screen.getByRole("button", { name: "Retry finish" })); await tick();
    expect(screen.getByText("Confirmed victory")).toBeInTheDocument();
  });
  it("UI-02: corrupt storage is visible and never described as saved locally", async () => {
    sessionStorage.setItem(storageKey(USER.id, "ui-session"), "not-json");
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: meta() }); page(); await tick();
    expect(screen.getByRole("status")).toHaveTextContent("Reload recovery is unavailable or damaged");
    expect(screen.getByRole("status")).not.toHaveTextContent("saved locally");
  });
});
