// Figma frame 1:58 — Level Selection
import { useNavigate } from "react-router-dom";
import { useLevels } from "@/shared/api/queries/useLevels";
import { BackLink } from "@/shared/ui/BackLink";

export default function LevelSelectionPage() {
  const navigate = useNavigate();
  const { data: levels, isLoading } = useLevels();

  return (
    <main className="page-wrap">
      <div className="page-content">
        <BackLink label="Hub" onClick={() => navigate("/hub")} />

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            color: "var(--color-primary)",
            marginBottom: "var(--space-xl)",
            letterSpacing: "0.04em",
          }}
        >
          CHOOSE YOUR LEVEL
        </h1>

        {isLoading && (
          <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>
        )}

        <div className="grid-2col">
          {levels?.map((level) => (
            <button
              key={level.id}
              type="button"
              disabled={level.is_locked}
              onClick={() => {
                if (!level.is_locked) navigate(`/learn/level/${level.id}`);
              }}
              className="level-card"
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
                <span className="badge badge-success">DONE</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
