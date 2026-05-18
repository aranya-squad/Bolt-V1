// i18n: TODO — all strings hardcoded English for Phase 2; wire translations in a later pass
// Figma frame 1:2 — Bolt Abacus Hub
import { useNavigate } from "react-router-dom";
import { useMe } from "@/shared/api/queries/useMe";

const card: React.CSSProperties = {
  flex: 1,
  minHeight: 200,
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  padding: "var(--space-xl)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--color-border)",
  cursor: "pointer",
  background: "var(--color-surface)",
  textAlign: "left",
};

const statTile: React.CSSProperties = {
  flex: 1,
  padding: "var(--space-md) var(--space-lg)",
  background: "var(--color-surface)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  textAlign: "center",
};

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
        padding: "var(--space-xl)",
        fontFamily: "var(--font-body)",
        color: "var(--color-text-primary)",
        maxWidth: 960,
        margin: "0 auto",
      }}
    >
      {/* Hero */}
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2.5rem, 6vw, 4rem)",
          color: "var(--color-primary)",
          margin: "0 0 var(--space-xs)",
          letterSpacing: "0.04em",
        }}
      >
        BOLT ABACUS HUB
      </h1>
      <p style={{ color: "var(--color-text-secondary)", margin: "0 0 var(--space-xl)", fontSize: "1.1rem" }}>
        Welcome back, <strong style={{ color: "var(--color-text-primary)" }}>{displayName}</strong>
      </p>

      {/* HUD stats strip */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-md)",
          marginBottom: "var(--space-2xl)",
        }}
      >
        <div style={statTile}>
          <div style={{ fontSize: "1.6rem", marginBottom: "var(--space-xs)" }}>⚡</div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.8rem",
              color: "var(--color-primary)",
              letterSpacing: "0.04em",
            }}
          >
            {totalXp}
          </div>
          <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem", marginTop: 2 }}>
            Total XP
          </div>
        </div>

        <div style={statTile}>
          <div style={{ fontSize: "1.6rem", marginBottom: "var(--space-xs)" }}>🔥</div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.8rem",
              color: "var(--color-accent-orange)",
              letterSpacing: "0.04em",
            }}
          >
            {streak}
          </div>
          <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem", marginTop: 2 }}>
            Day Streak
          </div>
        </div>

        <div style={statTile}>
          <div style={{ fontSize: "1.6rem", marginBottom: "var(--space-xs)" }}>🏆</div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.8rem",
              color: "var(--color-accent-blue)",
              letterSpacing: "0.04em",
            }}
          >
            {levels}
          </div>
          <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem", marginTop: 2 }}>
            Levels Done
          </div>
        </div>
      </div>

      {/* Portal cards */}
      <div style={{ display: "flex", gap: "var(--space-lg)" }}>
        <button
          type="button"
          onClick={() => navigate("/learn")}
          style={{
            ...card,
            borderColor: "var(--color-primary)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2rem",
              color: "var(--color-primary)",
              letterSpacing: "0.04em",
              marginBottom: "var(--space-xs)",
            }}
          >
            LEARN
          </div>
          <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: "0.9rem" }}>
            Classwork &amp; structured lessons
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate("/practice")}
          style={{
            ...card,
            borderColor: "var(--color-accent-orange)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2rem",
              color: "var(--color-accent-orange)",
              letterSpacing: "0.04em",
              marginBottom: "var(--space-xs)",
            }}
          >
            PRACTICE ARENA
          </div>
          <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: "0.9rem" }}>
            Time Attack, Zen Mode &amp; custom drills
          </p>
        </button>
      </div>
    </main>
  );
}
