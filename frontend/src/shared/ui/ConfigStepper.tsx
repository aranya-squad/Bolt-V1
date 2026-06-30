import type { CSSProperties } from "react";
import { GlassCard } from "./GlassCard";
import { Icon } from "./Icon";

interface ConfigStepperProps {
  label: string;
  icon?: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  disabled?: boolean;
  description?: string;
  style?: CSSProperties;
}

function stepBtn(active: boolean): CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: "var(--r-md)",
    background: active ? "rgba(250,204,21,0.12)" : "rgba(53,53,52,0.4)",
    border: `1px solid ${active ? "var(--y-bolt-30)" : "rgba(255,255,255,0.08)"}`,
    color: active ? "var(--y-bolt)" : "var(--fg-sand-50, rgba(255,255,255,0.25))",
    fontSize: 22,
    fontWeight: 300,
    lineHeight: 1,
    cursor: active ? "pointer" : "not-allowed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 150ms, border-color 150ms, color 150ms",
    flexShrink: 0,
  };
}

export function ConfigStepper({
  label,
  icon,
  min,
  max,
  value,
  onChange,
  suffix = "",
  step = 1,
  disabled = false,
  description,
  style,
}: ConfigStepperProps) {
  const canDec = value > min;
  const canInc = value < max;

  return (
    <GlassCard
      style={{
        marginBottom: "var(--s-md)",
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? "none" : undefined,
        ...style,
      }}
    >
      <div
        style={{
          padding: "var(--s-lg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--s-md)",
        }}
      >
        {/* Label */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {icon && <Icon name={icon} size={18} color="var(--y-bolt)" />}
          <span
            style={{
              fontFamily: "var(--font-label)",
              fontWeight: 500,
              fontSize: 14,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--fg-sand)",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        </div>

        {/* Stepper controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            aria-label={`Decrease ${label}`}
            onClick={() => canDec && onChange(Math.max(min, value - step))}
            disabled={disabled || !canDec}
            style={stepBtn(canDec)}
          >
            −
          </button>

          <div
            style={{
              minWidth: 64,
              padding: "4px 14px",
              borderRadius: "var(--r-pill)",
              background: "var(--bg-noir)",
              border: "1px solid var(--y-bolt-30)",
              fontFamily: "var(--font-label)",
              fontWeight: 600,
              fontSize: 16,
              color: "var(--y-bolt)",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            {value}{suffix}
          </div>

          <button
            type="button"
            aria-label={`Increase ${label}`}
            onClick={() => canInc && onChange(Math.min(max, value + step))}
            disabled={disabled || !canInc}
            style={stepBtn(canInc)}
          >
            +
          </button>
        </div>
      </div>

      {description && (
        <div
          style={{
            padding: "0 var(--s-lg) var(--s-md)",
            color: "var(--fg-sand)",
            fontSize: "0.8rem",
            fontFamily: "var(--font-body)",
          }}
        >
          {description}
        </div>
      )}
    </GlassCard>
  );
}
