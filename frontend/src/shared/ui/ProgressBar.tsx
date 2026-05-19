// Bolt Abacus Design System — ProgressBar
type Accent = "yellow" | "blue" | "purple" | "streak";

interface ProgressBarProps {
  value: number;
  max?: number;
  accent?: Accent;
  height?: number;
  marker?: boolean;
}

const FILLS: Record<Accent, { bg: string; glow: string }> = {
  yellow: { bg: "var(--y-bolt)",                                                                    glow: "0 0 12px rgba(250,204,21,0.8)"  },
  blue:   { bg: "linear-gradient(90deg, var(--b-signal-soft), var(--bolt-blue))",                   glow: "0 0 12px rgba(59,130,246,0.7)"  },
  purple: { bg: "linear-gradient(90deg, var(--p-cyber-deep), var(--p-cyber))",                      glow: "0 0 10px rgba(221,183,255,0.5)" },
  streak: { bg: "linear-gradient(90deg, var(--orange-streak), var(--orange-streak-soft))",          glow: "0 0 14px rgba(255,138,61,0.7)"  },
};

export function ProgressBar({ value, max = 1, accent = "yellow", height = 8, marker = false }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value / max));
  const f = FILLS[accent];

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 9999,
        background: "var(--bg-ash)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          width: `${pct * 100}%`,
          height: "100%",
          background: f.bg,
          boxShadow: f.glow,
          transition: "width 600ms cubic-bezier(.2,.8,.2,1)",
        }}
      />
      {marker && (
        <div
          style={{
            position: "absolute",
            left: `calc(${pct * 100}% - 4px)`,
            top: 0,
            width: 4,
            height: "100%",
            background: "var(--fg-pure)",
            boxShadow: "0 0 8px var(--fg-pure)",
          }}
        />
      )}
    </div>
  );
}
