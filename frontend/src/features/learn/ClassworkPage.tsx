import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useStartClasswork } from "@/shared/api/queries/useClasswork";
import { LEVELS_QUERY_KEY } from "@/shared/api/queries/useLevels";
import { ME_QUERY_KEY } from "@/shared/api/queries/useMe";
import { useSubmitAttempt, useFinalizeSession } from "@/shared/api/queries/useSession";
import { resolveVerdictAction } from "./verdictLogic";
import { BoltButton } from "@/shared/ui/BoltButton";
import { BreadcrumbChip } from "@/shared/ui/BreadcrumbChip";
import { Icon } from "@/shared/ui/Icon";
import { ProblemCanvas } from "@/shared/ui/ProblemCanvas";
import { ProgressBar } from "@/shared/ui/ProgressBar";

interface VerdictState {
  isCorrect: boolean;
  wasSkip: boolean;
}

export default function ClassworkPage() {
  const { levelId, lessonId } = useParams<{ levelId: string; lessonId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [verdict, setVerdict] = useState<VerdictState | null>(null);
  const [retriedThisQuestion, setRetriedThisQuestion] = useState(false);
  const questionStartMs = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const isFinalizingRef = useRef(false);

  const { mutate: startSession, data: sessionMeta, isPending: starting, isError: startError } =
    useStartClasswork(levelId!, lessonId);
  const { mutateAsync: submitAttempt, isPending: submitting } =
    useSubmitAttempt(sessionMeta?.session_id ?? "");
  const { mutate: finalizeSession } = useFinalizeSession(sessionMeta?.session_id ?? "");

  const handleBeginSession = () => {
    startSession(
      { is_test_mode: testMode },
      {
        onSuccess: (meta) => {
          setTimeLeft(meta.time_limit_sec > 0 ? meta.time_limit_sec : null);
        },
      }
    );
  };

  // Countdown timer — setTimeout chain
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
    return () => clearTimeout(id);
  }, [timeLeft]);

  // Timer expired → finalize
  useEffect(() => {
    if (timeLeft === 0 && sessionMeta) {
      handleFinalize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // Reset per-question state and focus input when moving to a new question
  useEffect(() => {
    questionStartMs.current = Date.now();
    setVerdict(null);
    setInput("");
    setRetriedThisQuestion(false);
    inputRef.current?.focus();
  }, [currentIndex]);

  // Refocus input after verdict is dismissed back to the same question (retry)
  useEffect(() => {
    if (verdict === null) {
      inputRef.current?.focus();
    }
  }, [verdict]);

  const handleFinalize = () => {
    if (isFinalizingRef.current) return;
    isFinalizingRef.current = true;
    finalizeSession(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: LEVELS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
        if (levelId && lessonId) {
          queryClient.invalidateQueries({ queryKey: ["levels", levelId, "lessons"] });
        }
        navigate(`/learn/level/${levelId}/report/${sessionMeta!.session_id}`);
      },
    });
  };

  const advanceOrFinalize = () => {
    const isLast = !!sessionMeta && currentIndex + 1 >= sessionMeta.questions.length;
    if (isLast) {
      handleFinalize();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  // Called when student dismisses the verdict panel (clicks "Next" or "Try Again")
  const handleVerdictDismiss = () => {
    if (!verdict) return;
    const isLast = !!sessionMeta && currentIndex + 1 >= sessionMeta.questions.length;
    const action = resolveVerdictAction({
      isCorrect: verdict.isCorrect,
      testMode,
      retriedThisQuestion,
      wasSkip: verdict.wasSkip,
      isLastQuestion: isLast,
    });
    if (action === "retry") {
      setRetriedThisQuestion(true);
      setVerdict(null);
    } else {
      advanceOrFinalize();
    }
  };

  const handleSubmit = async () => {
    if (!sessionMeta || submitting) return;
    const parsed = parseInt(input, 10);
    if (isNaN(parsed)) return;
    const elapsed = Date.now() - questionStartMs.current;
    try {
      const result = await submitAttempt({
        question_index: currentIndex,
        answer: parsed,
        elapsed_ms: elapsed,
      });
      setVerdict({ isCorrect: result.is_correct, wasSkip: false });
    } catch {
      // Network error — advance without feedback rather than blocking the student
      advanceOrFinalize();
    }
  };

  const handleSkip = async () => {
    if (testMode || !sessionMeta || submitting) return;
    const elapsed = Date.now() - questionStartMs.current;
    try {
      await submitAttempt({
        question_index: currentIndex,
        answer: -999999,
        elapsed_ms: elapsed,
      });
    } catch {
      // Swallow — skip is best-effort
    }
    setVerdict({ isCorrect: false, wasSkip: true });
  };

  const timeLimitSec = sessionMeta?.time_limit_sec ?? 600;
  const timerValue = timeLeft !== null ? timeLeft : timeLimitSec;
  const timerMax = Math.max(timeLimitSec, 1);
  const timerPct = (timerValue / timerMax) * 100;
  const timerAccent = timerPct < 20 ? ("streak" as const) : ("yellow" as const);
  const question = sessionMeta?.questions[currentIndex];

  // Pre-start: session not yet created — let student configure test mode before committing.
  if (!sessionMeta && !starting && !startError) {
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
              onClick={() => setTestMode((v) => !v)}
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

  if (starting) {
    return <div className="page-loading">PREPARING SESSION…</div>;
  }

  if (startError) {
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
    !retriedThisQuestion;

  return (
    <main className="page-wrap" style={{ display: "flex", flexDirection: "column" }}>
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
                disabled={input.trim() === "" || submitting}
              >
                {submitting ? "…" : "SUBMIT"}
              </BoltButton>
            </div>

            {/* Skip button — hidden in test mode */}
            {!testMode && (
              <button
                type="button"
                onClick={handleSkip}
                disabled={submitting}
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
