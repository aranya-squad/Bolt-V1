import { useState, useId, type ReactNode } from "react";
import { Icon } from "./Icon";

interface ClassAccordionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function ClassAccordion({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: ClassAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div
      style={{
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        background: "var(--glass-05)",
        border: "1px solid var(--glass-10)",
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--s-md) var(--s-lg)",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          gap: "var(--s-md)",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-label)",
              fontWeight: 600,
              fontSize: 14,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--fg-bone)",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 13,
                color: "var(--fg-sand)",
                marginTop: 2,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        <Icon
          name="arrow-right"
          size={16}
          color="var(--fg-sand)"
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform var(--t-med) var(--ease-out)",
            flexShrink: 0,
          }}
        />
      </button>

      <div
        id={panelId}
        style={{
          display: open ? "block" : "none",
          borderTop: "1px solid var(--glass-10)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
