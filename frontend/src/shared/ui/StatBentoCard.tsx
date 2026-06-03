import { GlassCard } from "./GlassCard";

interface StatBentoCardProps {
  value: string;
  label: string;
  variant?: "default" | "prominent";
  color?: string;
}

export function StatBentoCard({ value, label, variant = "default", color }: StatBentoCardProps) {
  if (variant === "prominent") {
    return (
      <GlassCard
        variant="active"
        style={{ padding: "var(--s-lg) var(--s-xl)", textAlign: "center" }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2.4rem",
            color: color ?? "var(--fg-bone)",
            letterSpacing: "0.04em",
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            color: "var(--fg-sand)",
            fontSize: "0.8rem",
            marginTop: 4,
          }}
        >
          {label}
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="stat-tile">
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.8rem",
          color: color ?? "var(--fg-bone)",
          letterSpacing: "0.04em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: "var(--fg-sand)",
          fontSize: "0.8rem",
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}
