// Bolt Abacus Design System — GlassCard
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from "react";

type Variant = "default" | "active" | "locked" | "success";

interface GlassCardProps {
  children: ReactNode;
  variant?: Variant;
  style?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

const VARIANTS: Record<Variant, CSSProperties> = {
  default: {
    background: "var(--glass-05)",
    border: "none",
    boxShadow: "none",
  },
  active: {
    background: "var(--glass-05)",
    border: "1px solid var(--y-bolt)",
    boxShadow: "0 0 18px 2px rgba(250,204,21,0.6)",
    animation: "pulse-glow 2.4s ease-in-out infinite",
  },
  locked: {
    background: "var(--glass-05)",
    border: "1px solid var(--glass-10)",
    opacity: 0.6,
  },
  success: {
    background: "var(--glass-05)",
    border: "1px solid var(--ok-50)",
    boxShadow: "0 0 18px var(--ok-20)",
  },
};

export function GlassCard({ children, variant = "default", style = {}, onClick }: GlassCardProps) {
  function handleMouseEnter(e: MouseEvent<HTMLDivElement>) {
    if (variant === "default") {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "0 0 24px rgba(250,204,21,0.15)"; // hover-only soft yellow glow (no exact token)
    }
  }
  function handleMouseLeave(e: MouseEvent<HTMLDivElement>) {
    if (variant === "default") {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick(e as unknown as MouseEvent<HTMLDivElement>);
    }
  }

  return (
    <div
      data-glass
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      style={{
        position: "relative",
        borderRadius: "var(--r-xl)",
        overflow: "hidden",
        backdropFilter: "var(--blur-glass)",
        WebkitBackdropFilter: "var(--blur-glass)",
        cursor: onClick ? "pointer" : "default",
        willChange: onClick ? "transform" : undefined,
        transition: "transform 200ms var(--ease-out), box-shadow 200ms",
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
              ? "linear-gradient(180deg, rgba(255,255,255,0.25), rgba(255,255,255,0.02))" // rim-light gradient stops have no token equivalents
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
