import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/shared/store/authStore";
import { storageKey } from "@/shared/store/answerRecovery";
import { useSessionStore } from "@/shared/store/sessionStore";
import type { ProgressRecord, SessionMeta } from "@/shared/types";

export function useAnswerRecovery(meta: SessionMeta | undefined, context: string, onFinished: (result: ProgressRecord) => void) {
  const store = useSessionStore();
  const userId = useAuthStore(s => s.user?.id);
  const hydrating = useAuthStore(s => s.isHydrating);
  const token = useAuthStore(s => s.accessToken);
  const submittedResumeId = useRef<string | null>(null);
  const completedSessionId = useRef<string | null>(null);
  const completedId = useRef<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const { initialize, flush, finish, status, retryAt } = store;
  const sessionId = meta?.session_id;
  const held = store.recovery?.userId === userId ? store.recovery : null;
  const needsSwitchChoice = store.switchBlocked || !!(held && held.context !== context && store.storage !== "available" && (held.pending.length || held.manifest));
  const returnTo = held?.context.startsWith("practice:") ? `/practice/session/${encodeURIComponent(held.sessionId)}`
    : held ? `/learn/level/${encodeURIComponent(held.context.split(":")[1])}${held.context.split(":")[2] ? `/lesson/${encodeURIComponent(held.context.split(":")[2])}` : ""}/classwork` : "/learn";
  const discardForSwitch = () => {
    if (held) {
      try { sessionStorage.removeItem(storageKey(held.userId, held.sessionId)); } catch { /* Explicit discard also clears the in-memory queue below. */ }
    }
    store.clearSession();
    if (meta && userId && !hydrating && token) initialize(userId, meta, context);
  };
  const recovery = store.recovery && store.recovery.sessionId === sessionId && store.recovery.userId === userId && store.recovery.context === context ? store.recovery : null;

  useEffect(() => {
    if (meta && userId && !hydrating && token) initialize(userId, meta, context);
  }, [meta, userId, hydrating, token, initialize, context]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);
  const complete = useCallback(async () => {
    const result = await finish();
    if (result && completedId.current !== result.id) {
      completedId.current = result.id;
      completedSessionId.current = result.session_id;
      onFinished(result);
    }
  }, [finish, onFinished]);
  useEffect(() => {
    if (store.meta?.state !== "submitted" || !store.verified || !recovery || needsSwitchChoice || !token || hydrating || completedSessionId.current === store.meta.session_id || submittedResumeId.current === store.meta.session_id) return;
    // Retrieve a confirmed existing result once; failures keep the manifest and normal retry actions.
    submittedResumeId.current = store.meta.session_id;
    void complete();
  }, [store.meta, store.verified, recovery, needsSwitchChoice, token, hydrating, complete]);
  const retry = useCallback(async () => {
    if (useSessionStore.getState().recovery?.manifest) await complete();
    else await flush();
  }, [complete, flush]);
  useEffect(() => {
    if (status !== "pending" || !recovery?.pending.length || recovery.rejected.length) return;
    // Cleanup makes the initial scheduling safe under StrictMode/remount.
    const timer = window.setTimeout(() => { void (recovery.manifest ? complete() : flush()); }, 0);
    return () => window.clearTimeout(timer);
  }, [status, recovery?.pending.length, recovery?.rejected.length, recovery?.manifest, complete, flush]);
  useEffect(() => {
    if (retryAt === null) return;
    const timer = window.setTimeout(() => { void retry(); }, Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryAt, retry]);
  useEffect(() => {
    const online = () => { void retry(); };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [retry]);
  const expired = recovery?.deadline !== null && recovery?.deadline !== undefined && now >= recovery.deadline;
  useEffect(() => {
    if (expired && recovery && !recovery.manifest && status !== "unsupported" && status !== "suspended") void complete();
  }, [expired, recovery, status, complete]);
  const timeLeft = recovery?.deadline == null ? null : Math.max(0, Math.ceil((recovery.deadline - now) / 1000));
  const blocked = needsSwitchChoice || !store.verified || !recovery || !token || hydrating || meta?.state !== "active" || ["unsupported", "suspended"].includes(status) || !!recovery.manifest || expired || recovery.pending.length >= 200 || recovery.rejected.length > 0 || !!store.conflict;
  const message = recovery && recovery.pending.length >= 200
    ? "Recovery capacity reached (200 pending answers). Save pending work before continuing."
    : store.message;
  return { ...store, message, recovery, heldPending: held?.pending.length ?? 0, needsSwitchChoice, returnTo, discardForSwitch, blocked, timeLeft, now, complete, retry };
}
