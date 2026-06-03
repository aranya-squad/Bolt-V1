import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStartPractice } from "@/shared/api/queries/usePractice";
import { Page } from "@/shared/ui/Page";
import { BoltButton } from "@/shared/ui/BoltButton";
import { ConfigSlider } from "@/shared/ui/ConfigSlider";
import { OperationTileGrid } from "@/shared/ui/OperationTileGrid";

const ACCENT: Record<string, string> = {
  TIME_ATTACK:  "var(--orange-streak)",
  ZEN:          "var(--bolt-blue)",
  CUSTOM:       "var(--p-cyber)",
  FLASH_CARDS:  "var(--y-bolt)",
};

const DEFAULTS: Record<string, { operation: string; digits: number; rows: number; question_count: number; time_limit_sec: number }> = {
  TIME_ATTACK:  { operation: "ADD", digits: 2, rows: 2, question_count: 30, time_limit_sec: 120 },
  ZEN:          { operation: "ADD", digits: 2, rows: 2, question_count: 20, time_limit_sec: 0 },
  CUSTOM:       { operation: "ADD", digits: 2, rows: 2, question_count: 30, time_limit_sec: 120 },
  FLASH_CARDS:  { operation: "ADD", digits: 2, rows: 2, question_count: 20, time_limit_sec: 60 },
};

const MODE_LABELS: Record<string, string> = {
  TIME_ATTACK:  "SONIC SPEED",
  ZEN:          "ZEN MODE",
  CUSTOM:       "THE LAB",
  FLASH_CARDS:  "MEMORY MASTER",
};

export default function ArenaSetupPage() {
  const { mode = "CUSTOM" } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const defaults = DEFAULTS[mode] ?? DEFAULTS.CUSTOM;
  const accentColor = ACCENT[mode] ?? "var(--y-bolt)";

  const [operation, setOperation] = useState(defaults.operation);
  const [digits, setDigits] = useState(defaults.digits);
  const [rows, setRows] = useState(defaults.rows);
  const [questionCount, setQuestionCount] = useState(defaults.question_count);
  const [timeLimitSec, setTimeLimitSec] = useState(defaults.time_limit_sec);

  const { mutate: startPractice, isPending, isError } = useStartPractice();

  const isMulDiv = operation === "MUL" || operation === "DIV";
  const effectiveRows = isMulDiv ? 2 : rows;
  const showTimer = mode !== "ZEN";

  const handleStart = () => {
    startPractice(
      {
        mode,
        operation,
        digits,
        rows: effectiveRows,
        question_count: questionCount,
        time_limit_sec: mode === "ZEN" ? 0 : timeLimitSec,
      },
      {
        onSuccess: (session) => {
          navigate(`/practice/session/${session.session_id}`);
        },
      }
    );
  };

  return (
    <Page>
      <h1
        className="t-h1"
        style={{ color: accentColor, marginBottom: "var(--s-xl)" }}
      >
        {MODE_LABELS[mode] ?? mode}
      </h1>

      <div style={{ maxWidth: 560 }}>
        <OperationTileGrid value={operation} onChange={setOperation} />

        <ConfigSlider
          label="DIGITS"
          icon="hash"
          min={1}
          max={4}
          value={digits}
          onChange={setDigits}
        />

        <ConfigSlider
          label="ROWS"
          icon="rows-3"
          min={2}
          max={5}
          value={effectiveRows}
          onChange={setRows}
          disabled={isMulDiv}
          description={isMulDiv ? "Fixed at 2 rows for multiplication and division" : undefined}
        />

        <ConfigSlider
          label="QUESTIONS"
          icon="list-ordered"
          min={5}
          max={50}
          step={5}
          value={questionCount}
          onChange={setQuestionCount}
        />

        {showTimer && (
          <ConfigSlider
            label="TIME LIMIT"
            icon="timer"
            min={30}
            max={300}
            step={30}
            value={timeLimitSec}
            onChange={setTimeLimitSec}
            suffix="s"
          />
        )}

        {isError && (
          <p style={{ color: "var(--err)", marginBottom: "var(--s-md)", fontSize: "0.9rem" }}>
            Failed to start session. Please try again.
          </p>
        )}

        <BoltButton
          variant="primary"
          size="lg"
          icon="rocket"
          onClick={handleStart}
          disabled={isPending}
          style={{ width: "100%", marginTop: "var(--s-sm)" }}
        >
          {isPending ? "STARTING…" : "ENTER ARENA"}
        </BoltButton>
      </div>
    </Page>
  );
}
