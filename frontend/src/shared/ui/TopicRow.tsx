import { Icon } from "./Icon";
import { Chip } from "./Chip";

interface TopicRowProps {
  label: string;
  completed: boolean;
  accuracyPct?: number | null;
  locked: boolean;
  onClick?: () => void;
}

export function TopicRow({ label, completed, accuracyPct, locked, onClick }: TopicRowProps) {
  const iconName = locked ? "lock" : completed ? "check-circle-2" : "play";
  const iconColor = locked
    ? "var(--fg-sand-30)"
    : completed
    ? "var(--ok)"
    : "var(--fg-sand)";

  return (
    <div
      role={locked ? undefined : "button"}
      tabIndex={locked ? undefined : 0}
      onClick={locked ? undefined : onClick}
      onKeyDown={locked || !onClick ? undefined : (e) => e.key === "Enter" && onClick?.()}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--s-md) var(--s-lg)",
        borderBottom: "1px solid var(--glass-10)",
        cursor: locked ? "default" : onClick ? "pointer" : "default",
        opacity: locked ? 0.4 : 1,
        pointerEvents: locked ? "none" : "auto",
        transition: "background var(--t-fast)",
        gap: "var(--s-md)",
      }}
      className="table-row"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s-md)" }}>
        <Icon name={iconName} size={16} color={iconColor} />
        <span
          style={{
            fontFamily: "var(--font-label)",
            fontWeight: 500,
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: completed ? "var(--fg-bone)" : "var(--fg-sand)",
          }}
        >
          {label}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--s-sm)" }}>
        {completed && accuracyPct != null ? (
          <Chip tone="ok" style={{ fontSize: 11, padding: "4px 10px" }}>
            {Math.round(accuracyPct)}% ACCURACY
          </Chip>
        ) : !locked ? (
          <Chip tone="neutral" style={{ fontSize: 11, padding: "4px 10px" }}>
            NOT ATTEMPTED
          </Chip>
        ) : null}
        {!locked && onClick && (
          <Icon name="arrow-right" size={14} color="var(--fg-sand-30)" />
        )}
      </div>
    </div>
  );
}
