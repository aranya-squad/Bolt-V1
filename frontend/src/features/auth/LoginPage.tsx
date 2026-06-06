/**
 * DEV PLACEHOLDER — Production login UI awaiting Figma design (ARCHITECTURE.md §2 Q1).
 * This is functional but unstyled. Replace the UI when design delivers the login screen.
 * Do NOT change the API call shape — the endpoint contract is final.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/shared/api/client";
import { useAuthStore } from "@/shared/store/authStore";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { GlassCard } from "@/shared/ui/GlassCard";
import { BoltButton } from "@/shared/ui/BoltButton";

export default function LoginPage() {
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post<{ access: string }>("/auth/login/", {
        email,
        password,
      });
      setAccessToken(data.access);
      const { data: me } = await apiClient.get("/auth/me/");
      setUser(me);
      navigate("/hub");
    } catch {
      setError("Invalid email or password.");
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
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <GlassCard variant="default" style={{ width: "100%", maxWidth: 420, padding: 40 }}>
          {import.meta.env.DEV && (
            <div
              style={{
                fontFamily: "var(--font-label)",
                fontSize: 11,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--fg-sand-50)",
                marginBottom: 24,
                padding: "8px 12px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 8,
              }}
            >
              DEV LOGIN — production design pending (see ARCHITECTURE.md §2 Q1)
            </div>
          )}

          <h1 className="t-h2" style={{ color: "var(--y-bolt)", marginBottom: 32 }}>
            BOLT ABACUS
          </h1>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="field"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="field"
            />

            {error && (
              <p style={{ color: "var(--err)", fontSize: "0.875rem", margin: 0 }}>{error}</p>
            )}

            <BoltButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              style={{ width: "100%", marginTop: 8 }}
            >
              {loading ? "SIGNING IN…" : "SIGN IN"}
            </BoltButton>
          </form>
        </GlassCard>
      </div>
    </>
  );
}
