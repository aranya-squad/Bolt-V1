// Bolt Abacus Design System — HudStats
import { Icon } from "./Icon";

interface HudStatsProps {
  xp: number;
  streak: number;
  trophies: number;
}

const ITEMS = [
  { icon: "zap",    color: "var(--y-bolt)"        },
  { icon: "flame",  color: "var(--orange-streak)"  },
  { icon: "trophy", color: "var(--p-cyber)"        },
] as const;

export function HudStats({ xp, streak, trophies }: HudStatsProps) {
  const vals = [xp.toLocaleString(), streak, trophies];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {ITEMS.map((it, i) => (
        <div key={it.icon} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name={it.icon} size={14} color={it.color} strokeWidth={2.25} />
          <span
            style={{
              fontFamily: "var(--font-label)",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: "0.05em",
              color: "var(--fg-sand)",
            }}
          >
            {vals[i]}
          </span>
        </div>
      ))}
    </div>
  );
}
