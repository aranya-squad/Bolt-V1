import { GlassCard } from "./GlassCard";
import { Icon } from "./Icon";
import { Chip } from "./Chip";
import { getRankName } from "@/shared/lib/rankNames";
import type { Level } from "@/shared/types";

interface LevelGridCardProps {
  level: Level;
  onClick?: () => void;
}

export function LevelGridCard({ level, onClick }: LevelGridCardProps) {
  const variant = level.is_completed ? "success" : level.is_locked ? "locked" : "active";

  return (
    <GlassCard
      variant={variant}
      style={{
        minHeight: 180,
        cursor: level.is_locked ? "not-allowed" : "pointer",
        pointerEvents: level.is_locked ? "none" : "auto",
      }}
      onClick={level.is_locked ? undefined : onClick}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          padding: "var(--s-lg)",
          minHeight: 180,
        }}
      >
        {/* Top row: order + state icon */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 40,
              lineHeight: 1,
              color: level.is_completed
                ? "var(--ok)"
                : level.is_locked
                ? "var(--fg-sand-30)"
                : "var(--y-bolt)",
            }}
          >
            {level.order}
          </span>
          {level.is_completed && (
            <Icon name="check-circle-2" size={20} color="var(--ok)" />
          )}
          {level.is_locked && (
            <Icon name="lock" size={18} color="var(--fg-sand-30)" />
          )}
        </div>

        {/* Bottom: rank + level name */}
        <div>
          <div
            style={{
              fontFamily: "var(--font-label)",
              fontSize: 10,
              letterSpacing: "0.15em",
              color: level.is_completed ? "var(--ok)" : "var(--y-bolt)",
              marginBottom: 4,
              textTransform: "uppercase",
            }}
          >
            {getRankName(level.order)}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 15,
              color: level.is_locked ? "var(--fg-sand-30)" : "var(--fg-bone)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: level.is_completed ? 8 : 0,
            }}
          >
            {level.name}
          </div>
          {level.is_completed && (
            <Chip tone="ok" style={{ fontSize: 10, padding: "3px 8px" }}>
              DONE
            </Chip>
          )}
          {!level.is_completed && !level.is_locked && (
            <Chip tone="yellow" style={{ fontSize: 10, padding: "3px 8px", marginTop: 8 }}>
              CURRENT MISSION
            </Chip>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
