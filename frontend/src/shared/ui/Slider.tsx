// Bolt Abacus Design System — Slider
import { Icon } from "./Icon";

interface SliderProps {
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
}

export function Slider({ label, icon, min, max, value, onChange, suffix = "", step = 1, disabled = false, description }: SliderProps) {
  const range = max - min;
  const pct = ((value - min) / range) * 100;

  const steps = Math.floor(range / step) + 1;
  let stride: number;
  if (steps <= 11) stride = step;
  else if (range <= 25) stride = 5;
  else if (range <= 100) stride = Math.ceil(range / 6 / 5) * 5;
  else stride = Math.ceil(range / 6);

  const majorTicks: number[] = [];
  for (let v = min; v <= max; v += stride) majorTicks.push(v);
  if (majorTicks[majorTicks.length - 1] !== max) majorTicks.push(max);

  const minorTicks: number[] = [];
  if (steps <= 11) {
    for (let v = min; v <= max; v += step) {
      if (!majorTicks.includes(v)) minorTicks.push(v);
    }
  }

  return (
    <div
      style={{
        padding: "var(--s-lg)",
        borderRadius: "var(--r-xl)",
        background: "var(--md-surface-container)",
        border: "1px solid rgba(255,255,255,0.06)",
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? "none" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {icon && <Icon name={icon} size={18} color="var(--y-bolt)" />}
          <div
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
          </div>
        </div>
        <div
          style={{
            padding: "4px 14px",
            borderRadius: "var(--r-pill)",
            background: "var(--bg-noir)",
            border: "1px solid var(--y-bolt-30)",
            fontFamily: "var(--font-label)",
            fontWeight: 600,
            fontSize: 14,
            color: "var(--y-bolt)",
            whiteSpace: "nowrap",
          }}
        >
          {value}{suffix}
        </div>
      </div>

      <div style={{ position: "relative", paddingBottom: 22 }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 8,
            pointerEvents: "none",
          }}
        >
          {minorTicks.map(v => {
            const p = ((v - min) / range) * 100;
            const active = v <= value;
            return (
              <div
                key={`m${v}`}
                style={{
                  position: "absolute",
                  left: `${p}%`,
                  top: "50%",
                  width: 2,
                  height: 6,
                  borderRadius: "var(--r-pill)",
                  background: active ? "rgba(60,47,0,0.7)" : "rgba(255,255,255,0.12)",
                  transform: "translate(-50%, -50%)",
                }}
              />
            );
          })}
          {majorTicks.map(v => {
            const p = ((v - min) / range) * 100;
            const active = v <= value;
            return (
              <div
                key={`M${v}`}
                style={{
                  position: "absolute",
                  left: `${p}%`,
                  top: "50%",
                  width: 4,
                  height: 12,
                  borderRadius: "var(--r-pill)",
                  background: active ? "var(--y-bolt-ink)" : "rgba(255,255,255,0.25)",
                  transform: "translate(-50%, -50%)",
                  boxShadow: active ? "0 0 4px rgba(250,204,21,0.6)" : "none",
                }}
              />
            );
          })}
        </div>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={e => onChange(parseInt(e.target.value, 10))}
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            height: 8,
            appearance: "none",
            WebkitAppearance: "none",
            background: `linear-gradient(90deg, var(--y-bolt) 0%, var(--y-bolt) ${pct}%, var(--bg-ash) ${pct}%, var(--bg-ash) 100%)`,
            borderRadius: 9999,
            outline: "none",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 18,
            height: 14,
            pointerEvents: "none",
          }}
        >
          {majorTicks.map(v => {
            const p = ((v - min) / range) * 100;
            const active = v === value;
            return (
              <div
                key={`L${v}`}
                style={{
                  position: "absolute",
                  left: `${p}%`,
                  top: 0,
                  transform: "translateX(-50%)",
                  fontFamily: "var(--font-label)",
                  fontWeight: active ? 600 : 500,
                  fontSize: 11,
                  color: active ? "var(--y-bolt)" : "var(--fg-sand-50)",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  transition: "color 150ms",
                }}
              >
                {v}{suffix}
              </div>
            );
          })}
        </div>
      </div>

      {description && (
        <div
          style={{
            color: "var(--fg-sand)",
            fontSize: "0.8rem",
            marginTop: 4,
            fontFamily: "var(--font-body)",
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}
