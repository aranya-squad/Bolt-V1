import { ProgressBar } from "./ProgressBar";

interface XpProgressBarProps {
  currentXp: number;
  currentLevelThreshold: number;
  nextLevelThreshold: number;
  label?: string;
}

export function XpProgressBar({
  currentXp,
  currentLevelThreshold,
  nextLevelThreshold,
  label,
}: XpProgressBarProps) {
  const range = nextLevelThreshold - currentLevelThreshold;
  // Avoid NaN/Infinity when thresholds equal or both 0
  const value = range > 0 ? Math.max(0, currentXp - currentLevelThreshold) : 0;
  const max = range > 0 ? range : 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-label)",
            fontSize: 11,
            letterSpacing: "0.1em",
            color: "var(--fg-sand)",
            textTransform: "uppercase",
          }}
        >
          {label ?? "XP PROGRESS"}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--y-bolt)",
            letterSpacing: "0.05em",
          }}
        >
          {currentXp.toLocaleString()} XP
        </span>
      </div>
      <ProgressBar value={value} max={max} accent="yellow" height={6} marker />
    </div>
  );
}
