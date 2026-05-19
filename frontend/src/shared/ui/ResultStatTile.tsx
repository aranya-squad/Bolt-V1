// Bolt Abacus Design System — ResultStatTile
interface ResultStatTileProps {
  value: string;
  label: string;
  valueColor?: string;
}

export function ResultStatTile({ value, label, valueColor }: ResultStatTileProps) {
  return (
    <div className="stat-tile">
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.8rem",
          color: valueColor ?? "var(--fg-bone)",
          letterSpacing: "0.04em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: "var(--fg-sand)",
          fontSize: "0.8rem",
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}
