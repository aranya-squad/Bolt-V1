// Bolt Abacus Design System — OperationTileGrid
// Controlled 2×2 grid of OperationButton for operation selection.
import { OperationButton } from "./OperationButton";

type Op = "+" | "−" | "×" | "÷";

const OP_MAP: Record<string, Op> = {
  ADD: "+",
  SUB: "−",
  MUL: "×",
  DIV: "÷",
};

const OP_REVERSE: Record<Op, string> = {
  "+": "ADD",
  "−": "SUB",
  "×": "MUL",
  "÷": "DIV",
};

interface OperationTileGridProps {
  value: string;
  onChange: (op: string) => void;
}

export function OperationTileGrid({ value, onChange }: OperationTileGridProps) {
  const ops: Op[] = ["+", "−", "×", "÷"];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "var(--s-sm)",
        marginBottom: "var(--s-md)",
      }}
    >
      {ops.map((op) => (
        <OperationButton
          key={op}
          op={op}
          selected={OP_MAP[value] === op}
          onClick={() => onChange(OP_REVERSE[op])}
        />
      ))}
    </div>
  );
}
