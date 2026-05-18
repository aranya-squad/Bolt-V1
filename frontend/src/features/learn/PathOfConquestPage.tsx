// Figma frame 1:272 — Path of Conquest
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLevel } from "@/shared/api/queries/useLevels";

export default function PathOfConquestPage() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const { data: level, isLoading } = useLevel(levelId!);

  useEffect(() => {
    if (level?.is_locked) {
      navigate("/learn", { replace: true });
    }
  }, [level, navigate]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-bg-base)",
        padding: "var(--space-xl)",
        fontFamily: "var(--font-body)",
        color: "var(--color-text-primary)",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <button
        type="button"
        onClick={() => navigate("/learn")}
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
        ← All Levels
      </button>

      {isLoading && (
        <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>
      )}

      {level && (
        <>
          <div style={{ marginBottom: "var(--space-xs)" }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1rem",
                color: "var(--color-text-secondary)",
                letterSpacing: "0.08em",
              }}
            >
              LEVEL {level.order}
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              color: "var(--color-primary)",
              margin: "0 0 var(--space-md)",
              letterSpacing: "0.04em",
            }}
          >
            {level.name.toUpperCase()}
          </h1>

          {level.is_completed && (
            <div
              style={{
                display: "inline-block",
                background: "var(--color-success)",
                color: "#000",
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "2px var(--space-sm)",
                borderRadius: "var(--radius-pill)",
                marginBottom: "var(--space-lg)",
                letterSpacing: "0.06em",
              }}
            >
              COMPLETED
            </div>
          )}

          {level.description && (
            <p
              style={{
                color: "var(--color-text-secondary)",
                margin: "0 0 var(--space-2xl)",
                lineHeight: 1.6,
              }}
            >
              {level.description}
            </p>
          )}

          <div style={{ marginTop: level.description ? 0 : "var(--space-2xl)" }}>
            <button
              type="button"
              disabled={level.is_locked}
              onClick={() => navigate(`/learn/level/${levelId}/classwork`)}
              style={{
                background: "var(--color-primary)",
                color: "#000",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-md) var(--space-xl)",
                fontFamily: "var(--font-display)",
                fontSize: "1.4rem",
                letterSpacing: "0.06em",
                cursor: "pointer",
                width: "100%",
              }}
            >
              START CLASSWORK
            </button>
          </div>
        </>
      )}
    </main>
  );
}
