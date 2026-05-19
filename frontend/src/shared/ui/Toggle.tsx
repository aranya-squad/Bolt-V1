// Bolt Abacus Design System — Toggle
interface ToggleProps {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ label, hint, value, onChange }: ToggleProps) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 24,
        background: "var(--md-surface-container)",
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--font-label)",
            fontWeight: 600,
            fontSize: 14,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--fg-bone)",
          }}
        >
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
          borderRadius: 9999,
          background: value ? "var(--y-bolt)" : "var(--bg-ash)",
          border: "none",
          cursor: "pointer",
          position: "relative",
          flexShrink: 0,
          boxShadow: value
            ? "0 0 14px rgba(250,204,21,0.5)"
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
            borderRadius: 9999,
            background: value ? "var(--y-bolt-ink)" : "var(--fg-sand)",
            transition: "left 220ms cubic-bezier(.2,.8,.2,1)",
          }}
        />
      </button>
    </div>
  );
}
