// Bolt Abacus Design System — Skeleton
import type { CSSProperties } from "react";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: CSSProperties;
}

export function Skeleton({ width = "100%", height = 16, radius = 8, style }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.10) 37%, rgba(255,255,255,0.04) 63%)",
        backgroundSize: "400% 100%",
        animation: "skeleton-shimmer 1.6s ease-in-out infinite",
        ...style,
      }}
    />
  );
}
