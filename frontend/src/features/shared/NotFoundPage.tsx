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
        background: "var(--bg-noir)",
        color: "var(--fg-bone)",
        fontFamily: "var(--font-body)",
      }}
    >
      <h1 className="t-hero" style={{ color: "var(--y-bolt)" }}>
        404
      </h1>
      <p style={{ color: "var(--fg-sand)" }}>Page not found.</p>
      <Link to="/hub" style={{ color: "var(--y-bolt)" }}>
        Back to Hub
      </Link>
    </div>
  );
}
