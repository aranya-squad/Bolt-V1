// Figma frame 1:183 — Training Arena (mode selection)
import { useNavigate } from "react-router-dom";
import { BackLink } from "@/shared/ui/BackLink";

const MODES = [
  {
    key: "TIME_ATTACK",
    label: "TIME ATTACK",
    desc: "Beat the clock. Speed and accuracy under pressure.",
    color: "var(--color-accent-orange)",
    cardClass: "mode-card--time-attack",
  },
  {
    key: "ZEN",
    label: "ZEN MODE",
    desc: "No timer. Practice at your own pace.",
    color: "var(--color-accent-blue)",
    cardClass: "mode-card--zen",
  },
  {
    key: "CUSTOM",
    label: "THE LAB",
    desc: "Configure everything. Your session, your rules.",
    color: "var(--color-accent-purple)",
    cardClass: "mode-card--lab",
  },
] as const;

export default function TrainingArenaPage() {
  const navigate = useNavigate();

  return (
    <main className="page-wrap">
      <div className="page-content">
        <BackLink label="Hub" onClick={() => navigate("/hub")} />

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            color: "var(--color-primary)",
            marginBottom: "var(--space-xl)",
            letterSpacing: "0.04em",
          }}
        >
          TRAINING ARENA
        </h1>

        <div className="mode-cards-row">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => navigate(`/practice/setup/${m.key}`)}
              className={`mode-card ${m.cardClass}`}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                minHeight: 200,
                padding: "var(--space-lg)",
                background: "var(--color-surface)",
                borderRadius: "var(--radius-lg)",
                border: `1px solid ${m.color}`,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.4rem",
                  color: m.color,
                  letterSpacing: "0.04em",
                  marginBottom: "var(--space-xs)",
                }}
              >
                {m.label}
              </div>
              <div style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
                {m.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
