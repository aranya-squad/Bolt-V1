// Bolt Abacus Design System — Page
import type { ReactNode } from "react";

interface PageProps {
  children: ReactNode;
  padded?: boolean;
}

export function Page({ children, padded = true }: PageProps) {
  return (
    <div
      className="screen-enter"
      style={{
        position: "relative",
        zIndex: 1,
        minHeight: "calc(100vh - 77px)",
        padding: padded ? "64px 64px 80px" : 0,
        maxWidth: 1280,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}
