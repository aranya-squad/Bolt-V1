/**
 * DEV PLACEHOLDER — Production login UI awaiting Figma design (ARCHITECTURE.md §2 Q1).
 * This is functional but unstyled. Replace the UI when design delivers the login screen.
 * Do NOT change the API call shape — the endpoint contract is final.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/shared/api/client";
import { useAuthStore } from "@/shared/store/authStore";

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
    <div style={{ maxWidth: 400, margin: "100px auto", fontFamily: "var(--font-body)", color: "var(--color-text-primary)" }}>
      <div style={{ background: "#fff2", padding: 8, marginBottom: 16, borderRadius: 4, fontSize: 12 }}>
        ⚠ DEV LOGIN — production design pending (see ARCHITECTURE.md §2 Q1)
      </div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--color-primary)" }}>
        Bolt Abacus
      </h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 8, borderRadius: 4, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: 8, borderRadius: 4, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
        />
        {error && <p style={{ color: "var(--color-error)", fontSize: 14 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ padding: 10, background: "var(--color-primary)", color: "#1a1a1a", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700 }}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
