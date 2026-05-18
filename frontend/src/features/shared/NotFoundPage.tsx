import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1rem",
        background: "var(--color-bg-base)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-body)",
      }}
    >
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "4rem", color: "var(--color-primary)" }}>
        404
      </h1>
      <p style={{ color: "var(--color-text-secondary)" }}>Page not found.</p>
      <Link to="/hub" style={{ color: "var(--color-primary)" }}>
        Back to Hub
      </Link>
    </div>
  );
}
