// Bolt Abacus Design System — PathClassDivider
interface PathClassDividerProps {
  label: string;
}

export function PathClassDivider({ label }: PathClassDividerProps) {
  return (
    <div className="path-divider">
      <span>{label}</span>
    </div>
  );
}
