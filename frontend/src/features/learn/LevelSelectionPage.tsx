import { useNavigate } from "react-router-dom";
import { useLevels } from "@/shared/api/queries/useLevels";
import { BackLink } from "@/shared/ui/BackLink";
import { Page } from "@/shared/ui/Page";
import { GlassCard } from "@/shared/ui/GlassCard";
import { Chip } from "@/shared/ui/Chip";
import { Skeleton } from "@/shared/ui/Skeleton";

export default function LevelSelectionPage() {
  const navigate = useNavigate();
  const { data: levels, isLoading } = useLevels();

  return (
    <Page>
      <BackLink label="Hub" onClick={() => navigate("/hub")} />

      <h1 className="t-h1" style={{ color: "var(--y-bolt)", marginTop: 24, marginBottom: 40 }}>
        CHOOSE YOUR LEVEL
      </h1>

      {isLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={160} radius={20} />
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {levels?.map((level) => (
          <GlassCard
            key={level.id}
            variant={level.is_locked ? "locked" : level.is_completed ? "success" : "default"}
            style={{
              minHeight: 160,
              cursor: level.is_locked ? "not-allowed" : "pointer",
              opacity: level.is_locked ? 0.4 : 1,
            }}
            onClick={level.is_locked ? undefined : () => navigate(`/learn/level/${level.id}`)}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                height: "100%",
                padding: "var(--s-lg)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 35,
                  color: level.is_completed ? "var(--ok)" : "var(--y-bolt)",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {level.order}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 18,
                  color: level.is_completed ? "var(--ok)" : "var(--fg-bone)",
                  letterSpacing: "0.04em",
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                {level.name}
              </div>
              {level.is_completed && <Chip tone="neutral">DONE</Chip>}
            </div>
          </GlassCard>
        ))}
      </div>
    </Page>
  );
}
