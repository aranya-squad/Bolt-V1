import { useNavigate } from "react-router-dom";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { Page } from "@/shared/ui/Page";
import { BentoModeCard } from "@/shared/ui/BentoModeCard";

const MODES = [
  {
    mode: "FLASH_CARDS",
    title: "Memory Master",
    description: "Master the abacus with flash card speed drills",
    icon: "zap",
    color: "var(--y-bolt)",
  },
  {
    mode: "ZEN",
    title: "Zen Mode",
    description: "No pressure. No timer. Pure focus.",
    icon: "wind",
    color: "var(--bolt-blue)",
  },
  {
    mode: "TIME_ATTACK",
    title: "Sonic Speed",
    description: "Race the clock and push your limits",
    icon: "timer",
    color: "var(--orange-streak)",
  },
  {
    mode: "CUSTOM",
    title: "The Lab",
    description: "Build your own challenge with custom rules",
    icon: "settings",
    color: "var(--p-cyber)",
  },
] as const;

export default function TrainingArenaPage() {
  const navigate = useNavigate();

  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <AmbientScene accents={["orange", "blue", "purple"] as any} />
      <Page>
        <h1
          className="t-h1"
          style={{ color: "var(--y-bolt)", marginBottom: "var(--s-xl)" }}
        >
          TRAINING ARENA
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "var(--s-lg)",
          }}
        >
          {MODES.map((m) => (
            <BentoModeCard
              key={m.mode}
              mode={m.mode}
              title={m.title}
              description={m.description}
              icon={m.icon}
              color={m.color}
              onClick={() => navigate(`/practice/setup/${m.mode}`)}
            />
          ))}
        </div>
      </Page>
    </>
  );
}
