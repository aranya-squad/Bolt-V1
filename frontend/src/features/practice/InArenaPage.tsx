// Figma frame 1:553 — In the Arena (active practice session)
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useSession, useSubmitAttempt, useFinalizeSession } from "@/shared/api/queries/useSession";
import { ME_QUERY_KEY } from "@/shared/api/queries/useMe";
import type { AttemptVerdict } from "@/shared/types";
import { BoltButton } from "@/shared/ui/BoltButton";
import { Chip } from "@/shared/ui/Chip";

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

  const { data: sessionMeta, isLoading, isError } = useSession(sessionId!);
  const { mutate: submitAttempt, isPending: submitting } = useSubmitAttempt(sessionId!);
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

  // Focus input on question change
  useEffect(() => {
    questionStartMs.current = Date.now();
    inputRef.current?.focus();
  }, [currentIndex]);

  const handleFinalize = () => {
    if (isFinalizingRef.current) return;
    isFinalizingRef.current = true;
    finalizeSession(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
        navigate(`/practice/victory/${sessionId}`);
      },
    });
  };

  const handleSubmit = () => {
    if (!sessionMeta || submitting || verdict) return;
    const parsed = parseInt(input, 10);
    if (isNaN(parsed)) return;
    const elapsed = Date.now() - questionStartMs.current;

    submitAttempt(
      { question_index: currentIndex, answer: parsed, elapsed_ms: elapsed },
      {
        onSuccess: (v) => {
          setVerdict(v);
          setTimeout(() => {
            setVerdict(null);
            setInput("");
            if (currentIndex + 1 >= sessionMeta.questions.length) {
              handleFinalize();
            } else {
              setCurrentIndex((i) => i + 1);
            }
          }, 600);
        },
      }
    );
  };

  if (isLoading) {
    return <div className="page-loading">LOADING…</div>;
  }

  if (isError) {
    return (
      <div
        className="page-loading"
        style={{ flexDirection: "column", gap: 16 }}
      >
        <p style={{ color: "var(--err)" }}>Failed to load session.</p>
        <BoltButton variant="ghost" size="sm" onClick={() => navigate("/practice")}>
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

  return (
    <main className="page-wrap" style={{ display: "flex", flexDirection: "column" }}>
      {/* Timer bar */}
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
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            maxWidth: 480,
            color: "var(--fg-sand)",
            fontSize: "0.9rem",
            fontFamily: "var(--font-label)",
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
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 56,
            color: "var(--fg-bone)",
            letterSpacing: "0.02em",
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
            padding: verdict ? "16px 32px" : undefined,
            borderRadius: verdict ? 16 : undefined,
            border: verdict
              ? `1px solid ${verdict.is_correct ? "var(--ok)" : "var(--err)"}`
              : undefined,
            boxShadow: verdict
              ? verdict.is_correct
                ? "0 0 18px rgba(74,222,128,0.6)"
                : "0 0 18px rgba(255,180,171,0.6)"
              : undefined,
            transition: "border 150ms, box-shadow 150ms",
          }}
        >
          {question.text} = ?
        </div>

        {/* Verdict feedback chip */}
        {verdict && (
          <Chip
            tone={verdict.is_correct ? "ok" : "err"}
            icon={verdict.is_correct ? "check-circle-2" : "x-circle"}
          >
            {verdict.is_correct ? `+${verdict.xp_delta} XP` : "RECALCULATE"}
          </Chip>
        )}

        {/* Answer input */}
        {!verdict && (
          <div style={{ display: "flex", gap: 16, width: "100%", maxWidth: 480 }}>
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
              disabled={submitting || input.trim() === ""}
            >
              SUBMIT
            </BoltButton>
          </div>
        )}
      </div>
    </main>
  );
}
