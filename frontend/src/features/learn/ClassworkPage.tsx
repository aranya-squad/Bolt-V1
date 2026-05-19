// Figma frame 1:619 — Classwork Practice session
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useStartClasswork } from "@/shared/api/queries/useClasswork";
import { LEVELS_QUERY_KEY } from "@/shared/api/queries/useLevels";
import { ME_QUERY_KEY } from "@/shared/api/queries/useMe";
import { useFinalizeSession, useSubmitAttempt } from "@/shared/api/queries/useSession";
import type { AttemptVerdict } from "@/shared/types";
import { BoltButton } from "@/shared/ui/BoltButton";
import { Chip } from "@/shared/ui/Chip";

export default function ClassworkPage() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [verdict, setVerdict] = useState<AttemptVerdict | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const questionStartMs = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const isFinalizingRef = useRef(false);

  const { mutate: startSession, data: sessionMeta, isPending: starting, isError: startError } =
    useStartClasswork(levelId!);
  const { mutate: submitAttempt, isPending: submitting } = useSubmitAttempt(
    sessionMeta?.session_id ?? ""
  );
  const { mutate: finalizeSession } = useFinalizeSession(sessionMeta?.session_id ?? "");

  // Start session once on mount
  useEffect(() => {
    startSession(undefined, {
      onSuccess: (meta) => {
        setTimeLeft(meta.time_limit_sec);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId]);

  // Countdown timer — setTimeout chain (idiomatic React pattern, no drift)
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

  // Reset per-question timer and focus input on index change
  useEffect(() => {
    questionStartMs.current = Date.now();
    inputRef.current?.focus();
  }, [currentIndex]);

  const handleFinalize = () => {
    if (isFinalizingRef.current) return;
    isFinalizingRef.current = true;
    finalizeSession(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: LEVELS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
        navigate(`/learn/level/${levelId}/report/${sessionMeta!.session_id}`);
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

  const timeLimitSec = sessionMeta?.time_limit_sec ?? 600;
  const timerPct = timeLeft !== null ? (timeLeft / timeLimitSec) * 100 : 100;
  const timerColor = timerPct < 20 ? "var(--err)" : "var(--y-bolt)";
  const question = sessionMeta?.questions[currentIndex];

  if (starting) {
    return <div className="page-loading">PREPARING SESSION…</div>;
  }

  if (startError) {
    return (
      <div
        className="page-loading"
        style={{ flexDirection: "column", gap: 16 }}
      >
        <p style={{ color: "var(--err)" }}>Failed to start session.</p>
        <BoltButton variant="ghost" size="sm" onClick={() => navigate("/learn")}>
          Back to Levels
        </BoltButton>
      </div>
    );
  }

  if (!sessionMeta || !question) return null;

  return (
    <main className="page-wrap" style={{ display: "flex", flexDirection: "column" }}>
      {/* Timer bar */}
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
          <span style={{ color: timerPct < 20 ? "var(--err)" : "var(--fg-sand)" }}>
            {timeLeft}s
          </span>
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
