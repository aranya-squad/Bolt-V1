import type { CSSProperties } from "react";
import { GlassCard } from "./GlassCard";

interface RowProblemCanvasProps {
  question: string;
  verdict: "correct" | "wrong" | null;
}

const VERDICT_BORDER: Record<"correct" | "wrong", string> = {
  correct: "1px solid var(--ok)",
  wrong: "1px solid var(--err)",
};

const VERDICT_GLOW: Record<"correct" | "wrong", string> = {
  correct: "0 0 18px rgba(74,222,128,0.6)",
  wrong: "0 0 18px rgba(255,180,171,0.6)",
};

const ROW_FONT: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 48,
  color: "var(--fg-bone)",
  letterSpacing: "0.02em",
  fontVariantNumeric: "tabular-nums",
  margin: 0,
  lineHeight: 1.4,
};

// Question text is pre-formatted with newlines (e.g. "  12\n+  8").
// Split to find the column width so "?" aligns with the rightmost digit.
export function RowProblemCanvas({ question, verdict }: RowProblemCanvasProps) {
  const lines = question.split("\n");
  const width = Math.max(...lines.map((l) => l.length));

  return (
    <GlassCard
      style={{
        border: verdict ? VERDICT_BORDER[verdict] : undefined,
        boxShadow: verdict ? VERDICT_GLOW[verdict] : undefined,
        transition: "border 150ms, box-shadow 150ms",
        padding: "var(--s-lg) var(--s-xl)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <pre style={ROW_FONT}>{question}</pre>
      <div
        style={{
          borderTop: "2px solid rgba(255,255,255,0.25)",
          margin: "8px 0",
        }}
      />
      <pre style={{ ...ROW_FONT, textAlign: "right" }}>
        {"?".padStart(width)}
      </pre>
    </GlassCard>
  );
}
