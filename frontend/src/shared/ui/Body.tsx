// Bolt Abacus Design System — Body
import type { CSSProperties, ReactNode } from "react";

interface BodyProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function Body({ children, style }: BodyProps) {
  return (
    <p
      style={{
        fontFamily: "var(--font-body)",
        fontSize: 18,
        lineHeight: 1.6,
        color: "var(--fg-sand)",
        margin: 0,
        ...style,
      }}
    >
      {children}
    </p>
  );
}
