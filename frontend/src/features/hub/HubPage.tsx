// i18n: TODO — all strings hardcoded English for Phase 2; wire translations in a later pass
// Figma frame 1:2 — Bolt Abacus Hub
import { useNavigate } from "react-router-dom";
import { useMe } from "@/shared/api/queries/useMe";

export default function HubPage() {
  const navigate = useNavigate();
  const { data: user } = useMe();

  const displayName = user?.profile?.display_name ?? "…";
  const totalXp = user?.stats?.total_xp ?? "—";
  const streak = user?.stats?.streak_days ?? "—";
  const levels = user?.stats?.levels_completed ?? "—";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-bg-base)",
        fontFamily: "var(--font-body)",
        color: "var(--color-text-primary)",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "var(--space-xl)",
        }}
      >
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <header style={{ marginBottom: "var(--space-2xl)" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(3rem, 8vw, 5rem)",
              color: "var(--color-primary)",
              margin: "0 0 var(--space-xs)",
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            BOLT ABACUS HUB
          </h1>
          <p
            style={{
              color: "var(--color-text-secondary)",
              margin: 0,
              fontSize: "1.05rem",
            }}
          >
            Welcome back,{" "}
            <strong style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
              {displayName}
            </strong>
          </p>
        </header>

        {/* ── HUD stats strip ────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-md)",
            marginBottom: "var(--space-2xl)",
          }}
        >
          <StatTile
            icon="⚡"
            value={String(totalXp)}
            label="Total XP"
            valueColor="var(--color-primary)"
          />
          <StatTile
            icon="🔥"
            value={String(streak)}
            label="Day Streak"
            valueColor="var(--color-accent-orange)"
          />
          <StatTile
            icon="🏆"
            value={String(levels)}
            label="Levels Done"
            valueColor="var(--color-accent-blue)"
          />
        </div>

        {/* ── Portal cards ───────────────────────────────────────────────── */}
        <div className="hub-portal-row">
          <PortalCard
            variant="learn"
            heading="LEARN"
            description="Classwork & structured lessons"
            accentColor="var(--color-primary)"
            onClick={() => navigate("/learn")}
          />
          <PortalCard
            variant="practice"
            heading="PRACTICE ARENA"
            description="Time Attack, Zen Mode & custom drills"
            accentColor="var(--color-accent-orange)"
            onClick={() => navigate("/practice")}
          />
        </div>
      </div>
    </main>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function StatTile({
  icon,
  value,
  label,
  valueColor,
}: {
  icon: string;
  value: string;
  label: string;
  valueColor: string;
}) {
  return (
    <div
      className="hub-stat-tile"
      style={{
        flex: 1,
        padding: "var(--space-md) var(--space-lg)",
        background: "var(--color-surface)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-border)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "1.5rem", marginBottom: "var(--space-xs)", lineHeight: 1 }}>
        {icon}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.9rem",
          color: valueColor,
          letterSpacing: "0.04em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "0.75rem",
          marginTop: "var(--space-xs)",
          letterSpacing: "0.04em",
        }}
      >
        {label.toUpperCase()}
      </div>
    </div>
  );
}

function PortalCard({
  variant,
  heading,
  description,
  accentColor,
  onClick,
}: {
  variant: "learn" | "practice";
  heading: string;
  description: string;
  accentColor: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`hub-portal-card hub-portal-card--${variant}`}
      style={{
        flex: 1,
        minHeight: 260,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "var(--space-xl)",
        borderRadius: "var(--radius-lg)",
        border: `1px solid ${accentColor}`,
        background: "var(--color-surface)",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "2.2rem",
          color: accentColor,
          letterSpacing: "0.04em",
          marginBottom: "var(--space-xs)",
          lineHeight: 1,
        }}
      >
        {heading}
      </div>
      <p
        style={{
          color: "var(--color-text-secondary)",
          margin: 0,
          fontSize: "0.9rem",
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </button>
  );
}
