import { useNavigate } from "react-router-dom";
import { useMe } from "@/shared/api/queries/useMe";
import { useXpProgress } from "@/shared/api/queries/useXpProgress";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { Page } from "@/shared/ui/Page";
import { GlassCard } from "@/shared/ui/GlassCard";
import { HudStatTile } from "@/shared/ui/HudStatTile";
import { XpProgressBar } from "@/shared/ui/XpProgressBar";

function PortalCard({
  bgSrc,
  onClick,
  children,
}: {
  bgSrc: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <GlassCard variant="default" style={{ flex: 1, minHeight: 280, cursor: "pointer" }} onClick={onClick}>
      {/* Background image — hidden if asset is missing */}
      <img
        src={bgSrc}
        alt=""
        aria-hidden="true"
        loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.18,
          pointerEvents: "none",
          borderRadius: "inherit",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          height: "100%",
          minHeight: 280,
          padding: "var(--s-xl)",
        }}
      >
        {children}
      </div>
    </GlassCard>
  );
}

export default function HubPage() {
  const navigate = useNavigate();
  const { data: user } = useMe();
  const { data: xp } = useXpProgress();

  const displayName = user?.profile?.display_name ?? "…";
  const totalXp: number = user?.stats?.total_xp ?? 0;
  const streak: number = user?.stats?.streak_days ?? 0;
  const levels: number = user?.stats?.levels_completed ?? 0;
  const currentLevel: number = user?.stats?.current_level ?? 1;
  const bestAcc = user?.stats?.best_accuracy_pct;

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
          <HudStatTile
            icon="award"
            value={bestAcc !== null && bestAcc !== undefined ? `${bestAcc}%` : "—"}
            label="Personal Best"
            color="var(--ok-50)"
          />
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
          <PortalCard
            bgSrc="/images/hub-learn.jpg"
            onClick={() => navigate("/learn")}
          >
            <h2 className="t-h2" style={{ color: "var(--y-bolt)", marginBottom: 8 }}>
              LEARN
            </h2>
            <p className="t-body-md" style={{ margin: 0 }}>
              Classwork &amp; structured lessons
            </p>
          </PortalCard>

          <PortalCard
            bgSrc="/images/hub-practice.jpg"
            onClick={() => navigate("/practice")}
          >
            <h2 className="t-h2" style={{ color: "var(--orange-streak)", marginBottom: 8 }}>
              PRACTICE ARENA
            </h2>
            <p className="t-body-md" style={{ margin: 0 }}>
              Time Attack, Zen Mode &amp; custom drills
            </p>
          </PortalCard>
        </div>
      </Page>
    </>
  );
}
