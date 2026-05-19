interface BackLinkProps {
  label: string;
  onClick: () => void;
}

export function BackLink({ label, onClick }: BackLinkProps) {
  return (
    <button type="button" onClick={onClick} className="back-link">
      ← {label}
    </button>
  );
}
