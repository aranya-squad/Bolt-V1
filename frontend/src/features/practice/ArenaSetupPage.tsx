import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStartPractice } from "@/shared/api/queries/usePractice";
import { BackLink } from "@/shared/ui/BackLink";
import { Page } from "@/shared/ui/Page";
import { BoltButton } from "@/shared/ui/BoltButton";

const ACCENT: Record<string, string> = {
  TIME_ATTACK: "var(--orange-streak)",
  ZEN:         "var(--bolt-blue)",
  CUSTOM:      "var(--p-cyber)",
};

const DEFAULTS: Record<string, { operation: string; digits: number; rows: number; question_count: number; time_limit_sec: number }> = {
  TIME_ATTACK: { operation: "ADD", digits: 2, rows: 2, question_count: 30, time_limit_sec: 120 },
  ZEN:         { operation: "ADD", digits: 2, rows: 2, question_count: 20, time_limit_sec: 0 },
  CUSTOM:      { operation: "ADD", digits: 2, rows: 2, question_count: 30, time_limit_sec: 120 },
};

const MODE_LABELS: Record<string, string> = {
  TIME_ATTACK: "TIME ATTACK",
  ZEN: "ZEN MODE",
  CUSTOM: "THE LAB",
};

function ToggleGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled,
  format,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  format?: (v: T) => string;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontFamily: "var(--font-label)",
          fontWeight: 500,
          fontSize: 12,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "var(--fg-sand)",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {options.map((opt) => {
          const isSelected = opt === value;
          return (
            <button
              key={String(opt)}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt)}
              style={{
                flex: 1,
                padding: "10px 0",
                background: isSelected ? "var(--y-bolt)" : "var(--md-surface-container)",
                border: `1px solid ${isSelected ? "var(--y-bolt)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 12,
                color: isSelected ? "var(--y-bolt-ink)" : disabled ? "var(--fg-sand-50)" : "var(--fg-bone)",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: "0.04em",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                transition: "all 150ms",
              }}
            >
              {format ? format(opt) : String(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
      <BackLink label="Training Arena" onClick={() => navigate("/practice")} />

      <h1
        className="t-h1"
        style={{ color: accentColor, marginTop: 24, marginBottom: 40 }}
      >
        {MODE_LABELS[mode] ?? mode}
      </h1>

      <div style={{ maxWidth: 560 }}>
        <ToggleGroup
          label="OPERATION"
          options={["ADD", "SUB", "MUL", "DIV"] as const}
          value={operation}
          onChange={(v) => setOperation(v)}
        />

        <ToggleGroup
          label="DIGITS"
          options={[1, 2, 3, 4] as const}
          value={digits}
          onChange={(v) => setDigits(v)}
        />

        <ToggleGroup
          label="ROWS"
          options={[2, 3, 4, 5] as const}
          value={effectiveRows}
          onChange={(v) => setRows(v)}
          disabled={isMulDiv}
        />

        <ToggleGroup
          label="QUESTIONS"
          options={[10, 20, 30, 50] as const}
          value={questionCount}
          onChange={(v) => setQuestionCount(v)}
        />

        {showTimer && (
          <ToggleGroup
            label="TIME LIMIT"
            options={[60, 120, 180, 300] as const}
            value={timeLimitSec}
            onChange={(v) => setTimeLimitSec(v)}
            format={(v) => `${v}s`}
          />
        )}

        {isError && (
          <p style={{ color: "var(--err)", marginBottom: 16, fontSize: "0.9rem" }}>
            Failed to start session. Please try again.
          </p>
        )}

        <BoltButton
          variant="primary"
          size="lg"
          onClick={handleStart}
          disabled={isPending}
          style={{ width: "100%", marginTop: 8 }}
        >
          {isPending ? "STARTING…" : "START"}
        </BoltButton>
      </div>
    </Page>
  );
}
