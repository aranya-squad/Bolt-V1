import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useStartClasswork } from "@/shared/api/queries/useClasswork";
import { LEVELS_QUERY_KEY } from "@/shared/api/queries/useLevels";
import { ME_QUERY_KEY } from "@/shared/api/queries/useMe";
import { useFinalizeSession, useSubmitAttempt } from "@/shared/api/queries/useSession";
import type { AttemptVerdict } from "@/shared/types";
import { BoltButton } from "@/shared/ui/BoltButton";
import { BreadcrumbChip } from "@/shared/ui/BreadcrumbChip";
import { FeedbackToast } from "@/shared/ui/FeedbackToast";
import { ProblemCanvas } from "@/shared/ui/ProblemCanvas";
import { ProgressBar } from "@/shared/ui/ProgressBar";

export default function ClassworkPage() {
  const { levelId, lessonId } = useParams<{ levelId: string; lessonId?: string }>();
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
    useStartClasswork(levelId!, lessonId);
  const { mutate: submitAttempt, isPending: submitting } = useSubmitAttempt(
    sessionMeta?.session_id ?? ""
  );
  const { mutate: finalizeSession } = useFinalizeSession(sessionMeta?.session_id ?? "");

  // Start session once on mount
  useEffect(() => {
    startSession(undefined, {
      onSuccess: (meta) => {
        setTimeLeft(meta.time_limit_sec > 0 ? meta.time_limit_sec : null);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId, lessonId]);

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
        if (levelId && lessonId) {
          queryClient.invalidateQueries({ queryKey: ["levels", levelId, "lessons"] });
        }
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
        },
      }
    );
  };

  const handleVerdictDismiss = () => {
    setVerdict(null);
    setInput("");
    if (sessionMeta && currentIndex + 1 >= sessionMeta.questions.length) {
      handleFinalize();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const timeLimitSec = sessionMeta?.time_limit_sec ?? 600;
  const timerValue = timeLeft !== null ? timeLeft : timeLimitSec;
  const timerMax = Math.max(timeLimitSec, 1);
  const timerPct = (timerValue / timerMax) * 100;
  const timerAccent = timerPct < 20 ? ("streak" as const) : ("yellow" as const);
  const question = sessionMeta?.questions[currentIndex];

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

  const verdictKey = verdict ? (verdict.is_correct ? "correct" : "wrong") : null;

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
        {/* Breadcrumb + progress */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            maxWidth: 480,
          }}
        >
          <BreadcrumbChip items={["LEARN", "CLASSWORK"]} />
          <span className="t-label" style={{ color: "var(--fg-sand)" }}>
            Q {currentIndex + 1} / {sessionMeta.questions.length}
            {timeLeft !== null && (
              <span style={{ marginLeft: "var(--s-sm)", color: timerPct < 20 ? "var(--err)" : "var(--fg-sand)" }}>
                {" "}· {timeLeft}s
              </span>
            )}
          </span>
        </div>

        {/* Problem */}
        <div style={{ width: "100%", maxWidth: 480 }}>
          <ProblemCanvas question={question.text} verdict={verdictKey} />
        </div>

        {/* Verdict feedback */}
        <FeedbackToast
          verdict={verdictKey}
          xpDelta={verdict?.xp_delta ?? 0}
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
