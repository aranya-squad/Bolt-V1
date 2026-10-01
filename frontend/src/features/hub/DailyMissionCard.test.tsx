import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError } from "axios";
import { DailyMissionCard } from "./DailyMissionCard";
import InArenaPage from "@/features/practice/InArenaPage";
import VictoryPage from "@/features/practice/VictoryPage";
import { apiClient } from "@/shared/api/client";
import { useAuthStore } from "@/shared/store/authStore";
import { useSessionStore } from "@/shared/store/sessionStore";
import { storageKey } from "@/shared/store/answerRecovery";
import type { PendingAttempt } from "@/shared/store/answerRecovery";
import type { AcceptedReceipt, DailyQuestMission, DailyQuestToday, ProgressRecord, SessionMeta } from "@/shared/types";

vi.mock("@/shared/ui/AmbientScene", () => ({ AmbientScene: () => null }));

const USER = { id: "mission-student", email: "synthetic@example.test", role: "STUDENT" as const, profile: null };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function mission(patch: Partial<DailyQuestMission> = {}): DailyQuestMission {
  return { id: "mission-today", date: "2026-10-01", timezone: "Asia/Kolkata", level_name: "Little Friend", level_order: 1, lesson_name: "Counting Up", lesson_order: 1, target: 5, progress: 0, state: "available", session_id: null, xp_earned: null, completed_at: null, ...patch };
}
function today(m: DailyQuestMission | null = mission(), previous: DailyQuestMission | null = null): DailyQuestToday {
  return { server_now: "2026-10-01T12:00:00Z", reset_at: "2026-10-01T18:30:00Z", timezone: "Asia/Kolkata", mission: m, previous_unfinished: previous, reason: m ? null : "no_eligible_content" };
}
function meta(patch: Partial<SessionMeta> = {}): SessionMeta {
  return { session_id: "mission-session", kind: "ZEN", attempt_contract_version: 2, state: "active", is_test_mode: true,
    daily_quest: mission({ state: "in_progress", session_id: "mission-session" }),
    started_at: "2026-10-01T11:59:00Z", server_now: "2026-10-01T12:00:00Z", time_limit_sec: 0, flash_speed_ms: null,
    questions: Array.from({ length: 5 }, (_, index) => ({ index, text: `${index + 1}+1`, answer: index + 2, operation: "ADD" })),
    question_states: Array.from({ length: 5 }, (_, question_index) => ({ question_index, max_attempt_number: 0, attempt_count: 0, terminal: false, latest_receipt: null })), ...patch };
}
function receipt(a: PendingAttempt): AcceptedReceipt {
  return { contract_version: 2, accepted: true, question_index: a.question_index, attempt_number: a.attempt_number, submitted_answer: a.answer, elapsed_ms: a.elapsed_ms, is_skip: a.is_skip, is_correct: a.answer === a.question_index + 2, xp_delta: 0 };
}
function page(path = "/hub") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = render(<StrictMode><QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/hub" element={<DailyMissionCard />} />
    <Route path="/practice/session/:sessionId" element={<InArenaPage />} />
    <Route path="/practice/victory/:sessionId" element={<VictoryPage />} />
  </Routes></MemoryRouter></QueryClientProvider></StrictMode>);
  return { ...view, client };
}
async function tick(ms = 1) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-01T12:00:00Z")); sessionStorage.clear();
  useSessionStore.getState().clearSession(); useAuthStore.setState({ user: USER, accessToken: "synthetic-token", isHydrating: false });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); useSessionStore.getState().clearSession(); });

