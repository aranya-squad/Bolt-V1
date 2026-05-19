// Figma frame 1:397 — Arena Setup (practice session config)
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStartPractice } from "@/shared/api/queries/usePractice";
import { BackLink } from "@/shared/ui/BackLink";

const ACCENT: Record<string, string> = {
  TIME_ATTACK: "var(--color-accent-orange)",
  ZEN: "var(--color-accent-blue)",
  CUSTOM: "var(--color-accent-purple)",
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
  options: T[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  format?: (v: T) => string;
}) {
  const accentColor = "var(--color-primary)";
  return (
    <div style={{ marginBottom: "var(--space-lg)" }}>
      <div
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "0.8rem",
          fontWeight: 600,
          letterSpacing: "0.06em",
          marginBottom: "var(--space-sm)",
          fontFamily: "var(--font-body)",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: "var(--space-sm)" }}>
        {options.map((opt) => {
          const isSelected = opt === value;
          return (
            <button
              key={String(opt)}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt)}
              className="toggle-btn"
              style={{
                flex: 1,
                padding: "var(--space-sm) 0",
                background: isSelected ? accentColor : "var(--color-surface)",
                border: `1px solid ${isSelected ? accentColor : "var(--color-border)"}`,
                borderRadius: "var(--radius-md)",
                color: isSelected ? "#000" : disabled ? "var(--color-text-secondary)" : "var(--color-text-primary)",
                fontFamily: "var(--font-display)",
                fontSize: "1rem",
                letterSpacing: "0.04em",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
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
  const accentColor = ACCENT[mode] ?? "var(--color-primary)";

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
    <main className="page-wrap">
      <div className="page-content--narrow">
        <BackLink label="Training Arena" onClick={() => navigate("/practice")} />

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            color: accentColor,
            marginBottom: "var(--space-2xl)",
            letterSpacing: "0.04em",
          }}
        >
          {MODE_LABELS[mode] ?? mode}
        </h1>

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
          <p style={{ color: "var(--color-error)", marginBottom: "var(--space-md)", fontSize: "0.9rem" }}>
            Failed to start session. Please try again.
          </p>
        )}

        <button
          type="button"
          onClick={handleStart}
          disabled={isPending}
          className="btn btn-accent"
          style={{
            width: "100%",
            padding: "var(--space-md)",
            background: accentColor,
            marginTop: "var(--space-md)",
            fontSize: "1.4rem",
          }}
        >
          {isPending ? "STARTING…" : "START"}
        </button>
      </div>
    </main>
  );
}
