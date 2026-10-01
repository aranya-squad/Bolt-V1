import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useStartClasswork } from "@/shared/api/queries/useClasswork";
import { LEVELS_QUERY_KEY } from "@/shared/api/queries/useLevels";
import { ME_QUERY_KEY } from "@/shared/api/queries/useMe";
import { useSession } from "@/shared/api/queries/useSession";
import { useAnswerRecovery } from "@/shared/api/queries/useAnswerRecovery";
import { findRecoverySession } from "@/shared/store/answerRecovery";
import { useSessionStore } from "@/shared/store/sessionStore";
import { useAuthStore } from "@/shared/store/authStore";
import { SyncDot } from "@/shared/ui/SyncDot";
import type { ProgressRecord } from "@/shared/types";
import { resolveVerdictAction } from "./verdictLogic";
import { BoltButton } from "@/shared/ui/BoltButton";
import { BreadcrumbChip } from "@/shared/ui/BreadcrumbChip";
import { Icon } from "@/shared/ui/Icon";
import { ProblemCanvas } from "@/shared/ui/ProblemCanvas";
import { ProgressBar } from "@/shared/ui/ProgressBar";

export default function ClassworkPage() {
  const { levelId, lessonId } = useParams<{ levelId: string; lessonId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const context = `learn:${levelId}:${lessonId ?? ""}`;
  const userId = useAuthStore(s => s.user?.id);
  const resumeId = useMemo(() => {
    const held = useSessionStore.getState();
    return userId ? findRecoverySession(userId, context, held.meta?.state === "submitted" ? null : held.recovery) : null;
  }, [userId, context]);
  const [testModeOption, setTestModeOption] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: startSession, data: startedMeta, isPending: starting, isError: startError } = useStartClasswork(levelId!, lessonId);
  const resumed = useSession(resumeId ?? "");
  const sessionMeta = resumed.data ?? startedMeta;
  const onFinished = useCallback((result: ProgressRecord) => {
    void queryClient.invalidateQueries({ queryKey: LEVELS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    if (levelId && lessonId) void queryClient.invalidateQueries({ queryKey: ["levels", levelId, "lessons"] });
    navigate(`/learn/level/${levelId}/report/${result.session_id}`);
  }, [queryClient, levelId, lessonId, navigate]);
  const recovery = useAnswerRecovery(sessionMeta, context, onFinished);
  const saved = recovery.recovery;
  const currentIndex = saved?.index ?? 0;
  const input = saved?.input ?? "";
  const verdict = saved?.feedback?.accepted ? saved.feedback : null;
  const retriedThisQuestion = saved?.retried ?? false;
  const terminal = recovery.meta?.question_states?.find(q => q.question_index === currentIndex)?.terminal ?? false;
  const testMode = sessionMeta?.is_test_mode ?? testModeOption;
  const timeLeft = recovery.timeLeft;
  const submitting = recovery.status === "saving" || !!saved?.pending.length;
  const setInput = (input: string) => recovery.update({ input: input.slice(0, 12) });
  const handleBeginSession = () => startSession({ is_test_mode: testModeOption });
  const advanceOrFinalize = () => {
    if (!sessionMeta || recovery.blocked || !verdict) return;
    if (currentIndex + 1 >= sessionMeta.questions.length) void recovery.complete();
    else recovery.advance();
  };
  const handleVerdictDismiss = () => {
    if (!verdict || recovery.blocked || submitting) return;
    const action = resolveVerdictAction({ isCorrect: verdict.isCorrect, testMode, retriedThisQuestion, wasSkip: verdict.wasSkip, terminal, isLastQuestion: !!sessionMeta && currentIndex + 1 >= sessionMeta.questions.length });
    if (action === "retry") recovery.update({ retried: true, feedback: null, input: "", questionStartedAt: Date.now() });
    else advanceOrFinalize();
  };
  const handleSubmit = () => {
    if (recovery.blocked || submitting || verdict) return;
    const parsed = Number(input);
    if (!input.trim() || !Number.isInteger(parsed) || parsed < -2147483648 || parsed > 2147483647) return;
    recovery.enqueue(parsed, false);
  };
  const handleSkip = () => {
    if (!testMode && !recovery.blocked && !submitting && !verdict) recovery.enqueue(0, true);
  };
  useEffect(() => { inputRef.current?.focus(); }, [currentIndex, verdict]);

  const timeLimitSec = sessionMeta?.time_limit_sec ?? 600;
  const timerValue = timeLeft !== null ? timeLeft : timeLimitSec;
  const timerMax = Math.max(timeLimitSec, 1);
  const timerPct = (timerValue / timerMax) * 100;
  const timerAccent = timerPct < 20 ? ("streak" as const) : ("yellow" as const);
  const question = sessionMeta?.questions[currentIndex];

  if (recovery.needsSwitchChoice) {
    return <main className="page-wrap"><SyncDot state="error" pending={recovery.heldPending}
      message="Unsaved answers from another session are held only in memory. Return to save them or explicitly discard them before opening this session."
      onReturn={() => navigate(recovery.returnTo)} onDiscard={recovery.discardForSwitch} /></main>;
  }

  // Pre-start: session not yet created — let student configure test mode before committing.
  if (!sessionMeta && !starting && !startError && !resumeId) {
    const preStartBreadcrumb = levelId && lessonId
      ? ["LEARN", "LEVEL " + levelId, "CLASSWORK"]
      : levelId
      ? ["LEARN", "LEVEL " + levelId, "CLASSWORK"]
      : ["LEARN", "CLASSWORK"];
    return (
      <main
        className="page-wrap"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--s-xl)",
          gap: "var(--s-xl)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: "var(--s-xl)" }}>
          <BreadcrumbChip items={preStartBreadcrumb} />
          <div>
            <div
              style={{
                fontFamily: "var(--font-label)",
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--fg-sand)",
                marginBottom: 12,
              }}
            >
              Session Options
            </div>
            <button
              type="button"
              onClick={() => setTestModeOption((v) => !v)}
              style={{
                padding: "10px 16px",
                borderRadius: "var(--r-pill)",
                background: testMode ? "var(--y-bolt)" : "transparent",
                border: testMode
                  ? "1px solid var(--y-bolt)"
                  : "1px solid rgba(255,255,255,0.15)",
                color: testMode ? "var(--y-bolt-ink)" : "var(--fg-sand)",
                fontFamily: "var(--font-label)",
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "background 180ms, color 180ms, border-color 180ms",
              }}
            >
              TEST MODE — {testMode ? "ON" : "OFF"}
            </button>
            {testMode && (
              <p className="t-body-sm" style={{ color: "var(--fg-sand)", marginTop: 8, opacity: 0.7 }}>
                No hints. No retries. One shot per question.
              </p>
            )}
          </div>
          <BoltButton variant="primary" size="lg" onClick={handleBeginSession}>
            BEGIN SESSION
          </BoltButton>
        </div>
      </main>
    );
  }

  if (starting || (resumeId && resumed.isLoading)) {
    return <div className="page-loading">PREPARING SESSION…</div>;
  }

  if (startError || resumed.isError) {
    return (
      <div className="page-loading" style={{ flexDirection: "column", gap: "var(--s-md)" }}>
        <p style={{ color: "var(--err)" }}>Failed to start session.</p>
        <BoltButton variant="ghost" size="sm" onClick={() => navigate("/learn")}>
          Back to Levels
        </BoltButton>
      </div>
    );
  }

  if (!sessionMeta || !question) return null;

  const breadcrumb = levelId && lessonId
    ? ["LEARN", "LEVEL " + levelId, "CLASSWORK"]
    : levelId
    ? ["LEARN", "LEVEL " + levelId, "CLASSWORK"]
    : ["LEARN", "CLASSWORK"];

  const isLast = currentIndex + 1 >= sessionMeta.questions.length;
  const canRetry =
    verdict &&
    !verdict.isCorrect &&
    !verdict.wasSkip &&
    !testMode &&
    !retriedThisQuestion && !terminal;

  return (
    <main className="page-wrap" style={{ display: "flex", flexDirection: "column" }}>
      <SyncDot state={recovery.status === "accepted" ? "idle" : recovery.status === "saving" ? "sending" : recovery.status === "pending" ? "queued" : recovery.status}
        pending={saved?.pending.length} message={recovery.message}
        storageWarning={recovery.storage !== "available" ? "Reload recovery is unavailable or damaged. Answers are held in memory only in this tab." : undefined}
        onRetry={recovery.status === "error" ? () => { void recovery.retry(); } : undefined}
        conflict={recovery.conflict}
        onUseServerAnswer={recovery.conflict && recovery.verified && recovery.status !== "saving" ? () => { void recovery.useServerAnswer(); } : undefined}
        onExclude={saved?.rejected.length ? recovery.excludeRejected : undefined}
        onFinish={saved?.manifest && recovery.status !== "saving" ? () => { void recovery.complete(); } : undefined} />
      {/* Timer bar */}
      <ProgressBar value={timerValue} max={timerMax} accent={timerAccent} height={4} />

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
        {/* Breadcrumb + progress + Test Mode chip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            maxWidth: 480,
            gap: "var(--s-sm)",
          }}
        >
          <BreadcrumbChip items={breadcrumb} />
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s-sm)" }}>
            {/* Test Mode chip — locked once the session starts; toggleable only on the pre-start screen */}
            <button
              type="button"
              disabled
              style={{
                padding: "6px 12px",
                borderRadius: "var(--r-pill)",
                background: testMode ? "var(--y-bolt)" : "transparent",
                border: testMode
                  ? "1px solid var(--y-bolt)"
                  : "1px solid rgba(255,255,255,0.15)",
                color: testMode ? "var(--y-bolt-ink)" : "var(--fg-sand)",
                fontFamily: "var(--font-label)",
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "default",
                flexShrink: 0,
                opacity: testMode ? 1 : 0.5,
              }}
            >
              TEST MODE
            </button>
            <span className="t-label" style={{ color: "var(--fg-sand)" }}>
              Q {currentIndex + 1} / {sessionMeta.questions.length}
              {timeLeft !== null && (
                <span
                  style={{
                    marginLeft: "var(--s-sm)",
                    color: timerPct < 20 ? "var(--err)" : "var(--fg-sand)",
                  }}
                >
                  {" "}· {timeLeft}s
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Problem */}
        <div style={{ width: "100%", maxWidth: 480 }}>
          <ProblemCanvas question={question.text} verdict={null} />
        </div>

        {/* Verdict panel — shown after each submission, hidden during input */}
        {verdict ? (
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              borderRadius: "var(--r-xl)",
              border: `1px solid ${verdict.wasSkip ? "rgba(255,255,255,0.1)" : verdict.isCorrect ? "var(--ok)" : "var(--err)"}`,
              background: verdict.wasSkip
                ? "rgba(53,53,52,0.6)"
                : verdict.isCorrect
                ? "rgba(34,197,94,0.08)"
                : "rgba(239,68,68,0.08)",
              padding: "var(--s-lg) var(--s-xl)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--s-md)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--s-sm)" }}>
              {verdict.wasSkip ? (
                <Icon name="minus-circle" size={20} color="var(--fg-sand)" />
              ) : verdict.isCorrect ? (
                <Icon name="check-circle-2" size={20} color="var(--ok)" />
              ) : (
                <Icon name="x-circle" size={20} color="var(--err)" />
              )}
              <span
                style={{
                  fontFamily: "var(--font-label)",
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "0.08em",
                  color: verdict.wasSkip
                    ? "var(--fg-sand)"
                    : verdict.isCorrect
                    ? "var(--ok)"
                    : "var(--err)",
                }}
              >
                {verdict.wasSkip
                  ? "SKIPPED"
                  : verdict.isCorrect
                  ? "CORRECT!"
                  : canRetry
                  ? "WRONG — TRY AGAIN"
                  : "WRONG"}
              </span>
            </div>
            <BoltButton
              variant={verdict.isCorrect ? "primary" : "ghost"}
              size="sm"
              onClick={handleVerdictDismiss}
              disabled={recovery.blocked || submitting}
            >
              {canRetry ? "RETRY" : isLast ? "FINISH" : "NEXT"}
            </BoltButton>
          </div>
        ) : (
          /* Answer input + Skip — hidden while verdict is showing */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-sm)",
              width: "100%",
              maxWidth: 480,
            }}
          >
            <div style={{ display: "flex", gap: "var(--s-md)" }}>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                disabled={submitting || recovery.blocked}
                value={input}
                onChange={(e) =>
                  setInput(
                    e.target.value
                      .replace(/[^0-9-]/g, "")
                      .replace(/(?!^)-/g, "")
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                placeholder="Answer"
                className="field field--mono"
                style={{ flex: 1 }}
              />
              <BoltButton
                type="button"
                variant="primary"
                size="md"
                onClick={handleSubmit}
                disabled={input.trim() === "" || submitting || recovery.blocked}
              >
                {recovery.status === "saving" ? "…" : "SUBMIT"}
              </BoltButton>
            </div>

            {/* Skip button — hidden in test mode */}
            {!testMode && (
              <button
                type="button"
                onClick={handleSkip}
                disabled={submitting || recovery.blocked}
                style={{
                  alignSelf: "flex-start",
                  background: "transparent",
                  border: "none",
                  color: "var(--fg-sand)",
                  fontFamily: "var(--font-label)",
                  fontSize: 12,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  cursor: submitting ? "default" : "pointer",
                  opacity: submitting ? 0.4 : 0.7,
                  padding: "4px 0",
                  textDecoration: "underline",
                  textDecorationStyle: "dashed",
                  textUnderlineOffset: 3,
                }}
              >
                Skip question
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
