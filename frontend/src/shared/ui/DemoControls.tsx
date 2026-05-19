// Bolt Abacus Design System — DemoControls
import { useState } from "react";
import { Icon } from "./Icon";

export interface DemoState {
  focusMode: boolean;
  skeleton: boolean;
  connection: string;
}

interface DemoControlsProps {
  state: DemoState;
  setState: (updater: (prev: DemoState) => DemoState) => void;
}

function DCToggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: "100%",
        marginTop: 8,
        padding: "10px 12px",
        borderRadius: 12,
        background: value ? "rgba(250,204,21,0.08)" : "transparent",
        border: `1px solid ${value ? "rgba(250,204,21,0.3)" : "rgba(255,255,255,0.06)"}`,
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--font-label)",
            fontWeight: 600,
            fontSize: 12,
            color: "var(--fg-bone)",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </div>
        {hint && (
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 11,
              color: "var(--fg-sand-50)",
              marginTop: 2,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <div
        style={{
          width: 30,
          height: 18,
          borderRadius: 9999,
          flexShrink: 0,
          background: value ? "var(--y-bolt)" : "var(--bg-ash)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 2,
            left: value ? 14 : 2,
            width: 14,
            height: 14,
            borderRadius: 9999,
            background: value ? "var(--y-bolt-ink)" : "var(--fg-sand)",
            transition: "left 200ms",
          }}
        />
      </div>
    </button>
  );
}

const CONNECTION_OPTIONS = [
  { v: "good",    label: "Good" },
  { v: "slow",    label: "Slow" },
  { v: "poor",    label: "Poor" },
  { v: "offline", label: "Off"  },
];

export function DemoControls({ state, setState }: DemoControlsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 100,
        fontFamily: "var(--font-label)",
      }}
    >
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Demo controls"
          style={{
            width: 44,
            height: 44,
            borderRadius: 9999,
            background: "var(--bg-coal)",
            color: "var(--fg-sand)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.5), 0 0 12px rgba(250,204,21,0.15)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="settings" size={18} color="var(--y-bolt)" />
        </button>
      )}
      {open && (
        <div
          style={{
            width: 280,
            padding: 16,
            borderRadius: 16,
            background: "var(--md-surface-container)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 48px -12px rgba(0,0,0,0.6), 0 0 18px rgba(250,204,21,0.1)",
            color: "var(--fg-bone)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--fg-sand)",
              }}
            >
              Demo controls
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: 0,
                color: "var(--fg-sand-50)",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <Icon name="x" size={16} />
            </button>
          </div>

          <DCToggle
            label="Focus mode"
            hint="Drop particles + blur"
            value={state.focusMode}
            onChange={v => setState(s => ({ ...s, focusMode: v }))}
          />
          <DCToggle
            label="Show skeletons"
            hint="Force loading state on home / report"
            value={state.skeleton}
            onChange={v => setState(s => ({ ...s, skeleton: v }))}
          />

          <div style={{ marginTop: 14 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--fg-sand-50)",
                marginBottom: 8,
              }}
            >
              Connection
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 6,
              }}
            >
              {CONNECTION_OPTIONS.map(o => (
                <button
                  key={o.v}
                  onClick={() => setState(s => ({ ...s, connection: o.v }))}
                  style={{
                    padding: "8px 0",
                    borderRadius: 9999,
                    background: state.connection === o.v ? "var(--y-bolt)" : "var(--bg-graphite)",
                    color: state.connection === o.v ? "var(--y-bolt-ink)" : "var(--fg-sand)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    cursor: "pointer",
                    fontFamily: "var(--font-label)",
                    fontWeight: 600,
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
