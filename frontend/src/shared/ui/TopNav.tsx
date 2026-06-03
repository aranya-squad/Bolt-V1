// Bolt Abacus Design System — TopNav
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { HudStats } from "./HudStats";
import { LevelChip } from "./LevelChip";
import { Avatar } from "./Avatar";
import { ConnectionChip } from "./ConnectionChip";

interface TopNavProps {
  onNavigate?: (route: string) => void;
  current?: string;
  level?: number;
  xp?: number;
  streak?: number;
  trophies?: number;
  avatar?: string;
  showBack?: boolean;
  backLabel?: string;
  rightSlot?: ReactNode;
  connection?: string;
}

/** @deprecated Use ShellLayout (Sidebar + BottomNav). Delete post-Wave-5 QA. */
export function TopNav({
  onNavigate,
  current = "hub",
  level,
  xp = 0,
  streak = 0,
  trophies = 0,
  avatar,
  showBack = false,
  backLabel = "ABANDON RUN",
  rightSlot,
  connection,
}: TopNavProps) {
  void current;
  const effectiveConnection = connection ?? window.__BOLT_DEMO__?.connection ?? "good";

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        height: 77,
        boxSizing: "border-box",
        padding: "0 28px",
        background: "rgba(19,19,19,0.45)",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25), 0 0 12px rgba(238,194,0,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {showBack ? (
        <button
          onClick={() => onNavigate?.("hub")}
          style={{
            background: "none",
            border: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "var(--font-label)",
            fontWeight: 500,
            fontSize: 14,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--fg-sand)",
          }}
        >
          <Icon name="arrow-left" size={16} color="var(--fg-sand)" />
          {backLabel}
        </button>
      ) : (
        <button
          onClick={() => onNavigate?.("hub")}
          style={{
            background: "none",
            border: 0,
            cursor: "pointer",
            padding: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 28,
            letterSpacing: "0.1em",
            color: "var(--y-bolt-deep)",
            textShadow: "0 0 10px rgba(238,194,0,0.55)",
          }}
        >
          BOLT ABACUS
        </button>
      )}

      {rightSlot ?? (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {effectiveConnection !== "good" && (
            <ConnectionChip quality={effectiveConnection as "slow" | "poor" | "offline"} />
          )}
          <HudStats xp={xp} streak={streak} trophies={trophies} />
          <LevelChip level={level} />
          <Avatar src={avatar} active />
        </div>
      )}
    </div>
  );
}
