import { GlassCard } from "./GlassCard";

interface ProblemCanvasProps {
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

export function ProblemCanvas({ question, verdict }: ProblemCanvasProps) {
  return (
    <GlassCard
      style={{
        border: verdict ? VERDICT_BORDER[verdict] : undefined,
        boxShadow: verdict ? VERDICT_GLOW[verdict] : undefined,
        transition: "border 150ms, box-shadow 150ms",
        padding: "var(--s-lg) var(--s-xl)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 56,
          color: "var(--fg-bone)",
          letterSpacing: "0.02em",
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {question} = ?
      </div>
    </GlassCard>
  );
}
