import { Navigate, Link } from "react-router-dom";
import { useAuthStore } from "@/shared/store/authStore";
import { roleHome } from "@/shared/lib/roleHome";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { GlassCard } from "@/shared/ui/GlassCard";
import { PageSkeleton } from "@/features/shared/PageSkeleton";

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const isHydrating = useAuthStore((s) => s.isHydrating);

  if (isHydrating) return <PageSkeleton />;
  if (user) return <Navigate to={roleHome(user.role)} replace />;

  return (
    <>
      <AmbientScene accents={["yellow", "purple", "blue"]} />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <GlassCard
          variant="default"
          style={{ width: "100%", maxWidth: 400, padding: "48px 36px", textAlign: "center" }}
        >
          <img
            src="/images/Logo_Gold.svg"
            alt="Bolt Abacus"
            style={{ width: 200, height: "auto", display: "inline-block", marginBottom: 12 }}
          />

          <p
            style={{
              fontFamily: "var(--font-label)",
              fontSize: 12,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--fg-sand)",
              marginBottom: 40,
            }}
          >
            Modern Abacus Practice
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-md)" }}>
            <Link
              to="/login?role=student"
              style={{
                display: "block",
                padding: "14px 0",
                borderRadius: "var(--r-md)",
                background: "var(--y-bolt)",
                color: "var(--bg-noir)",
                fontFamily: "var(--font-label)",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textDecoration: "none",
                transition: "opacity 150ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Student Login
            </Link>

            <Link
              to="/login?role=teacher"
              style={{
                display: "block",
                padding: "14px 0",
                borderRadius: "var(--r-md)",
                background: "transparent",
                border: "1px solid var(--glass-20)",
                color: "var(--fg-bone)",
                fontFamily: "var(--font-label)",
                fontWeight: 600,
                fontSize: 13,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textDecoration: "none",
                transition: "border-color 150ms, color 150ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--fg-sand)";
                e.currentTarget.style.color = "var(--y-bolt)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--glass-20)";
                e.currentTarget.style.color = "var(--fg-bone)";
              }}
            >
              Teacher Login
            </Link>
          </div>
        </GlassCard>
      </div>
    </>
  );
}
