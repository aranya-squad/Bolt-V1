// Bolt Abacus Design System — LevelChip
interface LevelChipProps {
  level?: number;
}

export function LevelChip({ level }: LevelChipProps) {
  return (
    <div
      style={{
        padding: "6px 14px",
        borderRadius: 9999,
        whiteSpace: "nowrap",
        background: "var(--bg-graphite)",
        border: "1px solid rgba(255,255,255,0.1)",
        fontFamily: "var(--font-ui)",
        fontWeight: 500,
        fontSize: 13,
        letterSpacing: "0.08em",
        color: "var(--y-bolt)",
      }}
    >
      {level !== undefined ? `LEVEL ${level}` : "LEVEL —"}
    </div>
  );
}
