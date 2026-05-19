// Bolt Abacus Design System — Label
import type { CSSProperties, ReactNode } from "react";

type Tone = "sand" | "yellow" | "error" | "ok";
type Spacing = "wide" | "tight";

interface LabelProps {
  children: ReactNode;
  tone?: Tone;
  spacing?: Spacing;
  style?: CSSProperties;
}

const TONES: Record<Tone, string> = {
  sand:   "var(--fg-sand)",
  yellow: "var(--y-bolt-deep)",
  error:  "var(--err)",
  ok:     "var(--ok)",
};

export function Label({ children, tone = "sand", spacing = "wide", style }: LabelProps) {
  return (
    <div
      style={{
        fontFamily: "var(--font-ui)",
        fontWeight: 500,
        fontSize: 14,
        letterSpacing: spacing === "wide" ? "0.3em" : "0.08em",
        textTransform: "uppercase",
        color: TONES[tone],
        ...style,
      }}
    >
      {children}
    </div>
  );
}
