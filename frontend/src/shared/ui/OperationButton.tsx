// Bolt Abacus Design System — OperationButton
import { Icon } from "./Icon";

type Op = "+" | "−" | "×" | "÷";

interface OperationButtonProps {
  op: Op;
  selected: boolean;
  onClick: () => void;
}

const OPS: Record<Op, { name: string; icon: string }> = {
  "+": { name: "ADDITION",       icon: "plus"   },
  "−": { name: "SUBTRACTION",    icon: "minus"  },
  "×": { name: "MULTIPLICATION", icon: "x"      },
  "÷": { name: "DIVISION",       icon: "divide" },
};

export function OperationButton({ op, selected, onClick }: OperationButtonProps) {
  const o = OPS[op];
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "32px 16px",
        borderRadius: 24,
        background: selected ? "var(--y-bolt)" : "var(--md-surface-container)",
        border: selected ? "2px solid var(--y-bolt)" : "1px solid rgba(255,255,255,0.06)",
        boxShadow: selected ? "0 0 22px rgba(250,204,21,0.45)" : "none",
        color: selected ? "var(--y-bolt-ink)" : "var(--fg-bone)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        transition: "all 180ms",
      }}
    >
      <Icon name={o.icon} size={36} strokeWidth={2.5} />
      <div
        style={{
          fontFamily: "var(--font-label)",
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: "0.15em",
        }}
      >
        {o.name}
      </div>
    </button>
  );
}
