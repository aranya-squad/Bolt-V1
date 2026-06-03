// Bolt Abacus Design System — Chip
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";

type Tone = "neutral" | "yellow" | "purple" | "blue" | "orange" | "active" | "ok" | "err";

interface ChipProps {
  children: ReactNode;
  icon?: string;
  tone?: Tone;
  style?: CSSProperties;
}

const TONES: Record<Tone, { bg: string; border: string; color: string }> = {
  neutral: { bg: "rgba(53,53,52,0.8)", border: "rgba(255,255,255,0.08)", color: "var(--fg-bone)" },
  yellow:  { bg: "rgba(53,53,52,0.8)", border: "var(--y-bolt-30)",       color: "var(--y-bolt-deep)" },
  purple:  { bg: "rgba(53,53,52,0.8)", border: "var(--p-cyber-30)",      color: "var(--p-cyber)" },
  blue:    { bg: "rgba(53,53,52,0.8)", border: "var(--b-signal-30)",     color: "var(--bolt-blue)" },
  orange:  { bg: "rgba(53,53,52,0.8)", border: "rgba(249,115,22,0.3)",   color: "var(--orange-streak)" },
  active:  { bg: "rgba(0,0,0,0.5)",    border: "rgba(250,204,21,0.4)",   color: "var(--y-bolt)"         },
  ok:      { bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.3)", color: "var(--ok)"            },
  err:     { bg: "rgba(255,180,171,0.12)", border: "rgba(255,180,171,0.3)", color: "var(--err)"         },
};

export function Chip({ children, icon, tone = "neutral", style }: ChipProps) {
  const t = TONES[tone];
  return (
    <div
      style={{
        padding: "var(--s-sm) var(--s-md)",
        borderRadius: "var(--r-pill)",
        background: t.bg,
        border: `1px solid ${t.border}`,
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "var(--font-label)",
        fontWeight: 500,
        fontSize: 14,
        letterSpacing: "0.1em",
        color: t.color,
        textTransform: "uppercase",
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={14} color={t.color} strokeWidth={2.25} />}
      {children}
    </div>
  );
}
