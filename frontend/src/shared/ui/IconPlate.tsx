// Bolt Abacus Design System — IconPlate
import { Icon } from "./Icon";

type Color = "yellow" | "purple" | "blue" | "orange";
type Shape = "square" | "pill";

interface IconPlateProps {
  icon?: string;
  src?: string;
  color?: Color;
  size?: number;
  shape?: Shape;
}

const COLORS: Record<Color, { border: string; glow: string; fg: string }> = {
  yellow: { border: "var(--y-bolt-30)",   glow: "var(--y-bolt-20)",   fg: "var(--y-bolt)" },
  purple: { border: "var(--p-cyber-30)",  glow: "var(--p-cyber-20)",  fg: "var(--p-cyber)" },
  blue:   { border: "var(--b-signal-30)", glow: "var(--b-signal-20)", fg: "var(--bolt-blue)" },
  orange: { border: "rgba(249,115,22,0.3)", glow: "rgba(249,115,22,0.2)", fg: "var(--orange-streak)" },
};

export function IconPlate({ icon, src, color = "yellow", size = 64, shape = "square" }: IconPlateProps) {
  const c = COLORS[color];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: shape === "pill" ? "var(--r-pill)" : "var(--r-lg)",
        background: "var(--bg-coal)",
        border: `1px solid ${c.border}`,
        boxShadow: `0 0 20px ${c.glow}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icon ? (
        <Icon name={icon} size={Math.round(size * 0.45)} color={c.fg} strokeWidth={2} />
      ) : src ? (
        <img src={src} alt="" style={{ width: size * 0.45, height: size * 0.45 }} />
      ) : null}
    </div>
  );
}
