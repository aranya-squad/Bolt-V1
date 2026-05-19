// Bolt Abacus Design System — BoltButton
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { Icon } from "./Icon";

type Variant = "primary" | "ghost" | "dark";
type Size = "sm" | "md" | "lg";

interface BoltButtonProps {
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  variant?: Variant;
  icon?: string;
  size?: Size;
  style?: CSSProperties;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

const SIZES: Record<Size, { padding: string; fontSize: number; radius: number }> = {
  sm: { padding: "10px 18px", fontSize: 13, radius: 16 },
  md: { padding: "14px 28px", fontSize: 16, radius: 16 },
  lg: { padding: "18px 32px", fontSize: 20, radius: 16 },
};

const VARIANTS: Record<Variant, CSSProperties> = {
  primary: {
    background: "var(--y-bolt)",
    color: "var(--y-bolt-ink)",
    border: "none",
    boxShadow: "0 0 22px rgba(250,204,21,0.4)",
  },
  ghost: {
    background: "transparent",
    color: "var(--fg-bone)",
    border: "2px solid var(--y-bolt-border)",
    backdropFilter: "blur(20px)",
  },
  dark: {
    background: "rgba(53,53,52,0.8)",
    color: "var(--fg-bone)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
};

export function BoltButton({
  children,
  onClick,
  variant = "primary",
  icon,
  size = "md",
  style = {},
  disabled = false,
  type = "button",
}: BoltButtonProps) {
  const s = SIZES[size];
  const v = VARIANTS[variant];

  function handleMouseDown(e: MouseEvent<HTMLButtonElement>) {
    e.currentTarget.style.transform = "scale(0.97)";
  }
  function handleMouseUp(e: MouseEvent<HTMLButtonElement>) {
    e.currentTarget.style.transform = "scale(1)";
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        padding: s.padding,
        borderRadius: s.radius,
        fontFamily: "var(--font-label)",
        fontWeight: 600,
        fontSize: s.fontSize,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        transition: "transform 80ms ease-out, box-shadow 200ms",
        boxShadow: "none",
        ...v,
        ...style,
      }}
      onMouseDown={disabled ? undefined : handleMouseDown}
      onMouseUp={disabled ? undefined : handleMouseUp}
      onMouseLeave={disabled ? undefined : handleMouseUp}
    >
      {icon && !["arrow", "replay"].includes(icon) && (
        <Icon name={icon} size={s.fontSize + 2} color="currentColor" strokeWidth={2.25} />
      )}
      {children}
      {icon === "arrow" && <Icon name="arrow-right" size={s.fontSize + 2} color="currentColor" />}
      {icon === "replay" && <Icon name="rotate-ccw" size={s.fontSize + 2} color="currentColor" />}
    </button>
  );
}
