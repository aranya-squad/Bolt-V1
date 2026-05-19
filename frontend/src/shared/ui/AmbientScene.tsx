// Bolt Abacus Design System — AmbientScene
type Accent = "yellow" | "purple" | "blue" | "pink";

interface AmbientSceneProps {
  accents?: Accent[];
  particleCount?: number;
}

const PALETTE: Record<Accent, string> = {
  yellow: "rgba(250,204,21,0.18)",
  purple: "rgba(111,0,190,0.18)",
  blue:   "rgba(173,198,255,0.14)",
  pink:   "rgba(255,180,171,0.14)",
};

const BLOB_COLORS: Record<Accent, string> = {
  yellow: "rgba(250,204,21,0.35)",
  purple: "rgba(221,183,255,0.30)",
  blue:   "rgba(173,198,255,0.28)",
  pink:   "rgba(255,180,171,0.25)",
};

export function AmbientScene({ accents = ["yellow", "purple", "blue"], particleCount = 4 }: AmbientSceneProps) {
  const blobs = Array.from({ length: particleCount }, (_, i) => {
    const accent = accents[i % accents.length];
    return {
      key: i,
      bg: BLOB_COLORS[accent],
      size: 90 + ((i * 47) % 100),
      top: `${((i * 37) % 80) + 5}%`,
      left: `${((i * 71) % 80) + 5}%`,
      delay: (i * 1.3) % 6,
      dur: 9 + (i % 5),
    };
  });

  const positions = ["18% 28%", "82% 30%", "55% 78%"];
  const gradients = accents.slice(0, 3).map((a, i) =>
    `radial-gradient(circle at ${positions[i] ?? "50% 50%"}, ${PALETTE[a]} 0%, transparent 40%)`
  );

  return (
    <div
      data-radial-bg
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        background: gradients.join(", ") + ", var(--bg-noir)",
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      {blobs.map(b => (
        <div
          key={b.key}
          data-particle
          style={{
            position: "absolute",
            borderRadius: 9999,
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            background: b.bg,
            filter: "blur(60px)",
            animation: `drift ${b.dur}s ease-in-out infinite`,
            animationDelay: `-${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
