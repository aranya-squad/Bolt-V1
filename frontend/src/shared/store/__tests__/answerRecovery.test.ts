import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import axios, { AxiosError, AxiosHeaders } from "axios";
import { apiClient } from "@/shared/api/client";
import { useSessionStore } from "../sessionStore";
import { useAuthStore } from "../authStore";
import { loadRecovery, storageKey, SKIP_ANSWER } from "../answerRecovery";
import type { PendingAttempt } from "../answerRecovery";
import type { AcceptedReceipt, SessionMeta, User } from "@/shared/types";

const metaFixture = (patch: Partial<SessionMeta> = {}): SessionMeta => ({
  session_id: "session-1", kind: "ZEN", attempt_contract_version: 2, state: "active", is_test_mode: false,
  lesson_id: null, level_id: null, started_at: new Date(Date.now() - 10000).toISOString(), server_now: new Date().toISOString(),
  questions: [{ index: 0, text: "1+1", operation: "ADD", answer: 2 }, { index: 1, text: "2+2", operation: "ADD", answer: 4 }],
  time_limit_sec: 0, flash_speed_ms: null,
  question_states: [0, 1].map(question_index => ({ question_index, max_attempt_number: 0, attempt_count: 0, terminal: false, latest_receipt: null })), ...patch,
});
const user: User = { id: "learner-1", email: "synthetic@example.test", role: "STUDENT", profile: null };
const context = "practice:session-1";
const store = () => useSessionStore.getState();
const receipt = (a: PendingAttempt): AcceptedReceipt => ({ contract_version: 2, accepted: true, question_index: a.question_index, attempt_number: a.attempt_number, submitted_answer: a.answer, elapsed_ms: a.elapsed_ms, is_skip: a.is_skip, is_correct: a.answer === 2 && !a.is_skip, xp_delta: 0 });
const fail = (status: number, data: unknown = {}, retryAfter?: string) => new AxiosError("request failed", "ERR_BAD_RESPONSE", undefined, undefined, { status, statusText: "failed", data, headers: new AxiosHeaders(retryAfter ? { "retry-after": retryAfter } : {}), config: { headers: new AxiosHeaders() } });
function setup(meta = metaFixture()) {
  useAuthStore.setState({ user, accessToken: "test-token", isHydrating: false });
  vi.spyOn(apiClient, "get").mockResolvedValue({ data: meta });
  store().initialize(user.id, meta, context);
  return meta;
}
beforeEach(() => { sessionStorage.clear(); store().clearSession(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-01T10:00:00Z")); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); store().clearSession(); });

describe("answer recovery API/storage boundary", () => {
  it("UI-01: lost response retains immutable identity, then reload reconciles committed acceptance", async () => {
    const meta = setup();
    store().update({ questionStartedAt: Date.now() - 1200 });
    const item = store().enqueue(2, false)!;
    const post = vi.spyOn(apiClient, "post").mockRejectedValueOnce(fail(503));
    expect(await store().flush()).toBe(false);
    expect(store().recovery?.pending).toEqual([item]);
    expect(post.mock.calls[0][1]).toEqual({ contract_version: 2, attempts: [item] });
    store().clearSession();
    const accepted = receipt(item);
    meta.question_states![0] = { question_index: 0, max_attempt_number: 1, attempt_count: 1, terminal: true, latest_receipt: accepted };
    store().initialize(user.id, meta, context);
    expect(store().recovery?.pending).toEqual([]);
    expect(store().recovery?.issued[0]).toBe(1);
    expect(store().status).toBe("accepted");
    expect(post).toHaveBeenCalledTimes(1);
  });
  it("UI-02: wrong/correct retry and input during serialized flush are all acknowledged once", async () => {
    setup();
    const wrong = store().enqueue(1, false)!;
    let resolveResponse: ((value: { data: unknown }) => void) | undefined;
    const post = vi.spyOn(apiClient, "post").mockImplementationOnce(() => new Promise(resolve => { resolveResponse = resolve; })).mockImplementation(async (_url, body) => ({ data: { contract_version: 2, verdicts: (body as { attempts: PendingAttempt[] }).attempts.map(receipt) } }));
    const flushing = store().flush();
    expect(store().flush()).toBe(flushing);
    await vi.waitFor(() => expect(resolveResponse).toBeDefined());
    store().update({ questionStartedAt: Date.now() - 500 });
    const right = store().enqueue(2, false)!;
    expect(right.attempt_number).toBe(2);
    expect(resolveResponse).toBeDefined();
    resolveResponse!({ data: { contract_version: 2, verdicts: [receipt(wrong)] } });
    expect(await flushing).toBe(true);
    expect(store().recovery?.pending).toEqual([]);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1][1]).toEqual({ contract_version: 2, attempts: [right] });
  });
  it.each(["version", "identity", "answer", "elapsed", "accepted", "duplicate"])("old/mismatched %s acknowledgment never drains pending work", async field => {
    setup(); const item = store().enqueue(2, false)!;
    const r: Record<string, unknown> = { ...receipt(item) };
    if (field === "version") r.contract_version = 1;
    if (field === "identity") r.attempt_number = 2;
    if (field === "answer") r.submitted_answer = 99;
    if (field === "elapsed") r.elapsed_ms = 99;
    if (field === "accepted") r.accepted = false;
    vi.spyOn(apiClient, "post").mockResolvedValue({ data: { contract_version: 2, verdicts: field === "duplicate" ? [r, r] : [r] } });
    expect(await store().flush()).toBe(false);
    expect(store().recovery?.pending).toEqual([item]);
    expect(store().status).toBe("unsupported");
  });
  it("late lower identity/latest wrong with terminal true is valid metadata; allocation uses max", () => {
    const meta = setup();
    const latest = receipt({ question_index: 0, attempt_number: 2, answer: 1, elapsed_ms: 500, is_skip: false });
    meta.question_states![0] = { question_index: 0, max_attempt_number: 5, attempt_count: 3, terminal: true, latest_receipt: latest };
    store().initialize(user.id, meta, context);
    expect(store().verified).toBe(true);
    expect(store().recovery?.issued[0]).toBe(5);
  });
  it("hydration repairs issued counters from immutable pending identities before any new input", () => {
    const meta = setup(); store().enqueue(1, false);
    const state = store().recovery!;
    sessionStorage.setItem(storageKey(user.id, meta.session_id), JSON.stringify({ ...state, issued: {} }));
    store().clearSession(); store().initialize(user.id, meta, context);
    expect(store().enqueue(2, false)?.attempt_number).toBe(2);
  });
  it("old capability prevents input and preserves restored queue", async () => {
    const meta = setup(); const item = store().enqueue(2, false)!;
    store().clearSession(); store().initialize(user.id, { ...meta, attempt_contract_version: 1 }, context);
    expect(store().enqueue(3, false)).toBeNull();
    expect(await store().flush()).toBe(false);
    expect(store().recovery?.pending).toEqual([item]);
  });
  it("UI-02: bounds pause input without evicting any of 200 pending retries", () => {
    setup(); for (let i = 0; i < 200; i++) expect(store().enqueue(1, false)).not.toBeNull();
    expect(store().enqueue(2, false)).toBeNull();
    expect(store().recovery?.pending).toHaveLength(200);
    expect(store().message).toContain("capacity");
  });
  it("UI-02: denied/full browser storage keeps pending memory and reports degradation", () => {
    setup(); vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
    const item = store().enqueue(1, false);
    expect(store().recovery?.pending).toEqual([item]);
    expect(store().storage).toBe("unavailable");
  });
  it("UI-02: malformed, foreign and wrong-context persisted state is never hydrated", () => {
    const meta = setup(); store().enqueue(1, false);
    expect(loadRecovery(user.id, meta.session_id, "other-context").state).toBeNull();
    const raw = sessionStorage.getItem(storageKey(user.id, meta.session_id))!;
    sessionStorage.setItem(storageKey("other-user", meta.session_id), raw);
    expect(loadRecovery("other-user", meta.session_id, context).state).toBeNull();
    sessionStorage.setItem(storageKey(user.id, meta.session_id), "{bad-json");
    store().clearSession(); store().initialize(user.id, meta, context);
    expect(store().storage).toBe("corrupt");
    expect(store().recovery?.pending).toEqual([]);
  });
  it("UI-03: expiry retains work for same user; explicit logout warns and discards only on confirmation", () => {
    const meta = setup(); const item = store().enqueue(2, false);
    useAuthStore.getState().expire();
    expect(store().status).toBe("suspended");
    expect(store().recovery?.pending).toEqual([item]);
    useAuthStore.getState().setUser(user); useAuthStore.getState().setAccessToken("new-test-token");
    store().initialize(user.id, meta, context);
    expect(store().recovery?.pending).toEqual([item]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    expect(useAuthStore.getState().logout()).toBe(false);
    expect(store().recovery?.pending).toEqual([item]);
    confirm.mockReturnValue(true);
    expect(useAuthStore.getState().logout()).toBe(true);
    expect(store().recovery).toBeNull(); expect(sessionStorage.getItem(storageKey(user.id, meta.session_id))).toBeNull();
  });
  it("UI-03: switching users clears prior work and never persists credentials or expected answers", () => {
    setup(); store().enqueue(2, false);
    const raw = sessionStorage.getItem(storageKey(user.id, "session-1"))!;
    expect(raw).not.toMatch(/test-token|expected_answer|questions|pin/);
    useAuthStore.getState().expire(); useAuthStore.getState().setUser({ ...user, id: "learner-2" });
    expect(store().recovery).toBeNull(); expect(sessionStorage.getItem(storageKey(user.id, "session-1"))).toBeNull();
  });
  it("UI-04: classwork retry/position/feedback and effective elapsed timer survive reload", () => {
    const meta = setup(metaFixture({ kind: "CLASSWORK", time_limit_sec: 60, is_test_mode: true }));
    store().initialize(user.id, meta, "learn:l1:");
    store().update({ index: 1, input: "42", retried: true, feedback: { isCorrect: false, wasSkip: false, accepted: true }, questionStartedAt: Date.now() - 1000 });
    const deadline = store().recovery?.deadline;
    vi.advanceTimersByTime(5000); store().clearSession();
    store().initialize(user.id, { ...meta, server_now: new Date().toISOString() }, "learn:l1:");
    expect(store().recovery).toMatchObject({ index: 1, input: "42", retried: true, feedback: { isCorrect: false, accepted: true }, deadline });
    expect(store().meta?.is_test_mode).toBe(true);
    expect((store().recovery?.deadline ?? 0) - Date.now()).toBe(45000);
  });
  it("UI-05: 400 excludes only the explicitly rejected neighbor; 409 retains uncertain identity", async () => {
    setup(); const bad = store().enqueue(1, false)!; const valid = store().enqueue(2, false)!;
    const post = vi.spyOn(apiClient, "post").mockRejectedValueOnce(fail(400, { detail: "Too fast.", items: [{ index: 0, code: "invalid_attempt" }] }));
    expect(await store().flush()).toBe(false);
    expect(store().recovery?.pending).toEqual([bad, valid]); expect(store().message).toContain("Q1 attempt 1");
    store().excludeRejected(); expect(store().recovery?.pending).toEqual([valid]);
    post.mockRejectedValueOnce(fail(409, { code: "identity_conflict", detail: "Identity conflict." }));
    expect(await store().flush()).toBe(false); expect(store().recovery?.pending).toEqual([valid]); expect(store().retryAt).toBeNull();
  });
  it.each(["identity", "index"])("rejected %s error entries persist only the validated identity, never unknown/private fields", async source => {
    setup(); const bad = store().enqueue(1, false)!; const valid = store().enqueue(2, false)!;
    const identity = { question_index: bad.question_index, attempt_number: bad.attempt_number };
    const errorItem = { ...(source === "identity" ? identity : {}), index: 0, code: "invalid_attempt", detail: "synthetic server detail", expected_answer: 987654321, private_note: "synthetic private note" };
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(fail(400, { detail: "Rejected input.", items: [errorItem] }));
    expect(await store().flush()).toBe(false);
    expect(store().recovery?.rejected).toEqual([identity]);
    const raw = sessionStorage.getItem(storageKey(user.id, "session-1"))!;
    const stored: { rejected: unknown[] } = JSON.parse(raw);
    expect(stored.rejected).toEqual([identity]);
    expect(raw).not.toMatch(/expected_answer|private_note|987654321|synthetic server detail|synthetic private note|invalid_attempt/);
    store().excludeRejected();
    expect(store().recovery?.pending).toEqual([valid]);
    expect(store().recovery?.rejected).toEqual([]);
  });
  it("a transient save error can retry through metadata reconciliation and drain normally", async () => {
    const meta = setup(); const item = store().enqueue(2, false)!;
    const post = vi.spyOn(apiClient, "post").mockRejectedValueOnce(fail(503)).mockResolvedValueOnce({ data: { contract_version: 2, verdicts: [receipt(item)] } });
    expect(await store().flush()).toBe(false);
    store().initialize(user.id, meta, context); // External refresh preserves the actionable error.
    expect(store().status).toBe("error");
    expect(await store().flush()).toBe(true); // Explicit retry enters saving before initialize.
    expect(post).toHaveBeenCalledTimes(2); expect(store().status).toBe("accepted");
    expect(store().recovery?.pending).toEqual([]);
  });
  it("validated identity conflict retains differing payload until explicit server choice; manifest/neighbors survive", async () => {
    const meta = setup(); const local = store().enqueue(2, false)!;
    store().advance(); const neighbor = store().enqueue(4, false)!;
    const actual = { ...receipt(local), submitted_answer: 1, is_correct: false, elapsed_ms: 500 };
    const post = vi.spyOn(apiClient, "post").mockRejectedValueOnce(fail(409, { code: "identity_conflict", receipt: actual }));
    expect(await store().finish()).toBeNull();
    expect(store().recovery?.pending).toEqual([local, neighbor]); expect(store().conflict).toEqual(actual);
    expect(await store().flush()).toBe(false); expect(post).toHaveBeenCalledTimes(1);
    meta.question_states![0] = { question_index: 0, max_attempt_number: 1, attempt_count: 1, terminal: false, latest_receipt: actual };
    await store().useServerAnswer();
    expect(store().recovery?.pending).toEqual([neighbor]); expect(store().conflict).toBeNull();
    expect(store().recovery?.manifest).toEqual([{ question_index: 0, attempt_number: 1 }, { question_index: 1, attempt_number: 1 }]);
    expect(store().recovery?.issued[0]).toBe(1);
    post.mockResolvedValueOnce({ data: { contract_version: 2, verdicts: [receipt(neighbor)] } }).mockResolvedValueOnce({ data: {
      contract_version: 2, id: "conflict-result", session_id: meta.session_id, created_at: new Date().toISOString(), score_correct: 1, score_total: 2, accuracy_pct: 50, time_taken_sec: 10, xp_earned: 1,
    } });
    expect(await store().finish()).toMatchObject({ id: "conflict-result" });
    expect(post.mock.calls[1][1]).toEqual({ contract_version: 2, attempts: [neighbor] });
  });
  it.each(["version", "identity", "accepted"])("invalid conflict %s never enables discard or drains the queued identity", async field => {
    setup(); const local = store().enqueue(2, false)!;
    const actual = { ...receipt(local), submitted_answer: 1 };
    const invalid = field === "version" ? { ...actual, contract_version: 1 } : field === "identity" ? { ...actual, attempt_number: 2 } : { ...actual, accepted: false };
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(fail(409, { code: "identity_conflict", receipt: invalid }));
    expect(await store().flush()).toBe(false); await store().useServerAnswer();
    expect(store().conflict).toBeNull(); expect(store().status).toBe("unsupported");
    expect(store().recovery?.pending).toEqual([local]);
  });
  it("UI-05: honors 429 Retry-After and bounds 5xx retry; 401/404 remain explicit", async () => {
    setup(); store().enqueue(2, false);
    const post = vi.spyOn(apiClient, "post").mockRejectedValueOnce(fail(429, {}, "12"));
    await store().flush(); expect(store().retryAt).toBe(Date.now() + 12000);
    await store().flush(); expect(post).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(12000);
    post.mockRejectedValue(fail(503)); await store().flush(); expect(store().retryAt).not.toBeNull();
    await store().flush(); expect(store().retryAt).toBeNull();
    post.mockRejectedValueOnce(fail(404)); await store().flush(); expect(store().message).toContain("unavailable");
    post.mockRejectedValueOnce(fail(401)); await store().flush(); expect(store().status).toBe("suspended"); expect(store().recovery?.pending).toHaveLength(1);
  });
  it("UI-05: manifest survives draining, failed finalize and reload; retry uses confirmed result", async () => {
    const meta = setup(); const item = store().enqueue(2, false)!;
    const post = vi.spyOn(apiClient, "post").mockResolvedValueOnce({ data: { contract_version: 2, verdicts: [receipt(item)] } }).mockRejectedValueOnce(fail(503));
    expect(await store().finish()).toBeNull(); expect(store().recovery?.pending).toEqual([]);
    expect(store().recovery?.manifest).toEqual([{ question_index: 0, attempt_number: 1 }]);
    store().clearSession(); store().initialize(user.id, meta, context);
    expect(store().enqueue(4, false)).toBeNull();
    post.mockResolvedValueOnce({ data: { contract_version: 2, id: "result-1", session_id: meta.session_id, created_at: new Date().toISOString(), score_correct: 1, score_total: 2, accuracy_pct: 50, time_taken_sec: 10, xp_earned: 1 } });
    expect(await store().finish()).toMatchObject({ id: "result-1" });
    expect(post.mock.calls.at(-1)?.[1]).toEqual({ contract_version: 2, expected_attempts: [{ question_index: 0, attempt_number: 1 }] });
    expect(sessionStorage.getItem(storageKey(user.id, meta.session_id))).toBeNull();
  });
  it("deterministic limit items outside the failed snapshot never become discardable", async () => {
    setup(); const item = store().enqueue(1, false)!;
    vi.spyOn(apiClient, "post").mockRejectedValue(fail(409, { code: "attempt_limit", items: [{ code: "attempt_limit", question_index: 1, attempt_number: 42 }] }));
    expect(await store().flush()).toBe(false); store().excludeRejected();
    expect(store().recovery?.rejected).toEqual([]); expect(store().recovery?.pending).toEqual([item]);
  });
  it("memory-only unresolved work blocks another session and stale callbacks cannot replace it", async () => {
    const meta = setup(); vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
    const item = store().enqueue(2, false)!;
    let resolveResponse: ((value: { data: unknown }) => void) | undefined;
    vi.spyOn(apiClient, "post").mockImplementationOnce(() => new Promise(resolve => { resolveResponse = resolve; }));
    const flushing = store().flush(); await vi.waitFor(() => expect(resolveResponse).toBeDefined());
    store().initialize(user.id, { ...meta, session_id: "session-2" }, "practice:session-2");
    expect(store().switchBlocked).toBe(true); expect(store().recovery?.sessionId).toBe(meta.session_id);
    resolveResponse!({ data: { contract_version: 2, verdicts: [receipt(item)] } });
    expect(await flushing).toBe(false); expect(store().recovery?.pending).toEqual([item]);
    expect(await store().finish()).toBeNull();
    store().initialize(user.id, meta, context); // Returning resumes the same queue.
    expect(store().switchBlocked).toBe(false); expect(store().recovery?.pending).toEqual([item]);
  });
  it("refresh timeout through the real response interceptor suspends and preserves the queue", async () => {
    setup(); const item = store().enqueue(2, false)!;
    vi.restoreAllMocks();
    const adapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = async config => { throw new AxiosError("expired", "ERR_BAD_RESPONSE", config, undefined, {
      status: 401, statusText: "expired", data: {}, headers: new AxiosHeaders(), config,
    }); };
    const refresh = vi.spyOn(axios, "post").mockRejectedValue(new AxiosError("refresh timeout", "ECONNABORTED"));
    try {
      expect(await store().flush()).toBe(false);
      expect(refresh).toHaveBeenCalledWith("/api/v1/auth/refresh/", {}, { withCredentials: true, timeout: 10000 });
      expect(store().status).toBe("suspended"); expect(store().recovery?.pending).toEqual([item]);
      expect(useAuthStore.getState().accessToken).toBeNull();
    } finally { apiClient.defaults.adapter = adapter; }
  });
  it("after adopting a terminal server answer, a higher local attempt_limit can be explicitly excluded", async () => {
    const meta = setup(); const first = store().enqueue(1, false)!; const higher = store().enqueue(2, false)!;
    const actual = { ...receipt(first), submitted_answer: 2, is_correct: true, elapsed_ms: 500 };
    const post = vi.spyOn(apiClient, "post").mockRejectedValueOnce(fail(409, { code: "identity_conflict", receipt: actual }));
    expect(await store().finish()).toBeNull();
    meta.question_states![0] = { question_index: 0, max_attempt_number: 1, attempt_count: 1, terminal: true, latest_receipt: actual };
    await store().useServerAnswer(); expect(store().recovery?.pending).toEqual([higher]);
    post.mockRejectedValueOnce(fail(409, { code: "attempt_limit", detail: "Question complete.", items: [{ index: 0, code: "attempt_limit", question_index: 0, attempt_number: 2 }] }));
    expect(await store().finish()).toBeNull(); expect(store().recovery?.rejected).toHaveLength(1);
    expect(store().recovery?.pending).toEqual([higher]);
    store().excludeRejected(); expect(store().recovery?.pending).toEqual([]);
    expect(store().recovery?.manifest).toEqual([{ question_index: 0, attempt_number: 1 }]);
    post.mockResolvedValueOnce({ data: { contract_version: 2, id: "existing-answer-result", session_id: meta.session_id, created_at: new Date().toISOString(), score_correct: 1, score_total: 2, accuracy_pct: 50, time_taken_sec: 1, xp_earned: 1 } });
    expect(await store().finish()).toMatchObject({ id: "existing-answer-result" });
  });
  it("UI-05: abandoned sessions retain missing work without accepting new input/final result", async () => {
    const meta = setup(); const item = store().enqueue(2, true)!; expect(item.answer).toBe(SKIP_ANSWER);
    meta.state = "abandoned"; store().initialize(user.id, meta, context);
    expect(store().enqueue(3, false)).toBeNull();
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(fail(409, { code: "session_closed", detail: "Session abandoned." }));
    expect(await store().finish()).toBeNull(); expect(store().recovery?.pending).toEqual([item]);
  });
});
