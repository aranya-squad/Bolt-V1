import type { AcceptedReceipt, AttemptIdentity, SessionMeta } from "@/shared/types";

export const SKIP_ANSWER = -999999;
export const MAX_PENDING = 200;
export const MAX_BYTES = 256 * 1024;
export const RECOVERY_PREFIX = "bolt-recovery:";

export interface PendingAttempt extends AttemptIdentity {
  answer: number;
  elapsed_ms: number;
  is_skip: boolean;
}
export interface Feedback {
  isCorrect: boolean;
  wasSkip: boolean;
  accepted: boolean;
}
export interface RecoveryState {
  schema: 1;
  userId: string;
  sessionId: string;
  context: string;
  index: number;
  input: string;
  feedback: Feedback | null;
  retried: boolean;
  questionStartedAt: number;
  feedbackUntil: number | null;
  deadline: number | null;
  flashDeadline: number | null;
  pending: PendingAttempt[];
  issued: Record<string, number>;
  manifest: AttemptIdentity[] | null;
  rejected: AttemptIdentity[];
}
export type StorageStatus = "available" | "unavailable" | "corrupt";
export const identityKey = (a: AttemptIdentity) => `${a.question_index}:${a.attempt_number}`;
const object = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const integer = (x: unknown, min: number, max: number): x is number => typeof x === "number" && Number.isInteger(x) && x >= min && x <= max;
const timestamp = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0;
const nullableTime = (x: unknown) => x === null || timestamp(x);
export function isIdentity(x: unknown): x is AttemptIdentity {
  return object(x) && integer(x.question_index, 0, 32767) && integer(x.attempt_number, 1, 32767);
}
export function isPending(x: unknown): x is PendingAttempt {
  return isIdentity(x) && object(x) && integer(x.answer, -2147483648, 2147483647) && integer(x.elapsed_ms, 0, 2147483647) && typeof x.is_skip === "boolean" && (x.is_skip ? x.answer === SKIP_ANSWER : x.answer !== SKIP_ANSWER);
}
export function isReceipt(x: unknown): x is AcceptedReceipt {
  return isIdentity(x) && object(x) && x.contract_version === 2 && x.accepted === true && integer(x.submitted_answer, -2147483648, 2147483647) && integer(x.elapsed_ms, 0, 2147483647) && typeof x.is_skip === "boolean" && typeof x.is_correct === "boolean" && (x.is_skip ? x.submitted_answer === SKIP_ANSWER && !x.is_correct : x.submitted_answer !== SKIP_ANSWER) && x.xp_delta === 0;
}
export function matchesReceipt(a: PendingAttempt, r: unknown): r is AcceptedReceipt {
  return isReceipt(r) && identityKey(a) === identityKey(r) && a.answer === r.submitted_answer && a.elapsed_ms === r.elapsed_ms && a.is_skip === r.is_skip;
}
export function validateBulk(value: unknown, snapshot: PendingAttempt[]): AcceptedReceipt[] {
  if (!object(value) || value.contract_version !== 2 || !Array.isArray(value.verdicts) || value.verdicts.length !== snapshot.length) throw new Error("API response is incompatible. Reload after the API is upgraded; answers remain pending.");
  const receipts: AcceptedReceipt[] = [];
  for (const item of snapshot) {
    const matches = value.verdicts.filter(r => isReceipt(r) && identityKey(r) === identityKey(item));
    if (matches.length !== 1 || !matchesReceipt(item, matches[0])) throw new Error("API acknowledgment does not match the saved answer. Answers remain pending.");
    receipts.push(matches[0]);
  }
  return receipts;
}
export function acknowledge(state: RecoveryState, receipts: AcceptedReceipt[], classwork = false): RecoveryState {
  const accepted = new Map(receipts.map(r => [identityKey(r), r]));
  const current = receipts.filter(r => r.question_index === state.index).sort((a, b) => b.attempt_number - a.attempt_number)[0];
  return {
    ...state,
    pending: state.pending.filter(a => !matchesReceipt(a, accepted.get(identityKey(a)))),
    // Practice keeps immediate feedback. Classwork feedback appears only after acceptance.
    feedback: current && current.attempt_number === state.issued[state.index] && (classwork || state.feedback) ? { isCorrect: current.is_correct, wasSkip: current.is_skip, accepted: true } : state.feedback,
  };
}
function isRecovery(x: unknown): x is RecoveryState {
  if (!object(x) || x.schema !== 1 || typeof x.userId !== "string" || typeof x.sessionId !== "string" || typeof x.context !== "string" || !integer(x.index, 0, 32767) || typeof x.input !== "string" || x.input.length > 32 || typeof x.retried !== "boolean" || !timestamp(x.questionStartedAt) || !nullableTime(x.feedbackUntil) || !nullableTime(x.deadline) || !nullableTime(x.flashDeadline)) return false;
  if (x.feedback !== null && (!object(x.feedback) || typeof x.feedback.isCorrect !== "boolean" || typeof x.feedback.wasSkip !== "boolean" || typeof x.feedback.accepted !== "boolean")) return false;
  if (!Array.isArray(x.pending) || x.pending.length > MAX_PENDING || !x.pending.every(isPending) || new Set(x.pending.map(identityKey)).size !== x.pending.length || !object(x.issued) || !Object.entries(x.issued).every(([k, n]) => /^\d+$/.test(k) && integer(n, 0, 32767))) return false;
  if (x.manifest !== null && (!Array.isArray(x.manifest) || x.manifest.length > MAX_PENDING || !x.manifest.every(isIdentity) || new Set(x.manifest.map(identityKey)).size !== x.manifest.length)) return false;
  return Array.isArray(x.rejected) && x.rejected.length <= MAX_PENDING && x.rejected.every(isIdentity);
}
export const storageKey = (userId: string, sessionId: string) => `${RECOVERY_PREFIX}${userId}:${sessionId}`;
export function loadRecovery(userId: string, sessionId: string, context: string): { state: RecoveryState | null; storage: StorageStatus } {
  try {
    const raw = sessionStorage.getItem(storageKey(userId, sessionId));
    if (!raw) return { state: null, storage: "available" };
    if (new TextEncoder().encode(raw).length > MAX_BYTES) return { state: null, storage: "corrupt" };
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return { state: null, storage: "corrupt" }; }
    if (!isRecovery(parsed) || parsed.userId !== userId || parsed.sessionId !== sessionId || parsed.context !== context) return { state: null, storage: "corrupt" };
    // Reconstruct only our fields: unknown/private properties are never persisted.
    const { schema, index, input, feedback, retried, questionStartedAt, feedbackUntil, deadline, flashDeadline, pending, issued, manifest, rejected } = parsed;
    const copyIdentity = ({ question_index, attempt_number }: AttemptIdentity) => ({ question_index, attempt_number });
    return { state: {
      schema, userId, sessionId, context, index, input, retried, questionStartedAt, feedbackUntil, deadline, flashDeadline,
      feedback: feedback ? { isCorrect: feedback.isCorrect, wasSkip: feedback.wasSkip, accepted: feedback.accepted } : null,
      pending: pending.map(({ question_index, attempt_number, answer, elapsed_ms, is_skip }) => ({ question_index, attempt_number, answer, elapsed_ms, is_skip })),
      issued: { ...issued }, manifest: manifest?.map(copyIdentity) ?? null, rejected: rejected.map(copyIdentity),
    }, storage: "available" };
  } catch { return { state: null, storage: "unavailable" }; }
}
export function saveRecovery(state: RecoveryState): StorageStatus {
  try {
    const raw = JSON.stringify(state);
    if (new TextEncoder().encode(raw).length > MAX_BYTES) return "unavailable";
    sessionStorage.setItem(storageKey(state.userId, state.sessionId), raw);
    return "available";
  } catch { return "unavailable"; }
}
export function findRecoverySession(userId: string, context: string): string | null {
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key?.startsWith(`${RECOVERY_PREFIX}${userId}:`)) continue;
      const sessionId = key.slice(`${RECOVERY_PREFIX}${userId}:`.length);
      if (loadRecovery(userId, sessionId, context).state) return sessionId;
    }
  } catch { /* Storage unavailable is reported when the session initializes. */ }
  return null;
}
export function clearRecoveryStorage(keepUserId?: string): void {
  try {
    const keys = Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i));
    keys.forEach(key => { if (key?.startsWith(RECOVERY_PREFIX) && (!keepUserId || !key.startsWith(`${RECOVERY_PREFIX}${keepUserId}:`))) sessionStorage.removeItem(key); });
  } catch { /* Memory is cleared independently when browser storage is denied. */ }
}
export function hasStoredPending(): boolean {
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key?.startsWith(RECOVERY_PREFIX)) continue;
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const value: unknown = JSON.parse(raw);
        if (!isRecovery(value) || value.pending.length || value.manifest) return true;
      }
    }
  } catch { return true; }
  return false;
}
export function createRecovery(userId: string, meta: SessionMeta, context: string, now = Date.now()): RecoveryState {
  const remaining = meta.time_limit_sec > 0 ? Math.max(0, meta.time_limit_sec * 1000 - (Date.parse(meta.server_now ?? "") - Date.parse(meta.started_at ?? ""))) : null;
  const states = Array.isArray(meta.question_states) ? meta.question_states : [];
  const question = states.find(q => q && !q.terminal) ?? states[states.length - 1];
  const index = question?.question_index ?? 0;
  const classwork = ["CLASSWORK", "HOMEWORK"].includes(meta.kind);
  const receipt = question?.latest_receipt;
  return { schema: 1, userId, sessionId: meta.session_id, context, index, input: "", feedback: classwork && receipt ? { isCorrect: receipt.is_correct, wasSkip: receipt.is_skip, accepted: true } : null, retried: classwork && (question?.attempt_count ?? 0) >= 2, questionStartedAt: now, feedbackUntil: null, deadline: remaining === null || !Number.isFinite(remaining) ? null : now + remaining, flashDeadline: meta.kind === "FLASH_CARDS" ? now + (meta.flash_speed_ms ?? 2000) : null, pending: [], issued: {}, manifest: null, rejected: [] };
}
export function reconcile(state: RecoveryState, meta: SessionMeta): RecoveryState {
  if (state.index >= meta.questions.length || state.pending.some(a => a.question_index >= meta.questions.length)) throw new Error("Saved question position is incompatible with this session.");
  let next = state;
  for (const item of state.pending) {
    next = { ...next, issued: { ...next.issued, [item.question_index]: Math.max(next.issued[item.question_index] ?? 0, item.attempt_number) } };
  }
  for (const question of meta.question_states ?? []) {
    next = { ...next, issued: { ...next.issued, [question.question_index]: Math.max(next.issued[question.question_index] ?? 0, question.max_attempt_number) } };
    if (question.latest_receipt && isReceipt(question.latest_receipt)) {
      const item = next.pending.find(a => matchesReceipt(a, question.latest_receipt));
      if (item) next = acknowledge(next, [question.latest_receipt], ["CLASSWORK", "HOMEWORK"].includes(meta.kind));
    }
  }
  // Deadline can only become earlier on refresh, never restart on reload.
  const serverRemaining = meta.time_limit_sec * 1000 - (Date.parse(meta.server_now ?? "") - Date.parse(meta.started_at ?? ""));
  if (meta.time_limit_sec > 0 && Number.isFinite(serverRemaining)) next = { ...next, deadline: Math.min(next.deadline ?? Infinity, Date.now() + Math.max(0, serverRemaining)) };
  return next;
}
