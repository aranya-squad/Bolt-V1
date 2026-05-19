// Figma frame 1:272 — Path of Conquest
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLevel } from "@/shared/api/queries/useLevels";
import { BackLink } from "@/shared/ui/BackLink";

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
    <main className="page-wrap">
      <div className="page-content--medium">
        <BackLink label="All Levels" onClick={() => navigate("/learn")} />

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
                marginBottom: "var(--space-md)",
                letterSpacing: "0.04em",
              }}
            >
              {level.name.toUpperCase()}
            </h1>

            {level.is_completed && (
              <span
                className="badge badge-success"
                style={{ marginBottom: "var(--space-lg)", display: "inline-flex" }}
              >
                COMPLETED
              </span>
            )}

            {level.description && (
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  marginBottom: "var(--space-2xl)",
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
                className="btn btn-primary"
                style={{ width: "100%", padding: "var(--space-md)", fontSize: "1.4rem" }}
              >
                START CLASSWORK
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
