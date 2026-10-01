// Figma frame 1:553 — In the Arena (active practice session)
import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/shared/api/queries/useSession";
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
  const { data: sessionMeta, isLoading, isError } = useSession(sessionId!);
  const onFinished = useCallback((result: ProgressRecord) => {
    void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    navigate(`/practice/victory/${result.session_id}`);
  }, [queryClient, navigate]);
  const recovery = useAnswerRecovery(sessionMeta, `practice:${sessionId}`, onFinished);
  const { blocked, complete, advance, update, enqueue } = recovery;
  const saved = recovery.recovery;
  const currentIndex = saved?.index ?? 0;
  const input = saved?.input ?? "";
  const verdict = saved?.feedback ?? null;
  const timeLeft = recovery.timeLeft;
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
    if (isFlash || saved.feedback.isCorrect || terminal) advanceQuestion();
    else update({ feedback: null, feedbackUntil: null, input: "", questionStartedAt: Date.now() });
  }, [saved?.feedback, blocked, isFlash, terminal, advanceQuestion, update]);
  const handleSkip = useCallback(() => {
    if (blocked || verdict) return;
    if (enqueue(0, true)) advanceQuestion();
  }, [blocked, verdict, enqueue, advanceQuestion]);
  const handleSubmit = () => {
    if (!sessionMeta || blocked || verdict) return;
    const parsed = Number(input);
    if (!input.trim() || !Number.isInteger(parsed) || parsed < -2147483648 || parsed > 2147483647) return;
    const isCorrect = parsed === sessionMeta.questions[currentIndex].answer;
    if (enqueue(parsed, false, { isCorrect, wasSkip: false, accepted: false })) update({ flashDeadline: null });
  };
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
        <BoltButton
          variant="ghost"
          size="sm"
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
    <main className="page-wrap" style={{ display: "flex", flexDirection: "column" }}>
      <SyncDot state={recovery.status === "accepted" ? "idle" : recovery.status === "saving" ? "sending" : recovery.status === "pending" ? "queued" : recovery.status}
        pending={saved.pending.length} message={recovery.message}
        storageWarning={recovery.storage !== "available" ? "Reload recovery is unavailable or damaged. Answers are held in memory only in this tab." : undefined}
        onRetry={recovery.status === "error" ? () => { void recovery.retry(); } : undefined}
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
        <div style={{ width: "100%", maxWidth: 480 }}>
          <RowProblemCanvas question={question?.text ?? "Session complete"} verdict={verdictKey} />
        </div>

        {/* Verdict feedback */}
        <FeedbackToast
          verdict={verdictKey}

        />

        {/* Answer input */}
        {!verdict && (
          <div style={{ display: "flex", gap: "var(--s-md)", width: "100%", maxWidth: 480 }}>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              disabled={blocked}
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/[^0-9]/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
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
            {!isFlash && (
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
