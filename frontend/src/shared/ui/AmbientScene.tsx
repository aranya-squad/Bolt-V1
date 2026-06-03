// Bolt Abacus Design System — AmbientScene
import { useEffect, useRef, useState } from "react";

type Accent = "yellow" | "purple" | "blue" | "pink" | "orange" | "streak";

interface AmbientSceneProps {
  accents?: Accent[];
  particleCount?: number;
}

const PALETTE: Record<Accent, string> = {
  yellow: "rgba(250,204,21,0.18)",
  purple: "rgba(111,0,190,0.18)",
  blue:   "rgba(173,198,255,0.14)",
  pink:   "rgba(255,180,171,0.14)",
  orange: "rgba(251,146,60,0.18)",
  streak: "rgba(251,146,60,0.18)",
};

const BLOB_COLORS: Record<Accent, string> = {
  yellow: "rgba(250,204,21,0.35)",
  purple: "rgba(221,183,255,0.30)",
  blue:   "rgba(173,198,255,0.28)",
  pink:   "rgba(255,180,171,0.25)",
  orange: "rgba(251,146,60,0.30)",
  streak: "rgba(251,146,60,0.30)",
};

export function AmbientScene({ accents = ["yellow", "purple", "blue"], particleCount }: AmbientSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusMode, setFocusMode] = useState(() => document.body.classList.contains("focus-mode"));

  // Raise default particle count on desktop.
  const defaultCount = window.innerWidth > 1024 ? 6 : 4;
  const effectiveCount = focusMode ? 0 : (particleCount ?? defaultCount);

  // MutationObserver: track focus-mode class on <body>.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setFocusMode(document.body.classList.contains("focus-mode"));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Pause drift animations when the scene's page is not visible (tab switch or
  // covered by another element), resume when visible again.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function setPlayState(running: boolean) {
      const state = running ? "running" : "paused";
      Array.from(el!.children).forEach((child) => {
        (child as HTMLElement).style.animationPlayState = state;
      });
    }

    // IntersectionObserver: pauses blobs when the container is not intersecting
    // (e.g. covered by a full-screen overlay or removed from layout)
    const observer = new IntersectionObserver(
      ([entry]) => setPlayState(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);

    // visibilitychange: pauses blobs when the browser tab is hidden
    function onVisibility() {
      setPlayState(document.visibilityState === "visible");
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const blobs = Array.from({ length: effectiveCount }, (_, i) => {
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
      ref={containerRef}
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
            willChange: "transform",
            animation: `drift ${b.dur}s ease-in-out infinite`,
            animationDelay: `-${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
