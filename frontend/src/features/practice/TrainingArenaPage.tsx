// Figma frame 1:183 — Training Arena (mode selection)
import { useNavigate } from "react-router-dom";

const MODES = [
  {
    key: "TIME_ATTACK",
    label: "TIME ATTACK",
    desc: "Beat the clock. Speed and accuracy under pressure.",
    color: "var(--color-accent-orange)",
  },
  {
    key: "ZEN",
    label: "ZEN MODE",
    desc: "No timer. Practice at your own pace.",
    color: "var(--color-accent-blue)",
  },
  {
    key: "CUSTOM",
    label: "THE LAB",
    desc: "Configure everything. Your session, your rules.",
    color: "var(--color-accent-purple)",
  },
] as const;

export default function TrainingArenaPage() {
  const navigate = useNavigate();

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
      <button
        type="button"
        onClick={() => navigate("/hub")}
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-secondary)",
          cursor: "pointer",
          fontSize: "0.9rem",
          padding: 0,
          marginBottom: "var(--space-lg)",
          fontFamily: "var(--font-body)",
        }}
      >
        ← Hub
      </button>

      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          color: "var(--color-primary)",
          margin: "0 0 var(--space-xl)",
          letterSpacing: "0.04em",
        }}
      >
        TRAINING ARENA
      </h1>

      <div style={{ display: "flex", gap: "var(--space-lg)" }}>
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => navigate(`/practice/setup/${m.key}`)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              minHeight: 200,
              padding: "var(--space-lg)",
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg)",
              border: `1px solid ${m.color}`,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.4rem",
                color: m.color,
                letterSpacing: "0.04em",
                marginBottom: "var(--space-xs)",
              }}
            >
              {m.label}
            </div>
            <div style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
              {m.desc}
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
