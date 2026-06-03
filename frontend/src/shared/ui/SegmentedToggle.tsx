// Bolt Abacus Design System — SegmentedToggle
// Labeled segmented-control row. One option selected at a time. Used for setup
// pickers (operation, digits, rows, etc.). For binary on/off, use Toggle.
import type { ReactNode } from "react";

interface SegmentedToggleProps<T extends string | number> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  format?: (v: T) => ReactNode;
}

/** @deprecated Replaced by ConfigSlider + AdvancedToggleRow. Delete post-Wave-5 QA. */
export function SegmentedToggle<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled,
  format,
}: SegmentedToggleProps<T>) {
  return (
    <div style={{ marginBottom: "var(--s-lg)" }}>
      <div
        className="t-label"
        style={{ marginBottom: 10, letterSpacing: "0.15em" }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: "var(--s-sm)" }}>
        {options.map((opt) => {
          const isSelected = opt === value;
          return (
            <button
              key={String(opt)}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt)}
              style={{
                flex: 1,
                padding: "10px 0",
                background: isSelected ? "var(--y-bolt)" : "var(--md-surface-container)",
                border: `1px solid ${isSelected ? "var(--y-bolt)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: "var(--r-md)",
                color: isSelected ? "var(--y-bolt-ink)" : disabled ? "var(--fg-sand-50)" : "var(--fg-bone)",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: "0.04em",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                transition: "all 150ms",
              }}
            >
              {format ? format(opt) : String(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
