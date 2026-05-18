export function PageSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--color-bg-base)",
        color: "var(--color-text-secondary)",
        fontFamily: "var(--font-body)",
      }}
    >
      Loading…
    </div>
  );
}
