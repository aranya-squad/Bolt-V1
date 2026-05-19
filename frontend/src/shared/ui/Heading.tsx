// Bolt Abacus Design System — Heading
import type { ReactNode } from "react";

type Size = "hero" | "h1" | "h2" | "h3";
type Tone = "bone" | "yellow" | "sand";

interface HeadingProps {
  children: ReactNode;
  size?: Size;
  glow?: boolean;
  tone?: Tone;
}

const SIZES: Record<Size, { font: number; italic: boolean; weight: number; ls: string; lh: number }> = {
  hero: { font: 64, italic: true,  weight: 800, ls: "-0.05em", lh: 1.05 },
  h1:   { font: 48, italic: false, weight: 800, ls: "-0.02em", lh: 1.1  },
  h2:   { font: 36, italic: false, weight: 800, ls: "-0.02em", lh: 1.2  },
  h3:   { font: 28, italic: false, weight: 700, ls: "-0.015em",lh: 1.3  },
};

const TONES: Record<Tone, string> = {
  bone:   "var(--fg-bone)",
  yellow: "var(--y-bolt)",
  sand:   "var(--fg-sand)",
};

export function Heading({ children, size = "h1", glow = true, tone = "bone" }: HeadingProps) {
  const s = SIZES[size];
  return (
    <h1
      style={{
        margin: 0,
        fontFamily: "var(--font-display)",
        fontWeight: s.weight,
        fontStyle: s.italic ? "italic" : "normal",
        fontSize: s.font,
        lineHeight: s.lh,
        letterSpacing: s.ls,
        color: TONES[tone],
        textShadow: glow && tone === "yellow" ? "0 0 18px rgba(250,204,21,0.55)" : "none",
      }}
    >
      {children}
    </h1>
  );
}
