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
    <div className="page-content--auth">
      <div
        style={{
          background: "var(--color-glass)",
          padding: "var(--space-sm)",
          marginBottom: "var(--space-md)",
          borderRadius: "var(--radius-sm)",
          fontSize: "0.75rem",
          color: "var(--color-text-secondary)",
        }}
      >
        DEV LOGIN — production design pending (see ARCHITECTURE.md §2 Q1)
      </div>

      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "2.5rem",
          color: "var(--color-primary)",
          marginBottom: "var(--space-lg)",
        }}
      >
        Bolt Abacus
      </h1>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}
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
          <p style={{ color: "var(--color-error)", fontSize: "0.875rem" }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ padding: "var(--space-md)", fontSize: "1rem" }}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
