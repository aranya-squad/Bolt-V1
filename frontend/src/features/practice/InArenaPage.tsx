// Figma frame 1:553 — In the Arena (active practice session)
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/shared/api/queries/useSession";
import { DAILY_QUEST_QUERY_KEY } from "@/shared/api/queries/useDailyQuest";
import { isReceipt } from "@/shared/store/answerRecovery";
import "@/features/hub/dailyMission.css";
import { ME_QUERY_KEY } from "@/shared/api/queries/useMe";
import type { ProgressRecord } from "@/shared/types";
import { useAnswerRecovery } from "@/shared/api/queries/useAnswerRecovery";
import { SyncDot } from "@/shared/ui/SyncDot";
import { BoltButton } from "@/shared/ui/BoltButton";
import { RowProblemCanvas } from "@/shared/ui/RowProblemCanvas";
import { FeedbackToast } from "@/shared/ui/FeedbackToast";

export default function InArenaPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const inputRef = useRef<HTMLInputElement>(null);
  const { data: sessionMeta, isLoading, isError, refetch } = useSession(sessionId!);
  const onFinished = useCallback((result: ProgressRecord) => {
    void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: DAILY_QUEST_QUERY_KEY });
    navigate(`/practice/victory/${result.session_id}`);
  }, [queryClient, navigate]);
  const recovery = useAnswerRecovery(sessionMeta, `practice:${sessionId}`, onFinished);
  const { blocked, complete, advance, update, enqueue } = recovery;
  const saved = recovery.recovery;
  const currentIndex = saved?.index ?? 0;
  const input = saved?.input ?? "";
  const verdict = saved?.feedback ?? null;
  const timeLeft = recovery.timeLeft;
  const mission = sessionMeta?.daily_quest;
  const [acknowledged, setAcknowledged] = useState<{ sessionId: string; indexes: number[] }>({ sessionId: "", indexes: [] });
  const observedPending = useRef<{ sessionId: string | undefined; indexes: Set<number> }>({ sessionId, indexes: new Set() });
  if (observedPending.current.sessionId !== sessionId) observedPending.current = { sessionId, indexes: new Set() };
  for (const pending of saved?.pending ?? []) observedPending.current.indexes.add(pending.question_index);
  const currentReceipt = recovery.meta?.question_states?.find(q => q.question_index === currentIndex)?.latest_receipt;
  const acceptedFeedback = !!(verdict?.accepted && !verdict.wasSkip &&
    (observedPending.current.indexes.has(currentIndex) || isReceipt(currentReceipt) && !currentReceipt.is_skip));
  const acceptedIndexes = new Set(acknowledged.sessionId === sessionId ? acknowledged.indexes : []);
  for (const q of recovery.meta?.question_states ?? []) {
    if (isReceipt(q.latest_receipt) && !q.latest_receipt.is_skip) acceptedIndexes.add(q.question_index);
  }
  if (mission && acceptedFeedback) acceptedIndexes.add(currentIndex);
  const missionProgress = Math.min(5, acceptedIndexes.size);
  useEffect(() => {
    if (!mission || !sessionId || !acceptedFeedback) return;
    setAcknowledged(previous => {
      const indexes = previous.sessionId === sessionId ? previous.indexes : [];
      return indexes.includes(currentIndex) ? previous : { sessionId, indexes: [...indexes, currentIndex] };
    });
  }, [mission, sessionId, acceptedFeedback, currentIndex]);
  const serverComplete = recovery.verified && recovery.meta?.state === "active" &&
    recovery.meta.question_states?.length === recovery.meta.questions.length &&
    recovery.meta.question_states.every(q => q.terminal);
  const terminal = recovery.meta?.question_states?.find(q => q.question_index === currentIndex)?.terminal ?? false;
  const hasTimer = (sessionMeta?.time_limit_sec ?? 0) > 0;
  const isFlash = sessionMeta?.kind === "FLASH_CARDS";
  const flashSpeedMs = sessionMeta?.flash_speed_ms ?? 2000;
  const setInput = (input: string) => update({ input: input.slice(0, 12) });
  const advanceQuestion = useCallback(() => {
    if (!sessionMeta || blocked) return;
    if (currentIndex + 1 >= sessionMeta.questions.length) void complete();
    else advance();
  }, [sessionMeta, blocked, complete, advance, currentIndex]);
  const handleVerdictDismiss = useCallback(() => {
    if (!saved?.feedback || blocked) return;
    // Mission effort advances only after a validated server receipt. Keep feedback
    // alive when the network takes longer than its normal 600ms display window.
    if (mission) {
      if (acceptedFeedback) advanceQuestion();
      return;
    }
    if (isFlash || saved.feedback.isCorrect || terminal) advanceQuestion();
    else update({ feedback: null, feedbackUntil: null, input: "", questionStartedAt: Date.now() });
  }, [saved?.feedback, acceptedFeedback, blocked, mission, isFlash, terminal, advanceQuestion, update]);
  const handleSkip = useCallback(() => {
    if (blocked || verdict) return;
    if (enqueue(0, true)) advanceQuestion();
  }, [blocked, verdict, enqueue, advanceQuestion]);
  const handleSubmit = () => {
    if (!sessionMeta || blocked || verdict || (mission && saved?.pending.some(a => a.question_index === currentIndex))) return;
    const parsed = Number(input);
    if (!input.trim() || !Number.isInteger(parsed) || parsed < -2147483648 || parsed > 2147483647) return;
    const isCorrect = parsed === sessionMeta.questions[currentIndex].answer;
    if (enqueue(parsed, false, { isCorrect, wasSkip: false, accepted: false })) update({ flashDeadline: null });
  };
  useEffect(() => {
    // Restored browser feedback is not durable proof when a fresh server read
    // has no matching receipt. Reconstruct progress from the server instead.
    if (mission && recovery.verified && verdict?.accepted && !acceptedFeedback && !saved?.pending.length) update({ feedback: null, feedbackUntil: null, input: "" });
  }, [mission, recovery.verified, verdict, acceptedFeedback, saved?.pending.length, update]);
  useEffect(() => {
    // Browser state can be absent while all answers are already durable on the server.
    // Preserve visible feedback; otherwise use the usual manifest/drain/finalize path.
    if (serverComplete && saved && !saved.feedback && !saved.manifest) void complete();
  }, [serverComplete, saved, complete]);
  useEffect(() => {
    // On server reconciliation, a receipt may be durable with no local feedback.
    // Resume from that outcome without asking for a second answer.
    const receipt = recovery.meta?.question_states?.find(q => q.question_index === currentIndex)?.latest_receipt;
    if (mission && saved && !saved.feedback && !saved.manifest && !serverComplete && terminal && isReceipt(receipt) && !receipt.is_skip && !blocked) advanceQuestion();
  }, [mission, saved, recovery.meta, serverComplete, terminal, blocked, currentIndex, advanceQuestion]);
  useEffect(() => { inputRef.current?.focus(); }, [currentIndex, verdict]);
  useEffect(() => {
    if (!isFlash || blocked || verdict || saved?.flashDeadline == null) return;
    // Restore only this visible card; advancing always gives the next card its normal duration.
    const timer = window.setTimeout(handleSkip, Math.max(0, saved.flashDeadline - Date.now()));
    return () => window.clearTimeout(timer);
  }, [isFlash, blocked, verdict, saved?.flashDeadline, handleSkip]);
  useEffect(() => {
    if (!verdict || saved?.feedbackUntil == null || blocked) return;
    const timer = window.setTimeout(handleVerdictDismiss, Math.max(0, saved.feedbackUntil - Date.now()));
    return () => window.clearTimeout(timer);
  }, [verdict, saved?.feedbackUntil, blocked, handleVerdictDismiss]);

  if (recovery.needsSwitchChoice) {
    return <main className={`page-wrap${mission ? " mission-arena" : ""}`}><SyncDot state="error" pending={recovery.heldPending}
      message="Unsaved answers from another session are held only in memory. Return to save them or explicitly discard them before opening this session."
      onReturn={() => navigate(recovery.returnTo)} onDiscard={recovery.discardForSwitch} /></main>;
  }

  if (isLoading) {
    return <div className="page-loading">LOADING…</div>;
  }

  if (isError) {
    return (
      <div
        className="page-loading"
        style={{ flexDirection: "column", gap: "var(--s-md)" }}
      >
        <p style={{ color: "var(--err)" }}>Failed to load session.</p>
        <BoltButton variant="primary" size="md" onClick={() => { void refetch(); }}>RETRY SESSION</BoltButton>
        <BoltButton
          variant="ghost"
          size="md"
          style={{ minHeight: 44 }}
          onClick={() => {
            if (window.confirm("Abandon this session?")) {
              navigate("/practice");
            }
          }}
        >
          Back to Arena
        </BoltButton>
      </div>
    );
  }

  if (!sessionMeta || !saved) return null;

  const question = sessionMeta.questions[currentIndex];
  const timeLimitSec = sessionMeta.time_limit_sec;
  const timerPct = hasTimer && timeLeft !== null ? (timeLeft / timeLimitSec) * 100 : 100;
  const timerColor = timerPct < 20 ? "var(--err)" : "var(--y-bolt)";

  const verdictKey: "correct" | "wrong" | null = verdict
    ? verdict.isCorrect
      ? "correct"
      : "wrong"
    : null;

  return (
    <main className={`page-wrap${mission ? " mission-arena" : ""}`} style={{ display: "flex", flexDirection: "column" }}>
      <SyncDot state={recovery.status === "accepted" ? "idle" : recovery.status === "saving" ? "sending" : recovery.status === "pending" ? "queued" : recovery.status}
        pending={saved.pending.length} message={recovery.message}
        storageWarning={recovery.storage !== "available" ? "Reload recovery is unavailable or damaged. Answers are held in memory only in this tab." : undefined}
        onRetry={recovery.status === "error" ? () => { void recovery.retry(); } : undefined}
        conflict={recovery.conflict}
        onUseServerAnswer={recovery.conflict && recovery.verified && recovery.status !== "saving" ? () => { void recovery.useServerAnswer(); } : undefined}
        onExclude={saved.rejected.length ? recovery.excludeRejected : undefined}
        onFinish={saved.manifest && recovery.status !== "saving" ? () => { void complete(); } : undefined} />
      {/* Session countdown bar (Time Attack) */}
      {hasTimer && (
        <div style={{ width: "100%", height: 4, background: "var(--bg-ash)" }}>
          <div
            style={{
              width: `${timerPct}%`,
              height: "100%",
              background: timerColor,
              transition: "width 1s linear, background 0.3s",
            }}
          />
        </div>
      )}

      {/* Per-card flash countdown bar — resets on each question via key */}
      {isFlash && (
        <>
          <style>{`@keyframes flashCountdown{from{width:100%}to{width:0%}}`}</style>
          <div style={{ width: "100%", height: 4, background: "var(--bg-ash)" }}>
            <div
              key={`flash-bar-${currentIndex}`}
              style={{
                height: "100%",
                background: "var(--y-bolt)",
                animation: `flashCountdown ${flashSpeedMs}ms linear forwards`,
              }}
            />
          </div>
        </>
      )}

      <div
        className={mission ? "mission-arena-content" : undefined}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--s-xl)",
          gap: "var(--s-xl)",
        }}
      >
        {mission && <div className="mission-context">
          <h1 className="t-h2">Bolt Mission · Practice 5 questions</h1>
          <p>Level {mission.level_order} · {mission.level_name} · {mission.lesson_name}</p>
          <p>{mission.date} · {mission.timezone}</p>
          <p role="status" aria-live="polite">Saved {missionProgress}/5{saved.manifest ? " · Finishing your mission…" : saved.pending.length ? " · Answer saving…" : ""}</p>
        </div>}
        {/* Progress + timer */}
        <div
          className="t-label"
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            maxWidth: 480,
          }}
        >
          <span>Q {currentIndex + 1} / {sessionMeta.questions.length}</span>
          {hasTimer && (
            <span style={{ color: timerPct < 20 ? "var(--err)" : "var(--fg-sand)" }}>
              {timeLeft}s
            </span>
          )}
        </div>

        {/* Question */}
        <div className={mission ? "mission-problem" : undefined} style={{ width: "100%", maxWidth: 480 }}>
          <RowProblemCanvas
            // Mission generators return inline expressions. Stack whole operands
            // without changing arithmetic, so every row remains readable on mobile.
            question={mission && question ? question.text.replace(/\s*([+−\-×÷*/])\s*/g, "\n$1 ").trim() : question?.text ?? "Session complete"}
            verdict={verdictKey}
          />
        </div>

        {/* Verdict feedback */}
        {mission ? verdict && <p role="status" aria-live="polite">{verdict.accepted ? "Answer saved. Nice effort!" : "Saving your answer…"}</p> : <FeedbackToast verdict={verdictKey} />}

        {/* Answer input */}
        {!verdict && (
          <div className={mission ? "mission-answer-controls" : undefined} style={{ display: "flex", gap: "var(--s-md)", width: "100%", maxWidth: 480 }}>
            {mission && <label className="mission-answer-label" htmlFor="mission-answer">Your answer</label>}
            <input
              id={mission ? "mission-answer" : undefined}
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              disabled={blocked}
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/[^0-9]/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              aria-label="Answer"
              placeholder="Answer"
              className="field field--mono"
              style={{ flex: 1 }}
            />
            <BoltButton
              type="button"
              variant="primary"
              size="md"
              onClick={handleSubmit}
              disabled={input.trim() === "" || blocked}
            >
              SUBMIT
            </BoltButton>
            {!isFlash && !mission && (
              <BoltButton type="button" variant="ghost" size="md" onClick={handleSkip} disabled={blocked}>
                SKIP
              </BoltButton>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
