import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "@/shared/api/client";
import { useAuthStore } from "@/shared/store/authStore";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { GlassCard } from "@/shared/ui/GlassCard";
import { BoltButton } from "@/shared/ui/BoltButton";

// TODO(debt): email verification gate deferred — teacher can act immediately after signup.
// Wave 2d (email provider) + BL-1 (hardened onboarding) must land before this goes fully open.

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-label)",
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--fg-sand)",
  marginBottom: 8,
};

export default function TeacherSignupPage() {
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState("");
  const [signupSecret, setSignupSecret] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (!displayName.trim()) return "Full name is required.";
    if (password.length < 10) return "Password must be at least 10 characters.";
    if (!termsAccepted) return "You must accept the terms to continue.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post<{ access: string }>("/auth/register-teacher/", {
        display_name: displayName.trim(),
        email,
        password,
        org: org.trim() || undefined,
        signup_secret: signupSecret,
      });
      setAccessToken(data.access);
      const { data: me } = await apiClient.get("/auth/me/");
      setUser(me);
      navigate("/teacher");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (detail) {
        setError(detail);
      } else {
        setError("Sign-up failed. Check your details and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

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
        <GlassCard variant="default" style={{ width: "100%", maxWidth: 420, padding: "40px 36px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h1 className="t-h1" style={{ color: "var(--y-bolt)", letterSpacing: "0.06em", marginBottom: 4 }}>
              INSTRUCTOR
            </h1>
            <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.25em", color: "var(--fg-sand)", textTransform: "uppercase" }}>
              Create Account
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={LABEL_STYLE}>Full Name</label>
              <input
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="field"
                autoComplete="name"
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>Email</label>
              <input
                type="email"
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="field"
                autoComplete="email"
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>Password</label>
              <input
                type="password"
                placeholder="10+ characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={10}
                className="field"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>School / Organisation (optional)</label>
              <input
                type="text"
                placeholder="e.g. Riverside Academy"
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                className="field"
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>Signup Code</label>
              <input
                type="text"
                placeholder="Provided by your admin"
                value={signupSecret}
                onChange={(e) => setSignupSecret(e.target.value)}
                required
                className="field"
                autoComplete="off"
              />
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                cursor: "pointer",
                color: "var(--fg-sand)",
                fontSize: "0.8rem",
                lineHeight: 1.5,
              }}
            >
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              I agree to the Terms of Service and understand my responsibility for student data under FERPA.
            </label>

            {error && (
              <p style={{ color: "var(--err)", fontSize: "0.875rem", margin: 0, textAlign: "center" }}>
                {error}
              </p>
            )}

            <BoltButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              style={{ width: "100%", marginTop: 4 }}
            >
              {loading ? "CREATING ACCOUNT…" : "CREATE ACCOUNT"}
            </BoltButton>

            <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--fg-sand)", margin: 0 }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "var(--y-bolt)", textDecoration: "underline" }}>
                Sign in
              </Link>
            </p>
          </form>
        </GlassCard>
      </div>
    </>
  );
}