describe("daily mission Hub states and identity", () => {
  it("shows loading then saved progress, context and one-tap resume", async () => {
    const m = mission({ state: "in_progress", session_id: "mission-session", progress: 2 });
    vi.spyOn(apiClient, "get").mockImplementation(async url => url.includes("today") ? new Promise(resolve => window.setTimeout(() => resolve({ data: today(m) }), 30)) : { data: meta() });
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({ data: meta() });
    page(); expect(screen.getByText("Loading your mission…")).toBeInTheDocument(); await tick(40);
    expect(screen.getByText("Practice 5 questions")).toBeInTheDocument(); expect(screen.getByText("Saved 2/5")).toBeInTheDocument();
    expect(screen.getByText(/Resets at local midnight · Asia\/Kolkata/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "RESUME MISSION" })); await tick(); await tick();
    expect(post.mock.calls[0].slice(0, 2)).toEqual(["/daily-quests/mission-today/start/", {}]);
    expect(screen.getByRole("heading", { name: /Bolt Mission · Practice 5 questions/ })).toBeInTheDocument();
  });
  it("load error is retryable and unavailable content keeps an honest empty state", async () => {
    const get = vi.spyOn(apiClient, "get").mockRejectedValue(new Error("offline")); page(); await tick();
    expect(screen.getByRole("alert")).toHaveTextContent("saved progress is kept");
    get.mockResolvedValue({ data: today(null) }); fireEvent.click(screen.getByRole("button", { name: "RETRY MISSION" })); await tick();
    expect(screen.getByText(/No mission available yet/)).toBeInTheDocument(); expect(screen.queryByRole("button", { name: "START MISSION" })).not.toBeInTheDocument();
  });
  it("lost start response retries the same mission and blocks duplicate taps", async () => {
    vi.spyOn(apiClient, "get").mockImplementation(async url => ({ data: url.includes("today") ? today() : meta() }));
    const post = vi.spyOn(apiClient, "post").mockRejectedValueOnce(new AxiosError("lost", "ERR_NETWORK")).mockImplementationOnce(() => new Promise(resolve => window.setTimeout(() => resolve({ data: meta() }), 40)));
    page(); await tick(); fireEvent.click(screen.getByRole("button", { name: "START MISSION" })); await tick();
    expect(screen.getByRole("alert")).toHaveTextContent("same session"); fireEvent.click(screen.getByRole("button", { name: "RETRY OPENING MISSION" })); await tick();
    expect(screen.getByRole("button", { name: "OPENING…" })).toBeDisabled(); await tick(50);
    expect(post.mock.calls.map(([url]) => url)).toEqual(["/daily-quests/mission-today/start/", "/daily-quests/mission-today/start/"]);
  });
  it("previous-day continuation retains its frozen date", async () => {
    const previous = mission({ id: "yesterday", date: "2026-09-30", state: "in_progress", progress: 3, session_id: "mission-session" }); const m = meta({ daily_quest: previous });
    vi.spyOn(apiClient, "get").mockImplementation(async url => ({ data: url.includes("today") ? today(mission(), previous) : m }));
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({ data: m }); page(); await tick();
    fireEvent.click(screen.getByRole("button", { name: "CONTINUE PREVIOUS MISSION" })); await tick();
    expect(post.mock.calls[0][0]).toBe("/daily-quests/yesterday/start/"); expect(screen.getByText("2026-09-30 · Asia/Kolkata")).toBeInTheDocument();
  });
  it("completed card reports zero XP and its original report action", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: today(mission({ state: "completed", progress: 5, session_id: "mission-session", xp_earned: 0, completed_at: "2026-10-01T12:00:00Z" })) });
    page(); await tick(); expect(screen.getByText("0 XP earned")).toBeInTheDocument(); expect(screen.getByRole("button", { name: "VIEW MISSION REPORT" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved 5/5 · Mission complete!");
  });
  it.each(["TEACHER", "ADMIN"] as const)("hides and does not fetch for %s", async role => {
    useAuthStore.setState({ user: { ...USER, role } }); const get = vi.spyOn(apiClient, "get"); page(); await tick();
    expect(screen.queryByText("Today’s Bolt Mission")).not.toBeInTheDocument(); expect(get).not.toHaveBeenCalled();
  });
  it("clears identity cache and hides old mission on account change and logout", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: today(mission({ lesson_name: "PRIVATE FIRST STUDENT" })) });
    const { client } = page(); await tick(); expect(screen.getByText(/PRIVATE FIRST STUDENT/)).toBeInTheDocument(); get.mockImplementation(() => new Promise(() => {}));
    act(() => useAuthStore.setState({ user: { ...USER, id: "second-student" } })); await tick();
    expect(screen.queryByText(/PRIVATE FIRST STUDENT/)).not.toBeInTheDocument(); expect(client.getQueryData(["daily-quests", USER.id])).toBeUndefined();
    act(() => useAuthStore.setState({ user: null, accessToken: null })); await tick(); expect(screen.queryByText("Today’s Bolt Mission")).not.toBeInTheDocument();
  });
  it("refetches at the server interval and on focus despite device calendar", async () => {
    const data = today(); data.server_now = "2030-01-01T00:00:00Z"; data.reset_at = "2030-01-01T00:00:02Z";
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data }); page(); await tick(); const calls = get.mock.calls.length;
    await tick(2000); expect(get.mock.calls.length).toBeGreaterThan(calls); const afterReset = get.mock.calls.length;
    fireEvent(window, new Event("focus")); await tick(); expect(get.mock.calls.length).toBeGreaterThan(afterReset);
  });
});

