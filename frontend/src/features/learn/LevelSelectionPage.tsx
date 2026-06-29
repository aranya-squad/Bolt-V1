import { useNavigate } from "react-router-dom";
import { useLevels } from "@/shared/api/queries/useLevels";
import { useMe } from "@/shared/api/queries/useMe";
import { Page } from "@/shared/ui/Page";
import { LevelGridCard } from "@/shared/ui/LevelGridCard";
import { Skeleton } from "@/shared/ui/Skeleton";
import { BoltButton } from "@/shared/ui/BoltButton";
import { RANK_NAMES } from "@/shared/lib/rankNames";

const RANK_ORDER = Object.entries(RANK_NAMES)
  .map(([order, name]) => ({ order: Number(order), name }))
  .sort((a, b) => a.order - b.order);

export default function LevelSelectionPage() {
  const navigate = useNavigate();
  const { data: levels, isLoading, isError, refetch } = useLevels();
  const { data: me } = useMe();
  const demoSkeleton = window.__BOLT_DEMO__?.skeleton ?? false;
  const currentLevel = me?.stats?.current_level ?? 1;

  return (
    <Page>
      <header style={{ marginBottom: "var(--s-xl)" }}>
        <h1 className="t-h1" style={{ color: "var(--y-bolt)", marginBottom: "var(--s-sm)" }}>
          CHOOSE YOUR LEVEL
        </h1>
        <p className="t-body-md" style={{ margin: 0, color: "var(--fg-sand)" }}>
          Complete classwork to unlock the next level.
        </p>
      </header>

      <div style={{ display: "flex", gap: "var(--s-xl)", alignItems: "flex-start" }}>
        {/* Ranks sidebar */}
        <aside
          style={{
            flexShrink: 0,
            width: 140,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-label)",
              fontSize: 10,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--fg-sand)",
              marginBottom: 8,
            }}
          >
            Ranks
          </div>
          {RANK_ORDER.map(({ order, name }) => {
            const isCurrent = order === currentLevel;
            const isPast = order < currentLevel;
            return (
              <div
                key={order}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: "var(--r-md)",
                  background: isCurrent ? "rgba(250,204,21,0.1)" : "transparent",
                  border: isCurrent ? "1px solid rgba(250,204,21,0.3)" : "1px solid transparent",
                  transition: "background 150ms",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: isCurrent ? "var(--y-bolt)" : "var(--fg-sand-30)",
                    minWidth: 16,
                  }}
                >
                  {order}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: isCurrent
                      ? "var(--y-bolt)"
                      : isPast
                      ? "var(--ok)"
                      : "var(--fg-sand-30)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {name}
                </span>
              </div>
            );
          })}
        </aside>

        {/* Level grid + states */}
        <div style={{ flex: 1, minWidth: 0 }}>
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

          {(isLoading || demoSkeleton) && (
            <div className="level-grid" style={{ marginBottom: "var(--s-xl)" }}>
              {Array.from({ length: 10 }, (_, i) => (
                <Skeleton key={i} height={180} radius={20} />
              ))}
            </div>
          )}

          {levels && !demoSkeleton && (
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

              <img
                src="/hero-character.png"
                alt=""
                aria-hidden="true"
                style={{ display: "block", margin: "var(--s-3xl) auto 0", maxWidth: 320, width: "100%", opacity: 0.85 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </>
          )}
        </div>
      </div>
    </Page>
  );
}
