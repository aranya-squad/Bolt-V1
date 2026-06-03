import { Chip } from "./Chip";

interface BreadcrumbChipProps {
  items: string[];
}

export function BreadcrumbChip({ items }: BreadcrumbChipProps) {
  return (
    <Chip tone="neutral" style={{ gap: 6 }}>
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && (
            <span style={{ color: "var(--fg-sand-30)", margin: "0 4px" }}>/</span>
          )}
          {item}
        </span>
      ))}
    </Chip>
  );
}
