import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useStartClasswork } from "@/shared/api/queries/useClasswork";
import { LEVELS_QUERY_KEY } from "@/shared/api/queries/useLevels";
import { ME_QUERY_KEY } from "@/shared/api/queries/useMe";
import { useBulkSubmit, useFinalizeSession } from "@/shared/api/queries/useSession";
import type { BulkAttemptItem } from "@/shared/api/queries/useSession";
import { BoltButton } from "@/shared/ui/BoltButton";
import { BreadcrumbChip } from "@/shared/ui/BreadcrumbChip";
import { ProblemCanvas } from "@/shared/ui/ProblemCanvas";
import { ProgressBar } from "@/shared/ui/ProgressBar";

const FLUSH_EVERY_N = 5;
const FLUSH_DEBOUNCE_MS = 3000;
const FLUSH_RETRIES = 3;

export default function ClassworkPage() {
  const { levelId, lessonId } = useParams<{ levelId: string; lessonId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [testMode, setTestMode] = useState(false);
  const questionStartMs = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const isFinalizingRef = useRef(false);
  const isFlushingRef = useRef(false);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Buffer of pending attempts not yet flushed to the server.
  const bufferRef = useRef<BulkAttemptItem[]>([]);

  const { mutate: startSession, data: sessionMeta, isPending: starting, isError: startError } =
    useStartClasswork(levelId!, lessonId);
  const { mutateAsync: bulkSubmitAsync } = useBulkSubmit(sessionMeta?.session_id ?? "");
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

  // Reset per-question timer and focus input on index change
  useEffect(() => {
    questionStartMs.current = Date.now();
    inputRef.current?.focus();
  }, [currentIndex]);

  // Flush the buffer to the bulk endpoint. Fire-and-forget for periodic flushes;
  // awaited only in handleFinalize (which also retries on failure).
  const doFlush = async () => {
    if (isFlushingRef.current || !bufferRef.current.length || !sessionMeta) return;
    isFlushingRef.current = true;
    const toFlush = [...bufferRef.current];
    const count = toFlush.length;
    try {
      await bulkSubmitAsync({ attempts: toFlush });
      bufferRef.current = bufferRef.current.slice(count);
    } catch {
      // Retain buffer; next flush or final flush will retry.
    } finally {
      isFlushingRef.current = false;
    }
  };

  // Schedule a debounce flush; also flush immediately every FLUSH_EVERY_N answers.
  const scheduleFlush = (bufferSize: number) => {
    if (bufferSize % FLUSH_EVERY_N === 0) {
      doFlush();
      return;
    }
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(doFlush, FLUSH_DEBOUNCE_MS);
  };

  const handleFinalize = async () => {
    if (isFinalizingRef.current) return;
    isFinalizingRef.current = true;
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    // Final flush with retry — exhausts remaining buffer before finalizing.
    let delay = 2000;
    for (let attempt = 0; attempt < FLUSH_RETRIES && bufferRef.current.length > 0; attempt++) {
      const toFlush = [...bufferRef.current];
      const count = toFlush.length;
      try {
        await bulkSubmitAsync({ attempts: toFlush });
        bufferRef.current = bufferRef.current.slice(count);
      } catch {
        if (attempt < FLUSH_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
        }
      }
    }

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

  const advance = () => {
    if (sessionMeta && currentIndex + 1 >= sessionMeta.questions.length) {
      handleFinalize();
    } else {
      setCurrentIndex((i) => i + 1);
      setInput("");
    }
  };

  const handleSubmit = () => {
    if (!sessionMeta) return;
    const parsed = parseInt(input, 10);
    if (isNaN(parsed)) return;
    const elapsed = Date.now() - questionStartMs.current;

    const next = [...bufferRef.current, { question_index: currentIndex, answer: parsed, elapsed_ms: elapsed }];
    bufferRef.current = next;
    scheduleFlush(next.length);
    advance();
  };

  const handleSkip = () => {
    if (testMode || !sessionMeta) return;
    const elapsed = Date.now() - questionStartMs.current;
    const next = [...bufferRef.current, { question_index: currentIndex, answer: -999999, elapsed_ms: elapsed }];
    bufferRef.current = next;
    scheduleFlush(next.length);
    advance();
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

  const breadcrumb = levelId
    ? ["LEVEL " + levelId, "CLASSWORK"]
    : ["LEARN", "CLASSWORK"];

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
            {/* Test Mode toggle chip — hides the Skip button when active */}
            <button
              type="button"
              onClick={() => setTestMode((v) => !v)}
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
                cursor: "pointer",
                transition: "background 180ms, color 180ms, border-color 180ms",
                flexShrink: 0,
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

        {/* Answer input + Skip */}
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
              disabled={input.trim() === ""}
            >
              SUBMIT
            </BoltButton>
          </div>

          {/* Skip button — hidden in test mode */}
          {!testMode && (
            <button
              type="button"
              onClick={handleSkip}
              style={{
                alignSelf: "flex-start",
                background: "transparent",
                border: "none",
                color: "var(--fg-sand)",
                fontFamily: "var(--font-label)",
                fontSize: 12,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
                opacity: 0.7,
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
      </div>
    </main>
  );
}
