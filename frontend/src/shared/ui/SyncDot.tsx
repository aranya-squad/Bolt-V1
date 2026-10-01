import type { AcceptedReceipt } from "@/shared/types";

// Bolt Abacus Design System — SyncDot
type SyncState = "idle" | "sending" | "queued" | "offline" | "error" | "unsupported" | "suspended";

interface SyncDotProps {
  state?: SyncState;
  pending?: number;
  message?: string;
  storageWarning?: string;
  onRetry?: () => void;
  onExclude?: () => void;
  onFinish?: () => void;
  conflict?: AcceptedReceipt | null;
  onUseServerAnswer?: () => void;
  onReturn?: () => void;
  onDiscard?: () => void;
}

const STATES: Record<SyncState, { color: string; label: string; pulse: boolean }> = {
  idle:    { color: "var(--ok)",            label: "Synced",               pulse: false },
  sending: { color: "var(--y-bolt)",        label: "Saving…",              pulse: true  },
  queued:  { color: "var(--orange-streak)", label: "Queued · will sync",   pulse: true  },
  offline: { color: "var(--err)",           label: "Offline · pending", pulse: false },
  error: { color: "var(--err)", label: "Save failed", pulse: false },
  unsupported: { color: "var(--err)", label: "API upgrade required", pulse: false },
  suspended: { color: "var(--err)", label: "Sign in to recover", pulse: false },
};

export function SyncDot({ state = "idle", pending = 0, message, storageWarning, onRetry, onExclude, onFinish, conflict, onUseServerAnswer, onReturn, onDiscard }: SyncDotProps) {
  const s = STATES[state];
  return (
    <div role="status" aria-live="polite" style={{ maxWidth: 480 }}>
    <div
      title={s.label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: "var(--r-pill)",
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
          borderRadius: "var(--r-pill)",
          background: s.color,
          boxShadow: `0 0 8px ${s.color}`,
          animation: s.pulse ? "sync-pulse 1.2s ease-in-out infinite" : "none",
          flexShrink: 0,
        }}
      />
      {s.label}{pending > 0 ? ` · ${pending} pending` : ""}
    </div>
    {message && <p>{message}</p>}
    {storageWarning && <p>{storageWarning}</p>}
    {conflict && <p>
      Server saved Q{conflict.question_index + 1}, attempt {conflict.attempt_number}: {conflict.is_skip ? "skipped" : `answer ${conflict.submitted_answer}, ${conflict.is_correct ? "correct" : "wrong"}`}, {conflict.elapsed_ms}ms.
    </p>}
    {onUseServerAnswer && <button type="button" onClick={onUseServerAnswer}>Use saved server answer</button>}
    {onRetry && <button type="button" onClick={onRetry}>Retry saving</button>}
    {onExclude && <button type="button" onClick={onExclude}>Exclude rejected answers</button>}
    {onReturn && <button type="button" onClick={onReturn}>Return to unsaved session</button>}
    {onDiscard && <button type="button" onClick={onDiscard}>Discard unsaved answers and open session</button>}
    {onFinish && <button type="button" onClick={onFinish}>Retry finish</button>}
    </div>
  );
}
