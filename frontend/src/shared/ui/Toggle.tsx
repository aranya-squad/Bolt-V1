// Bolt Abacus Design System — Toggle
import { Icon } from "./Icon";

interface ToggleProps {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: string;
  sectionLabel?: string;
}

export function Toggle({ label, hint, value, onChange, icon, sectionLabel }: ToggleProps) {
  return (
    <div>
      {sectionLabel && (
        <div
          style={{
            color: "var(--fg-sand)",
            fontSize: "0.75rem",
            marginBottom: 4,
            fontFamily: "var(--font-label)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {sectionLabel}
        </div>
      )}
    <div
      style={{
        padding: 20,
        borderRadius: "var(--r-xl)",
        background: "var(--md-surface-container)",
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--s-md)",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-label)",
            fontWeight: 600,
            fontSize: 14,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--fg-bone)",
          }}
        >
          {icon && <Icon name={icon} size={16} />}
          {label}
        </div>
        {hint && (
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "var(--fg-sand-50)",
              marginTop: 4,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <button
        onClick={() => onChange(!value)}
        aria-pressed={value}
        style={{
          width: 48,
          height: 28,
          borderRadius: "var(--r-pill)",
          background: value ? "var(--y-bolt)" : "var(--bg-ash)",
          border: "none",
          cursor: "pointer",
          position: "relative",
          flexShrink: 0,
          boxShadow: value
            ? "0 0 14px var(--y-bolt-50)"
            : "inset 0 2px 4px rgba(0,0,0,0.4)",
          transition: "background 200ms, box-shadow 200ms",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: value ? 23 : 3,
            width: 22,
            height: 22,
            borderRadius: "var(--r-pill)",
            background: value ? "var(--y-bolt-ink)" : "var(--fg-sand)",
            transition: "left 220ms var(--ease-out)",
          }}
        />
      </button>
    </div>
    </div>
  );
}
