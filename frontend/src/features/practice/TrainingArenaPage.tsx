import { useNavigate } from "react-router-dom";
import { BackLink } from "@/shared/ui/BackLink";
import { Page } from "@/shared/ui/Page";
import { GlassCard } from "@/shared/ui/GlassCard";
import { IconPlate } from "@/shared/ui/IconPlate";

const MODES = [
  {
    key: "TIME_ATTACK",
    label: "TIME ATTACK",
    desc: "Beat the clock. Speed and accuracy under pressure.",
    color: "var(--orange-streak)" as const,
    plateColor: "orange" as const,
    icon: "zap",
  },
  {
    key: "ZEN",
    label: "ZEN MODE",
    desc: "No timer. Practice at your own pace.",
    color: "var(--bolt-blue)" as const,
    plateColor: "blue" as const,
    icon: "wind",
  },
  {
    key: "CUSTOM",
    label: "THE LAB",
    desc: "Configure everything. Your session, your rules.",
    color: "var(--p-cyber)" as const,
    plateColor: "purple" as const,
    icon: "settings",
  },
] as const;

export default function TrainingArenaPage() {
  const navigate = useNavigate();

  return (
    <Page>
      <BackLink label="Hub" onClick={() => navigate("/hub")} />

      <h1 className="t-h1" style={{ color: "var(--y-bolt)", marginTop: 24, marginBottom: 40 }}>
        TRAINING ARENA
      </h1>

      <div style={{ display: "flex", gap: 20 }}>
        {MODES.map((m) => (
          <GlassCard
            key={m.key}
            variant="default"
            style={{ flex: 1, minHeight: 200, cursor: "pointer" }}
            onClick={() => navigate(`/practice/setup/${m.key}`)}
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
              <div style={{ marginBottom: 16 }}>
                <IconPlate icon={m.icon} color={m.plateColor} size={48} />
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 22,
                  color: m.color,
                  letterSpacing: "0.04em",
                  marginBottom: 6,
                }}
              >
                {m.label}
              </div>
              <div style={{ fontFamily: "var(--font-body)", color: "var(--fg-sand)", fontSize: 14, lineHeight: 1.5 }}>
                {m.desc}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </Page>
  );
}
