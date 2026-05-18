// Figma frame 1:58 — Level Selection
import { useNavigate } from "react-router-dom";
import { useLevels } from "@/shared/api/queries/useLevels";

export default function LevelSelectionPage() {
  const navigate = useNavigate();
  const { data: levels, isLoading } = useLevels();

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
        CHOOSE YOUR LEVEL
      </h1>

      {isLoading && (
        <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "var(--space-lg)",
        }}
      >
        {levels?.map((level) => (
          <button
            key={level.id}
            type="button"
            disabled={level.is_locked}
            onClick={() => {
              if (!level.is_locked) navigate(`/learn/level/${level.id}`);
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              minHeight: 160,
              padding: "var(--space-lg)",
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg)",
              border: `1px solid ${
                level.is_completed
                  ? "var(--color-success)"
                  : level.is_locked
                  ? "var(--color-border)"
                  : "var(--color-primary)"
              }`,
              cursor: level.is_locked ? "not-allowed" : "pointer",
              opacity: level.is_locked ? 0.4 : 1,
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "2.2rem",
                color: level.is_completed ? "var(--color-success)" : "var(--color-primary)",
                letterSpacing: "0.04em",
                lineHeight: 1,
                marginBottom: "var(--space-xs)",
              }}
            >
              {level.order}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.1rem",
                color: level.is_completed ? "var(--color-success)" : "var(--color-text-primary)",
                letterSpacing: "0.04em",
                marginBottom: "var(--space-xs)",
              }}
            >
              {level.name.toUpperCase()}
            </div>
            {level.is_completed && (
              <div style={{ fontSize: "0.75rem", color: "var(--color-success)", fontWeight: 600 }}>
                DONE
              </div>
            )}
          </button>
        ))}
      </div>
    </main>
  );
}
