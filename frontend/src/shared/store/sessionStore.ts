import { create } from "zustand";
import axios from "axios";
import { apiClient } from "@/shared/api/client";
import { finalize, SESSION_REQUEST_TIMEOUT_MS, submitBulk } from "@/shared/api/queries/useSession";
import type { ProgressRecord, SessionMeta } from "@/shared/types";
import { acknowledge, createRecovery, identityKey, isIdentity, isReceipt, loadRecovery, MAX_BYTES, MAX_PENDING, reconcile, saveRecovery, SKIP_ANSWER, storageKey } from "./answerRecovery";
import type { PendingAttempt, RecoveryState, StorageStatus } from "./answerRecovery";

export type SaveStatus = "accepted" | "pending" | "saving" | "error" | "unsupported" | "suspended";
interface SessionState {
  recovery: RecoveryState | null;
  meta: SessionMeta | null;
  storage: StorageStatus;
  verified: boolean;
  status: SaveStatus;
  message: string;
  retryAt: number | null;
  initialize: (userId: string, meta: SessionMeta, context: string) => void;
  update: (patch: Partial<Pick<RecoveryState, "index" | "input" | "feedback" | "retried" | "questionStartedAt" | "feedbackUntil" | "flashDeadline">>) => void;
  enqueue: (answer: number, isSkip: boolean, feedback?: RecoveryState["feedback"]) => PendingAttempt | null;
  advance: () => void;
  flush: () => Promise<boolean>;
  finish: () => Promise<ProgressRecord | null>;
  excludeRejected: () => void;
  suspend: () => void;
  clearSession: () => void;
}
let flushInFlight: Promise<boolean> | null = null;
let finishInFlight: Promise<ProgressRecord | null> | null = null;
let generation = 0;
let retryCount = 0;
let rateLimitedUntil = 0;
const INITIAL = { recovery: null, meta: null, storage: "available" as StorageStatus, verified: false, status: "accepted" as SaveStatus, message: "", retryAt: null };
function capability(meta: SessionMeta) {
  if (!Array.isArray(meta.questions) || !Array.isArray(meta.question_states) || meta.question_states.length !== meta.questions.length) return false;
  if (!meta.question_states.every(q => q && Number.isInteger(q.question_index) && q.question_index >= 0 && q.question_index < meta.questions.length &&
    Number.isInteger(q.max_attempt_number) && q.max_attempt_number >= 0 && q.max_attempt_number <= 32767 &&
    Number.isInteger(q.attempt_count) && q.attempt_count >= 0 && q.attempt_count <= q.max_attempt_number && typeof q.terminal === "boolean" &&
    (q.latest_receipt === null || (isReceipt(q.latest_receipt) && q.latest_receipt.question_index === q.question_index && q.latest_receipt.attempt_number <= q.max_attempt_number)))) return false;
  return new Set(meta.question_states.map(q => q.question_index)).size === meta.questions.length &&
    meta.attempt_contract_version === 2 && ["active", "submitted", "abandoned"].includes(meta.state ?? "") &&
    Number.isFinite(Date.parse(meta.started_at ?? "")) && Number.isFinite(Date.parse(meta.server_now ?? "")) &&
    Number.isInteger(meta.time_limit_sec) && meta.time_limit_sec >= 0 && typeof meta.is_test_mode === "boolean";
}
function persist(state: RecoveryState) {
  const storage = saveRecovery(state);
  useSessionStore.setState({ recovery: state, storage: useSessionStore.getState().storage === "corrupt" ? "corrupt" : storage });
}
function failure(error: unknown, snapshot: PendingAttempt[] = []) {
  const store = useSessionStore.getState();
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data: unknown = error.response?.data;
    const body = typeof data === "object" && data !== null ? data as Record<string, unknown> : {};
    const detail = typeof body.detail === "string" ? body.detail : "Answers could not be saved.";
    if (status === 401) { store.suspend(); return; }
    if (status === 400 || status === 409 || status === 404) {
      const rejected = status === 400 && Array.isArray(body.items) ? body.items.flatMap((item: unknown) => {
        if (isIdentity(item)) return [item];
        if (typeof item === "object" && item !== null && "index" in item && typeof item.index === "number" && Number.isInteger(item.index) && snapshot[item.index]) return [snapshot[item.index]];
        return [];
      }) : [];
      if (store.recovery && rejected.length) persist({ ...store.recovery, rejected });
      useSessionStore.setState({ status: body.code === "unsupported_contract" ? "unsupported" : "error", message: status === 404 ? "This session is unavailable. Pending answers are retained." : detail + (rejected.length ? ` Rejected: ${rejected.map(a => `Q${a.question_index + 1} attempt ${a.attempt_number}`).join(", ")}. Exclude only these answers to save the remaining work.` : " Pending answers are retained."), retryAt: null });
      return;
    }
    if (!status || status === 429 || status >= 500) {
      retryCount++;
      const header: unknown = error.response?.headers["retry-after"];
      const retryAfter = typeof header === "string" || typeof header === "number" ? (Number.isFinite(Number(header)) ? Number(header) * 1000 : Date.parse(String(header)) - Date.now()) : 0;
      const delay = Math.max(1000, retryAfter || Math.min(8000, 1000 * 2 ** (retryCount - 1)));
      if (status === 429) rateLimitedUntil = Date.now() + delay;
      useSessionStore.setState({ status: "error", message: status === 429 ? "Saving is rate limited. Pending answers are retained." : "Connection interrupted. Pending answers are retained.", retryAt: retryCount < 3 ? Date.now() + delay : null });
      return;
    }
    useSessionStore.setState({ status: "error", message: detail, retryAt: null });
    return;
  }
  useSessionStore.setState({ status: "unsupported", message: error instanceof Error ? error.message : "API response is incompatible. Pending answers are retained.", retryAt: null });
}
export const useSessionStore = create<SessionState>()((set, get) => ({
  ...INITIAL,
  initialize: (userId, meta, context) => {
    const previous = get();
    const old = previous.recovery;
    const same = old?.userId === userId && old.sessionId === meta.session_id && old.context === context;
    if (!same) { generation++; retryCount = 0; rateLimitedUntil = 0; }
    const loaded = same ? { state: old, storage: get().storage } : loadRecovery(userId, meta.session_id, context);
    const state = loaded.state ?? createRecovery(userId, meta, context);
    set({ meta, recovery: state, storage: loaded.storage, verified: false });
    if (!capability(meta)) { set({ status: "unsupported", message: "This session needs a compatible API upgrade. Pending answers are retained; input is paused.", retryAt: null }); return; }
    const contextMatches = context.startsWith("practice:") ? !["CLASSWORK", "HOMEWORK"].includes(meta.kind) : ["CLASSWORK", "HOMEWORK"].includes(meta.kind) && (meta.level_id === null || meta.level_id === context.split(":")[1]) && (meta.lesson_id === null || meta.lesson_id === (context.split(":")[2] || null));
    if (!contextMatches) { set({ status: "error", message: "Session context does not match this page. Input is paused." }); return; }
    try {
      const next = reconcile(state, meta);
      persist(next);
      const retainError = same && previous.status === "error" && next.pending.length > 0;
      set({ verified: true, status: retainError ? "error" : next.pending.length ? "pending" : "accepted",
        message: meta.state === "abandoned" ? "This session was abandoned. Unresolved answers are retained; new input is paused." : retainError ? previous.message : "",
        retryAt: retainError ? previous.retryAt : null });
    } catch (error) { failure(error); }
  },
  update: patch => { const r = get().recovery; if (r) persist({ ...r, ...patch }); },
  enqueue: (answer, isSkip, feedback) => {
    const { recovery: r, meta, status, verified } = get();
    if (!r || !meta || !verified || meta.state !== "active" || r.manifest || ["unsupported", "suspended"].includes(status)) return null;
    if (meta.question_states?.find(q => q.question_index === r.index)?.terminal) {
      set({ message: "This question is already complete on the server. Continue from its accepted outcome." });
      return null;
    }
    if (r.pending.length >= MAX_PENDING) { set({ message: "Recovery capacity reached (200 pending answers). Save pending work before continuing." }); return null; }
    const nextNumber = (r.issued[r.index] ?? 0) + 1;
    if (nextNumber > 32767) { set({ message: "Attempt identity limit reached. Finish or leave this session." }); return null; }
    const item = { question_index: r.index, attempt_number: nextNumber, answer: isSkip ? SKIP_ANSWER : answer, elapsed_ms: Math.min(2147483647, Math.max(0, Date.now() - r.questionStartedAt)), is_skip: isSkip };
    const next = { ...r, pending: [...r.pending, item], issued: { ...r.issued, [r.index]: nextNumber }, feedback: feedback ?? null, feedbackUntil: feedback ? Date.now() + 600 : null };
    if (new TextEncoder().encode(JSON.stringify(next)).length > MAX_BYTES) { set({ message: "Recovery storage capacity reached. Save pending work before continuing." }); return null; }
    persist(next);
    set({ status: status === "error" ? "error" : "pending" });
    return item;
  },
  advance: () => {
    const { recovery: r, meta } = get();
    if (!r || !meta || r.manifest) return;
    const now = Date.now();
    persist({ ...r, index: r.index + 1, input: "", feedback: null, feedbackUntil: null, retried: false, questionStartedAt: now, flashDeadline: meta.kind === "FLASH_CARDS" ? now + (meta.flash_speed_ms ?? 2000) : null });
  },
  flush: () => {
    if (flushInFlight) return flushInFlight;
    const { recovery: r, status, verified } = get();
    if (!r || !verified || ["unsupported", "suspended"].includes(status) || r.rejected.length || rateLimitedUntil > Date.now()) return Promise.resolve(false);
    const token = generation;
    const flight = (async () => {
      set({ status: "saving", message: "", retryAt: null });
      try {
        // Revalidate mutable capability and reconcile committed receipts before every replay.
        const { data: meta } = await apiClient.get<SessionMeta>(`/sessions/${r.sessionId}/`, { timeout: SESSION_REQUEST_TIMEOUT_MS });
        if (token !== generation) return false;
        get().initialize(r.userId, meta, r.context);
        if (get().status === "unsupported" || get().status === "error") return false;
        set({ status: "saving" });
        while (get().recovery?.pending.length) {
          const snapshot = get().recovery!.pending.slice(0, 100);
          try {
            const receipts = await submitBulk(r.sessionId, snapshot);
            if (token !== generation) return false;
            const latest = get().recovery;
            if (!latest) return false;
            persist(acknowledge(latest, receipts, ["CLASSWORK", "HOMEWORK"].includes(get().meta?.kind ?? "")));
          } catch (error) { if (token === generation) failure(error, snapshot); return false; }
        }
        retryCount = 0;
        set({ status: "accepted", retryAt: null });
        return true;
      } catch (error) { if (token === generation) failure(error); return false; }
    })().finally(() => { if (flushInFlight === flight) flushInFlight = null; });
    flushInFlight = flight;
    return flight;
  },
  finish: () => {
    if (finishInFlight) return finishInFlight;
    const r = get().recovery;
    if (!r) return Promise.resolve(null);
    if (!r.manifest) persist({ ...r, manifest: r.pending.map(({ question_index, attempt_number }) => ({ question_index, attempt_number })) });
    const token = generation;
    const flight = (async () => {
      if (!await get().flush() || token !== generation) return null;
      const latest = get().recovery;
      if (!latest) return null;
      set({ status: "saving" });
      try {
        const result = await finalize(latest.sessionId, latest.manifest ?? []);
        if (token !== generation) return null;
        try { sessionStorage.removeItem(storageKey(latest.userId, latest.sessionId)); } catch { set({ storage: "unavailable" }); }
        set({ recovery: { ...latest, manifest: null }, meta: get().meta ? { ...get().meta!, state: "submitted" } : null, status: "accepted", message: "" });
        return result;
      } catch (error) { if (token === generation) failure(error); return null; }
    })().finally(() => { if (finishInFlight === flight) finishInFlight = null; });
    finishInFlight = flight;
    return flight;
  },
  excludeRejected: () => {
    const r = get().recovery;
    if (!r || !r.rejected.length) return;
    const rejected = new Set(r.rejected.map(identityKey));
    persist({ ...r, pending: r.pending.filter(a => !rejected.has(identityKey(a))), manifest: r.manifest?.filter(a => !rejected.has(identityKey(a))) ?? null, rejected: [], feedback: null, feedbackUntil: null });
    retryCount = 0;
    set({ status: "pending", message: "Rejected answers explicitly excluded. Retry saving the remaining work." });
  },
  suspend: () => { generation++; flushInFlight = null; finishInFlight = null; set({ status: "suspended", message: "Sign in again as the same learner to recover pending answers.", retryAt: null }); },
  clearSession: () => { generation++; rateLimitedUntil = 0; flushInFlight = null; finishInFlight = null; set(INITIAL); },
}));
