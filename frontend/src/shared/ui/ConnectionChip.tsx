// Bolt Abacus Design System — ConnectionChip
type ConnectionQuality = "good" | "slow" | "poor" | "offline";

interface ConnectionChipProps {
  quality?: ConnectionQuality;
}

const CONFIG: Record<Exclude<ConnectionQuality, "good">, { color: string; label: string }> = {
  slow:    { color: "var(--orange-streak)", label: "Slow connection"         },
  poor:    { color: "var(--orange-streak)", label: "Poor connection"         },
  offline: { color: "var(--err)",           label: "Offline · synced locally" },
};

export function ConnectionChip({ quality = "good" }: ConnectionChipProps) {
  if (quality === "good") return null;

  const config = CONFIG[quality] ?? { color: "var(--fg-sand)", label: quality };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 9999,
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${config.color}66`,
        color: config.color,
        fontFamily: "var(--font-label)",
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        animation: quality === "offline" ? "none" : "soft-flash 2.4s ease-in-out infinite",
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
        {quality === "offline" && <line x1="2" y1="2" x2="22" y2="22" />}
      </svg>
      {config.label}
    </div>
  );
}