describe("mission accepted effort and confirmed report", () => {
  it.each([10, 950])("wrong answer advances once from receipt after %sms with stale metadata", async delay => {
    const m = meta(); vi.spyOn(apiClient, "get").mockResolvedValue({ data: copy(m) });
    const post = vi.spyOn(apiClient, "post").mockImplementation(async (_url, body) => new Promise(resolve => window.setTimeout(() => resolve({ data: { contract_version: 2, verdicts: (body as { attempts: PendingAttempt[] }).attempts.map(receipt) } }), delay)));
    page("/practice/session/mission-session"); await tick(); await tick(250); expect(screen.queryByRole("button", { name: "SKIP" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Answer" }), { target: { value: "0" } }); fireEvent.click(screen.getByRole("button", { name: "SUBMIT" })); await tick();
    expect(screen.getByText("Saved 0/5 · Answer saving…")).toBeInTheDocument();
    if (delay > 600) { await tick(650); expect(screen.getByText("Q 1 / 5")).toBeInTheDocument(); expect(screen.getByText("Saving your answer…")).toBeInTheDocument(); }
    await tick(delay + 650); await tick(); expect(screen.getByText("Q 2 / 5")).toBeInTheDocument(); expect(screen.getByText("Saved 1/5")).toBeInTheDocument();
    await tick(1000); expect(screen.getByText("Q 2 / 5")).toBeInTheDocument(); expect(post).toHaveBeenCalledTimes(1); expect(m.question_states![0].terminal).toBe(false);
  });
  it("five wrong accepted tries stay pending on finalization failure; retry confirms zero XP", async () => {
    const m = meta(); let result: ProgressRecord | null = null; let failFinish = true;
    vi.spyOn(apiClient, "get").mockImplementation(async url => ({ data: url.endsWith("report/") ? { progress: result, attempts: [], lesson_id: null, question_verdicts: {} } : copy(m) }));
    const post = vi.spyOn(apiClient, "post").mockImplementation(async (url, body) => {
      if (url.includes("attempts/bulk")) {
        const verdicts = (body as { attempts: PendingAttempt[] }).attempts.map(receipt);
        for (const r of verdicts) m.question_states![r.question_index] = { question_index: r.question_index, max_attempt_number: 1, attempt_count: 1, terminal: true, latest_receipt: r };
        m.daily_quest!.progress = m.question_states!.filter(q => q.terminal).length; return { data: { contract_version: 2, verdicts } };
      }
      if (failFinish) throw new AxiosError("offline", "ERR_NETWORK");
      result = { contract_version: 2, id: "mission-result", session_id: m.session_id, score_correct: 0, score_total: 5, accuracy_pct: 0, time_taken_sec: 20, xp_earned: 0, created_at: "2026-10-01T12:00:00Z" };
      m.state = "submitted"; Object.assign(m.daily_quest!, { state: "completed", completed_at: result.created_at, xp_earned: 0 }); return { data: result };
    });
    page("/practice/session/mission-session"); await tick(); await tick(250);
    for (let i = 0; i < 5; i++) {
      fireEvent.change(screen.getByRole("textbox", { name: "Answer" }), { target: { value: "0" } }); fireEvent.click(screen.getByRole("button", { name: "SUBMIT" })); await tick(650); await tick();
    }
    expect(screen.getByText("Saved 5/5 · Finishing your mission…")).toBeInTheDocument(); expect(screen.queryByText("MISSION COMPLETE!")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry finish" })).toBeInTheDocument(); failFinish = false; fireEvent.click(screen.getByRole("button", { name: "Retry finish" })); await tick(); await tick();
    expect(screen.getByRole("heading", { name: "MISSION COMPLETE!" })).toBeInTheDocument(); expect(screen.getByText("0 XP earned")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "PLAY AGAIN" })).not.toBeInTheDocument(); expect(post.mock.calls.filter(([url]) => url.includes("attempts/bulk"))).toHaveLength(5);
  });
  it("report waits for confirmed association and submitted state even with a result", async () => {
    const m = meta(); const p = { id: "r", session_id: m.session_id, score_correct: 1, score_total: 5, accuracy_pct: 20, xp_earned: 10, time_taken_sec: 10, created_at: "2026-10-01T12:00:00Z" };
    vi.spyOn(apiClient, "get").mockImplementation(async url => ({ data: url.endsWith("report/") ? { progress: p, attempts: [], lesson_id: null, question_verdicts: {} } : m }));
    page("/practice/victory/mission-session"); await tick(); expect(screen.getByText("Confirming your mission completion…")).toBeInTheDocument();
    expect(screen.queryByText("MISSION COMPLETE!")).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: "PLAY AGAIN" })).not.toBeInTheDocument();
  });
  it("reload restores durable wrong-answer progress and announces damaged storage", async () => {
    const m = meta(); const r = receipt({ question_index: 0, attempt_number: 1, answer: 0, elapsed_ms: 500, is_skip: false });
    m.question_states![0] = { question_index: 0, max_attempt_number: 1, attempt_count: 1, terminal: true, latest_receipt: r };
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: m }); const post = vi.spyOn(apiClient, "post"); sessionStorage.setItem(storageKey(USER.id, m.session_id), "corrupt");
    page("/practice/session/mission-session"); await tick(); expect(screen.getByText("Q 2 / 5")).toBeInTheDocument(); expect(screen.getByText("Saved 1/5")).toBeInTheDocument();
    expect(screen.getByText(/Reload recovery is unavailable or damaged/)).toBeInTheDocument(); expect(post).not.toHaveBeenCalled();
  });
  it("session and report data are isolated when identity changes or expires", async () => {
    const m = meta({ state: "submitted", daily_quest: mission({ state: "completed", session_id: "mission-session", completed_at: "2026-10-01T12:00:00Z", xp_earned: 0 }) });
    const p = { id: "r", session_id: m.session_id, score_correct: 0, score_total: 5, accuracy_pct: 0, xp_earned: 0, time_taken_sec: 10, created_at: "2026-10-01T12:00:00Z" };
    vi.spyOn(apiClient, "get").mockImplementation(async url => useAuthStore.getState().user?.id !== USER.id ? new Promise(() => {}) : { data: url.endsWith("report/") ? { progress: p, attempts: [], lesson_id: null, question_verdicts: {} } : m });
    const { client } = page("/practice/victory/mission-session"); await tick();
    expect(screen.getByText("0 XP earned")).toBeInTheDocument();
    expect(client.getQueryData(["sessions", USER.id, m.session_id, "report"])).toBeDefined();
    act(() => useAuthStore.setState({ user: { ...USER, id: "other-student" } })); await tick();
    expect(screen.queryByText("0 XP earned")).not.toBeInTheDocument(); expect(screen.queryByText("MISSION COMPLETE!")).not.toBeInTheDocument();
    act(() => useAuthStore.setState({ user: null, accessToken: null })); await tick();
    expect(screen.queryByText("0 XP earned")).not.toBeInTheDocument();
  });
  it.each([
    ["ADD", "9999 + 8888 + 7777 + 6666 + 5555 + 4444 + 3333 + 2222", 8],
    ["SUB", "9999 - 1111 - 1000 - 1000 - 1000 - 1000 - 1000 - 1000", 8],
    ["MUL", "9999 × 99", 2],
    ["DIV", "9999 ÷ 99", 2],
  ])("mission %s presents intact operands and operators as readable rows", async (operation, expression, rowCount) => {
    const m = meta(); m.questions[0] = { ...m.questions[0], text: String(expression), operation: String(operation) };
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: m });
    const view = page("/practice/session/mission-session"); await tick();
    const displayed = view.container.querySelector(".mission-problem pre")!.textContent!;
    expect(displayed.replace(/\s/g, "")).toBe(String(expression).replace(/\s/g, ""));
    expect(displayed.match(/\d+/g)).toEqual(String(expression).match(/\d+/g));
    expect(displayed.split("\n")).toHaveLength(Number(rowCount));
    expect(Math.max(...displayed.split("\n").map(row => row.length))).toBeLessThanOrEqual(6);
    expect(view.container.querySelectorAll(".mission-problem pre")[1].textContent!.trim()).toBe("?");
    expect(screen.getByRole("textbox", { name: "Answer" })).toHaveAttribute("inputmode", "numeric");
  });
  it("ordinary Arena keeps its existing inline expression presentation", async () => {
    const m = meta({ daily_quest: null, is_test_mode: false }); m.questions[0].text = "9999 + 8888 + 7777";
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: m });
    const view = page("/practice/session/mission-session"); await tick();
    expect(view.container.querySelector("pre")!.textContent).toBe(m.questions[0].text);
    expect(view.container.querySelector(".mission-problem")).toBeNull();
  });
  it("mission navigation preserves explicit memory-only switch conflict", async () => {
    const old = meta({ session_id: "old-session", daily_quest: null }); useSessionStore.getState().initialize(USER.id, old, "practice:old-session");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("denied", "SecurityError"); }); useSessionStore.getState().enqueue(0, false);
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: meta() }); page("/practice/session/mission-session"); await tick();
    expect(screen.getByRole("button", { name: "Return to unsaved session" })).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Discard unsaved answers and open session" })).toBeInTheDocument();
    expect(useSessionStore.getState().recovery!.sessionId).toBe("old-session"); expect(useSessionStore.getState().recovery!.pending).toHaveLength(1);
  });
});
