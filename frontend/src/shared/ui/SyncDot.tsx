// Bolt Abacus Design System — SyncDot
type SyncState = "idle" | "sending" | "queued" | "offline";

interface SyncDotProps {
  state?: SyncState;
}

const STATES: Record<SyncState, { color: string; label: string; pulse: boolean }> = {
  idle:    { color: "var(--ok)",            label: "Synced",               pulse: false },
  sending: { color: "var(--y-bolt)",        label: "Saving…",              pulse: true  },
  queued:  { color: "var(--orange-streak)", label: "Queued · will sync",   pulse: true  },
  offline: { color: "var(--err)",           label: "Offline · saved locally", pulse: false },
};

export function SyncDot({ state = "idle" }: SyncDotProps) {
  const s = STATES[state];
  return (
    <div
      title={s.label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 9999,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${s.color}40`,
        fontFamily: "var(--font-label)",
        fontWeight: 600,
        fontSize: 10,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: s.color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          background: s.color,
          boxShadow: `0 0 8px ${s.color}`,
          animation: s.pulse ? "sync-pulse 1.2s ease-in-out infinite" : "none",
          flexShrink: 0,
        }}
      />
      {s.label.split(" ")[0]}
    </div>
  );
}
