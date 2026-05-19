// Bolt Abacus Design System — BackLink
import { Icon } from "./Icon";

interface BackLinkProps {
  label: string;
  onClick: () => void;
}

export function BackLink({ label, onClick }: BackLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "none",
        border: 0,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-ui)",
        fontWeight: 500,
        fontSize: 14,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--fg-sand)",
        padding: 0,
      }}
    >
      <Icon name="arrow-left" size={16} color="var(--fg-sand)" />
      {label}
    </button>
  );
}
