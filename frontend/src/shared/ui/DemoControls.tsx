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
        marginTop: "var(--s-sm)",
        padding: "10px 12px",
        borderRadius: "var(--r-md)",
        background: value ? "rgba(250,204,21,0.08)" : "transparent",
        border: `1px solid ${value ? "var(--y-bolt-30)" : "rgba(255,255,255,0.06)"}`,
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
          borderRadius: "var(--r-pill)",
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
            borderRadius: "var(--r-pill)",
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
            borderRadius: "var(--r-pill)",
            background: "var(--bg-coal)",
            color: "var(--fg-sand)",
            border: "1px solid var(--glass-10)",
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
            padding: "var(--s-md)",
            borderRadius: "var(--r-lg)",
            background: "var(--md-surface-container)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 48px -12px rgba(0,0,0,0.6), 0 0 18px var(--y-bolt-10)",
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
                    padding: "var(--s-sm) 0",
                    borderRadius: "var(--r-pill)",
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
