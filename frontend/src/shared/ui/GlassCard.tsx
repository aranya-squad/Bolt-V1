// Bolt Abacus Design System — GlassCard
import type { CSSProperties, MouseEvent, ReactNode } from "react";

type Variant = "default" | "active" | "locked" | "success";

interface GlassCardProps {
  children: ReactNode;
  variant?: Variant;
  style?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

const VARIANTS: Record<Variant, CSSProperties> = {
  default: {
    background: "rgba(255,255,255,0.05)",
    border: "none",
    boxShadow: "none",
  },
  active: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--y-bolt)",
    boxShadow: "0 0 18px 2px rgba(250,204,21,0.6)",
    animation: "pulse-glow 2.4s ease-in-out infinite",
  },
  locked: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    opacity: 0.6,
  },
  success: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(34,197,94,0.5)",
    boxShadow: "0 0 18px rgba(34,197,94,0.2)",
  },
};

export function GlassCard({ children, variant = "default", style = {}, onClick }: GlassCardProps) {
  function handleMouseEnter(e: MouseEvent<HTMLDivElement>) {
    if (variant === "default") {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "0 0 24px rgba(250,204,21,0.15)";
    }
  }
  function handleMouseLeave(e: MouseEvent<HTMLDivElement>) {
    if (variant === "default") {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
    }
  }

  return (
    <div
      data-glass
      onClick={onClick}
      style={{
        position: "relative",
        borderRadius: 24,
        overflow: "hidden",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 200ms cubic-bezier(.2,.8,.2,1), box-shadow 200ms",
        ...VARIANTS[variant],
        ...style,
      }}
      onMouseEnter={onClick ? handleMouseEnter : undefined}
      onMouseLeave={onClick ? handleMouseLeave : undefined}
    >
      {/* Rim-light gradient border */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          borderRadius: "inherit",
          padding: 1,
          background:
            variant === "default"
              ? "linear-gradient(180deg, rgba(255,255,255,0.25), rgba(255,255,255,0.02))"
              : "none",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      {/* Top-inside highlight */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "linear-gradient(180deg, rgba(255,255,255,0.04), transparent 50%)",
        }}
      />
      {children}
    </div>
  );
}
