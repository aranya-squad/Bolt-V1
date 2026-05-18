/**
 * DEV PLACEHOLDER — Production register UI awaiting Figma design (ARCHITECTURE.md §2 Q1).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/shared/api/client";
import { useAuthStore } from "@/shared/store/authStore";

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post<{ access: string }>("/auth/register/", {
        email,
        password,
        display_name: displayName,
      });
      setAccessToken(data.access);
      const { data: me } = await apiClient.get("/auth/me/");
      setUser(me);
      navigate("/hub");
    } catch (err: unknown) {
      setError("Registration failed. Check your details.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", fontFamily: "var(--font-body)", color: "var(--color-text-primary)" }}>
      <div style={{ background: "#fff2", padding: 8, marginBottom: 16, borderRadius: 4, fontSize: 12 }}>
        ⚠ DEV REGISTER — production design pending
      </div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--color-primary)" }}>
        Create Guardian Account
      </h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="text"
          placeholder="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          style={{ padding: 8, borderRadius: 4, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
        />
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
          placeholder="Password (10+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={10}
          style={{ padding: 8, borderRadius: 4, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
        />
        {error && <p style={{ color: "var(--color-error)", fontSize: 14 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ padding: 10, background: "var(--color-primary)", color: "#1a1a1a", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700 }}
        >
          {loading ? "Creating account…" : "Register"}
        </button>
      </form>
    </div>
  );
}
