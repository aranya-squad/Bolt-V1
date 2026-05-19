import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLevel } from "@/shared/api/queries/useLevels";
import { BackLink } from "@/shared/ui/BackLink";
import { Page } from "@/shared/ui/Page";
import { BoltButton } from "@/shared/ui/BoltButton";
import { Chip } from "@/shared/ui/Chip";

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
    <Page>
      <BackLink label="All Levels" onClick={() => navigate("/learn")} />

      {isLoading && (
        <p style={{ color: "var(--fg-sand)", marginTop: 24 }}>Loading…</p>
      )}

      {level && (
        <div style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-label)",
                fontSize: 13,
                color: "var(--fg-sand)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              LEVEL {level.order}
            </span>
          </div>

          <h1 className="t-h1" style={{ color: "var(--y-bolt)", marginBottom: 16, textTransform: "uppercase" }}>
            {level.name}
          </h1>

          {level.is_completed && (
            <div style={{ marginBottom: 24 }}>
              <Chip tone="neutral">COMPLETED</Chip>
            </div>
          )}

          {level.description && (
            <p
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--fg-sand)",
                marginBottom: 40,
                lineHeight: 1.6,
                fontSize: 18,
              }}
            >
              {level.description}
            </p>
          )}

          <div style={{ marginTop: level.description ? 0 : 40 }}>
            <BoltButton
              variant="primary"
              size="lg"
              onClick={() => navigate(`/learn/level/${levelId}/classwork`)}
              disabled={level.is_locked}
              style={{ width: "100%" }}
            >
              START CLASSWORK
            </BoltButton>
          </div>
        </div>
      )}
    </Page>
  );
}
