import { useNavigate } from "react-router-dom";
import { useMe } from "@/shared/api/queries/useMe";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { TopNav } from "@/shared/ui/TopNav";
import { Page } from "@/shared/ui/Page";
import { GlassCard } from "@/shared/ui/GlassCard";
import { Icon } from "@/shared/ui/Icon";

export default function HubPage() {
  const navigate = useNavigate();
  const { data: user } = useMe();

  const displayName = user?.profile?.display_name ?? "…";
  const totalXp: number = user?.stats?.total_xp ?? 0;
  const streak: number = user?.stats?.streak_days ?? 0;
  const levels: number = user?.stats?.levels_completed ?? 0;

  return (
    <>
      <AmbientScene accents={["yellow", "purple", "blue"]} />
      <TopNav
        xp={totalXp}
        streak={streak}
        trophies={levels}
      />
      <Page>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <header style={{ marginBottom: 48 }}>
          <h1 className="t-hero" style={{ color: "var(--y-bolt)", marginBottom: 12 }}>
            BOLT ABACUS HUB
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 18, color: "var(--fg-sand)", margin: 0 }}>
            Welcome back,{" "}
            <strong style={{ color: "var(--fg-bone)", fontWeight: 600 }}>
              {displayName}
            </strong>
          </p>
        </header>

        {/* ── HUD stats strip ──────────────────────────────────── */}
        <div style={{ display: "flex", gap: 16, marginBottom: 48 }}>
          <StatTile icon="zap"    value={String(totalXp)} label="Total XP"    color="var(--y-bolt)"          />
          <StatTile icon="flame"  value={String(streak)}  label="Day Streak"  color="var(--orange-streak)"   />
          <StatTile icon="trophy" value={String(levels)}  label="Levels Done" color="var(--bolt-blue)"       />
        </div>

        {/* ── Portal cards ─────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 20 }}>
          <GlassCard
            variant="default"
            style={{ flex: 1, minHeight: 260, cursor: "pointer" }}
            onClick={() => navigate("/learn")}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                height: "100%",
                padding: "var(--s-xl)",
              }}
            >
              <h2 className="t-h2" style={{ color: "var(--y-bolt)", marginBottom: 8 }}>
                LEARN
              </h2>
              <p style={{ fontFamily: "var(--font-body)", color: "var(--fg-sand)", margin: 0, fontSize: 15 }}>
                Classwork &amp; structured lessons
              </p>
            </div>
          </GlassCard>

          <GlassCard
            variant="default"
            style={{ flex: 1, minHeight: 260, cursor: "pointer" }}
            onClick={() => navigate("/practice")}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                height: "100%",
                padding: "var(--s-xl)",
              }}
            >
              <h2 className="t-h2" style={{ color: "var(--orange-streak)", marginBottom: 8 }}>
                PRACTICE ARENA
              </h2>
              <p style={{ fontFamily: "var(--font-body)", color: "var(--fg-sand)", margin: 0, fontSize: 15 }}>
                Time Attack, Zen Mode &amp; custom drills
              </p>
            </div>
          </GlassCard>
        </div>
      </Page>
    </>
  );
}

function StatTile({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <GlassCard variant="default" style={{ flex: 1, textAlign: "center", padding: "20px 24px" }}>
      <Icon name={icon} size={22} color={color} style={{ margin: "0 auto 10px" }} />
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 30,
          color,
          letterSpacing: "0.04em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-label)",
          fontSize: 11,
          color: "var(--fg-sand)",
          marginTop: 6,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </GlassCard>
  );
}
