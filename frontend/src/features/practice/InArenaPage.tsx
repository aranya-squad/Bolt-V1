// Figma frame 1:553 — In the Arena (active practice session)
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useSession, useBulkSubmit, useFinalizeSession } from "@/shared/api/queries/useSession";
import { ME_QUERY_KEY } from "@/shared/api/queries/useMe";
import type { AttemptVerdict } from "@/shared/types";
import type { BulkAttemptItem } from "@/shared/api/queries/useSession";
import { BoltButton } from "@/shared/ui/BoltButton";
import { RowProblemCanvas } from "@/shared/ui/RowProblemCanvas";
import { FeedbackToast } from "@/shared/ui/FeedbackToast";

const FLUSH_RETRIES = 3;
const FLUSH_RETRY_DELAY_MS = 2000;

export default function InArenaPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [verdict, setVerdict] = useState<AttemptVerdict | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const questionStartMs = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const isFinalizingRef = useRef(false);
  // Buffer of all attempts, flushed to bulk endpoint on session finish.
  const pendingAttemptsRef = useRef<BulkAttemptItem[]>([]);
  // Tracks attempt number for the current question (increments on each wrong, resets on question advance).
  const attemptNumberRef = useRef(0);
  // Flash-card per-card auto-advance timer (cleared on submit to prevent double-advance).
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: sessionMeta, isLoading, isError } = useSession(sessionId!);
  const { mutateAsync: bulkSubmitAsync } = useBulkSubmit(sessionId!);
  const { mutate: finalizeSession } = useFinalizeSession(sessionId!);

  const hasTimer = (sessionMeta?.time_limit_sec ?? 0) > 0;

  // Init timer once when session loads
  useEffect(() => {
    if (sessionMeta && sessionMeta.time_limit_sec > 0 && timeLeft === null) {
      setTimeLeft(sessionMeta.time_limit_sec);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionMeta?.session_id]);

  // Countdown timer — setTimeout chain
  useEffect(() => {
    if (!hasTimer || timeLeft === null || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, hasTimer]);

  // Timer expired → finalize
  useEffect(() => {
    if (hasTimer && timeLeft === 0 && sessionMeta) {
      handleFinalize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // Reset timing and attempt count on question advance, and focus the input.
  useEffect(() => {
    questionStartMs.current = Date.now();
    attemptNumberRef.current = 0;
    inputRef.current?.focus();
  }, [currentIndex]);

  // Flash-card per-card auto-advance: after flashSpeedMs, skip if not answered.
  const flashSpeedMs = sessionMeta?.flash_speed_ms ?? 2000;
  useEffect(() => {
    if (!sessionMeta || sessionMeta.kind !== "FLASH_CARDS") return;
    flashTimerRef.current = setTimeout(() => {
      // verdict is always null here (cleared on question advance); skip = no answer.
      const elapsed = Date.now() - questionStartMs.current;
      pendingAttemptsRef.current = [
        ...pendingAttemptsRef.current,
        {
          question_index: currentIndex,
          answer: 0,
          elapsed_ms: elapsed,
          attempt_number: 0,
          is_skip: true,
        },
      ];
      if (sessionMeta && currentIndex + 1 >= sessionMeta.questions.length) {
        handleFinalize();
      } else {
        setCurrentIndex((i) => i + 1);
      }
    }, flashSpeedMs);
    return () => {
      if (flashTimerRef.current !== null) {
        clearTimeout(flashTimerRef.current);
        flashTimerRef.current = null;
      }
    };
    // currentIndex and sessionMeta.session_id are the only meaningful deps here;
    // flashSpeedMs and questions.length are stable for the session lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, sessionMeta?.session_id]);

  // Flush buffered attempts to bulk endpoint with retry on failure.
  // Errors after all retries are swallowed — finalizeSession is the safety net.
  const flushAttempts = async () => {
    const attempts = pendingAttemptsRef.current;
    if (!attempts.length) return;
    let delay = FLUSH_RETRY_DELAY_MS;
    for (let i = 0; i < FLUSH_RETRIES; i++) {
      try {
        await bulkSubmitAsync({ attempts });
        pendingAttemptsRef.current = [];
        return;
      } catch {
        if (i < FLUSH_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
        }
      }
    }
  };

  const handleFinalize = async () => {
    if (isFinalizingRef.current) return;
    isFinalizingRef.current = true;
    await flushAttempts();
    finalizeSession(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
        navigate(`/practice/victory/${sessionId}`);
      },
    });
  };

  const isFlash = sessionMeta?.kind === "FLASH_CARDS";

  const advanceQuestion = () => {
    if (sessionMeta && currentIndex + 1 >= sessionMeta.questions.length) {
      handleFinalize();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleVerdictDismiss = () => {
    const wasCorrect = verdict?.is_correct ?? false;
    setVerdict(null);
    setInput("");
    if (isFlash || wasCorrect) {
      // Correct answer (any mode) or flash card (advance regardless of outcome)
      advanceQuestion();
    } else {
      // Wrong in non-flash: stay on same question for retry; reset timing for this attempt
      questionStartMs.current = Date.now();
      inputRef.current?.focus();
    }
  };

  const handleSkip = () => {
    const elapsed = Date.now() - questionStartMs.current;
    pendingAttemptsRef.current = [
      ...pendingAttemptsRef.current,
      {
        question_index: currentIndex,
        answer: 0,
        elapsed_ms: elapsed,
        attempt_number: attemptNumberRef.current,
        is_skip: true,
      },
    ];
    setInput("");
    advanceQuestion();
  };

  const handleSubmit = () => {
    if (!sessionMeta || verdict) return;
    const parsed = parseInt(input, 10);
    if (isNaN(parsed)) return;
    // Cancel flash auto-advance: user submitted before the timer fired.
    if (flashTimerRef.current !== null) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    const elapsed = Date.now() - questionStartMs.current;
    const question = sessionMeta.questions[currentIndex];

    // Grade client-side against the answer included in the practice payload.
    const isCorrect = parsed === question.answer;
    setVerdict({ question_index: currentIndex, is_correct: isCorrect, xp_delta: 0 });

    pendingAttemptsRef.current = [
      ...pendingAttemptsRef.current,
      {
        question_index: currentIndex,
        answer: parsed,
        elapsed_ms: elapsed,
        attempt_number: attemptNumberRef.current,
      },
    ];

    // In non-flash mode, a wrong answer increments attempt_number for the retry.
    if (!isCorrect && !isFlash) {
      attemptNumberRef.current += 1;
    }
  };

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

  if (!sessionMeta) return null;

  const question = sessionMeta.questions[currentIndex];
  const timeLimitSec = sessionMeta.time_limit_sec;
  const timerPct = hasTimer && timeLeft !== null ? (timeLeft / timeLimitSec) * 100 : 100;
  const timerColor = timerPct < 20 ? "var(--err)" : "var(--y-bolt)";

  const verdictKey: "correct" | "wrong" | null = verdict
    ? verdict.is_correct
      ? "correct"
      : "wrong"
    : null;

  return (
    <main className="page-wrap" style={{ display: "flex", flexDirection: "column" }}>
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
          <RowProblemCanvas question={question.text} verdict={verdictKey} />
        </div>

        {/* Verdict feedback */}
        <FeedbackToast
          verdict={verdictKey}
          onDismiss={handleVerdictDismiss}
        />

        {/* Answer input */}
        {!verdict && (
          <div style={{ display: "flex", gap: "var(--s-md)", width: "100%", maxWidth: 480 }}>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
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
              disabled={input.trim() === ""}
            >
              SUBMIT
            </BoltButton>
            {!isFlash && (
              <BoltButton type="button" variant="ghost" size="md" onClick={handleSkip}>
                SKIP
              </BoltButton>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
