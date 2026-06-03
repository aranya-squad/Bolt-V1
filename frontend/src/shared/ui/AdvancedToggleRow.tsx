// Bolt Abacus Design System — AdvancedToggleRow
import { GlassCard } from "./GlassCard";
import { Toggle } from "./Toggle";

interface AdvancedToggleRowProps {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: string;
  sectionLabel?: string;
}

export function AdvancedToggleRow(props: AdvancedToggleRowProps) {
  return (
    <GlassCard style={{ padding: "var(--s-md)", marginBottom: "var(--s-md)" }}>
      <Toggle {...props} />
    </GlassCard>
  );
}
