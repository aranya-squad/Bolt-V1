import { useNavigate } from "react-router-dom";
import { useLevels } from "@/shared/api/queries/useLevels";
import { Page } from "@/shared/ui/Page";
import { LevelGridCard } from "@/shared/ui/LevelGridCard";
import { Skeleton } from "@/shared/ui/Skeleton";
import { BoltButton } from "@/shared/ui/BoltButton";

export default function LevelSelectionPage() {
  const navigate = useNavigate();
  const { data: levels, isLoading, isError, refetch } = useLevels();

  return (
    <Page>
      <header style={{ marginBottom: "var(--s-xl)" }}>
        <h1
          className="t-h1"
          style={{ color: "var(--y-bolt)", marginBottom: "var(--s-sm)" }}
        >
          CHOOSE YOUR LEVEL
        </h1>
        <p className="t-body-md" style={{ margin: 0, color: "var(--fg-sand)" }}>
          Complete classwork to unlock the next level.
        </p>
      </header>

      {isError && (
        <div style={{ marginBottom: "var(--s-xl)", display: "flex", flexDirection: "column", gap: "var(--s-md)", alignItems: "flex-start" }}>
          <p className="t-body-md" style={{ color: "var(--err)", margin: 0 }}>
            Failed to load levels.
          </p>
          <BoltButton variant="ghost" size="sm" onClick={() => refetch()}>
            RETRY
          </BoltButton>
        </div>
      )}

      {isLoading && (
        <div className="level-grid" style={{ marginBottom: "var(--s-xl)" }}>
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} height={180} radius={20} />
          ))}
        </div>
      )}

      {levels && (
        <>
          <div className="level-grid">
            {levels.map((level) => (
              <LevelGridCard
                key={level.id}
                level={level}
                onClick={() => navigate(`/learn/level/${level.id}`)}
              />
            ))}
          </div>

          {/* Hero illustration — no layout break if asset missing */}
          <img
            src="/hero-character.png"
            alt=""
            aria-hidden="true"
            style={{
              display: "block",
              margin: "var(--s-3xl) auto 0",
              maxWidth: 320,
              width: "100%",
              opacity: 0.85,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </>
      )}
    </Page>
  );
}
