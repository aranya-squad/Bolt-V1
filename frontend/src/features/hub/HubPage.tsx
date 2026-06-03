import { useNavigate } from "react-router-dom";
import { useMe } from "@/shared/api/queries/useMe";
import { useXpProgress } from "@/shared/api/queries/useXpProgress";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { Page } from "@/shared/ui/Page";
import { GlassCard } from "@/shared/ui/GlassCard";
import { HudStatTile } from "@/shared/ui/HudStatTile";
import { XpProgressBar } from "@/shared/ui/XpProgressBar";

export default function HubPage() {
  const navigate = useNavigate();
  const { data: user } = useMe();
  const { data: xp } = useXpProgress();

  const displayName = user?.profile?.display_name ?? "…";
  const totalXp: number = user?.stats?.total_xp ?? 0;
  const streak: number = user?.stats?.streak_days ?? 0;
  const levels: number = user?.stats?.levels_completed ?? 0;
  const currentLevel: number = user?.stats?.current_level ?? 1;

  return (
    <>
      <AmbientScene accents={["yellow", "purple", "blue"]} />
      <Page>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <header style={{ marginBottom: 40 }}>
          <h1 className="t-hero" style={{ color: "var(--y-bolt)", marginBottom: 12 }}>
            BOLT ABACUS HUB
          </h1>
          <p className="t-body" style={{ margin: 0 }}>
            Welcome back,{" "}
            <strong style={{ color: "var(--fg-bone)", fontWeight: 600 }}>
              {displayName}
            </strong>
          </p>
        </header>

        {/* ── HUD stats strip ──────────────────────────────────── */}
        <div style={{ display: "flex", gap: "var(--s-md)", marginBottom: "var(--s-lg)" }}>
          <HudStatTile icon="zap"    value={String(totalXp)}     label="Total XP"    color="var(--y-bolt)"        />
          <HudStatTile icon="flame"  value={String(streak)}      label="Day Streak"  color="var(--orange-streak)" />
          <HudStatTile icon="trophy" value={String(levels)}      label="Levels Done" color="var(--bolt-blue)"     />
          <HudStatTile icon="target" value={`LVL ${currentLevel}`} label="Current Level" color="var(--p-cyber)" />
        </div>

        <div style={{ marginBottom: "var(--s-xl)" }}>
          <XpProgressBar
            currentXp={xp?.total_xp ?? totalXp}
            currentLevelThreshold={xp?.current_level_threshold ?? 0}
            nextLevelThreshold={xp?.next_level_threshold ?? 0}
          />
        </div>

        {/* ── Portal cards ─────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 20 }}>
          <GlassCard
            variant="default"
            style={{ flex: 1, minHeight: 280, cursor: "pointer" }}
            onClick={() => navigate("/learn")}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                height: "100%",
                minHeight: 280,
                padding: "var(--s-xl)",
              }}
            >
              <h2 className="t-h2" style={{ color: "var(--y-bolt)", marginBottom: 8 }}>
                LEARN
              </h2>
              <p className="t-body-md" style={{ margin: 0 }}>
                Classwork &amp; structured lessons
              </p>
            </div>
          </GlassCard>

          <GlassCard
            variant="default"
            style={{ flex: 1, minHeight: 280, cursor: "pointer" }}
            onClick={() => navigate("/practice")}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                height: "100%",
                minHeight: 280,
                padding: "var(--s-xl)",
              }}
            >
              <h2 className="t-h2" style={{ color: "var(--orange-streak)", marginBottom: 8 }}>
                PRACTICE ARENA
              </h2>
              <p className="t-body-md" style={{ margin: 0 }}>
                Time Attack, Zen Mode &amp; custom drills
              </p>
            </div>
          </GlassCard>
        </div>
      </Page>
    </>
  );
}
