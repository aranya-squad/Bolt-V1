// Bolt Abacus Design System — BentoModeCard
// Keyboard-accessible button card for mode selection.
import { Icon } from "./Icon";

interface BentoModeCardProps {
  mode: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  onClick?: () => void;
}

export function BentoModeCard({ mode: _mode, title, description, icon, color, onClick }: BentoModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        padding: "var(--s-xl)",
        borderRadius: "var(--r-xl)",
        background: "var(--glass-05)",
        backdropFilter: "var(--blur-glass)",
        WebkitBackdropFilter: "var(--blur-glass)",
        border: "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "border-color 180ms, box-shadow 180ms, transform 180ms var(--ease-out)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 0 24px rgba(250,204,21,0.15)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <Icon name={icon} size={32} color={color} style={{ marginBottom: "var(--s-md)" }} />
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.2rem",
          color: "var(--fg-bone)",
          letterSpacing: "0.04em",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div
        className="t-body-md"
        style={{ color: "var(--fg-sand)", lineHeight: 1.5 }}
      >
        {description}
      </div>
    </button>
  );
}
