import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/shared/api/client";
import { useAuthStore } from "@/shared/store/authStore";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { GlassCard } from "@/shared/ui/GlassCard";
import { BoltButton } from "@/shared/ui/BoltButton";
import { PinInput } from "@/shared/ui/PinInput";

export default function LoginPage() {
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);

  // "student" mode = call-sign + PIN; "teacher" mode = email + password
  const [mode, setMode] = useState<"student" | "teacher">("student");

  // Student fields
  const [callSign, setCallSign] = useState("");
  const [pin, setPin] = useState("");

  // Teacher fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStudentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) return;
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post<{ access: string }>("/auth/callsign-login/", {
        call_sign: callSign.trim(),
        pin,
      });
      setAccessToken(data.access);
      const { data: me } = await apiClient.get("/auth/me/");
      setUser(me);
      navigate("/hub");
    } catch {
      setError("Wrong call sign or PIN. Ask your teacher for help.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTeacherSubmit(e: React.FormEvent) {
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
      navigate(me.role === "TEACHER" ? "/teacher" : "/hub");
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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <GlassCard
          variant="default"
          style={{ width: "100%", maxWidth: 400, padding: "40px 36px" }}
        >
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h1
              className="t-h1"
              style={{ color: "var(--y-bolt)", letterSpacing: "0.06em", marginBottom: 4 }}
            >
              BOLT
            </h1>
            <div
              style={{
                fontFamily: "var(--font-label)",
                fontSize: 11,
                letterSpacing: "0.25em",
                color: "var(--fg-sand)",
                textTransform: "uppercase",
              }}
            >
              Abacus
            </div>
          </div>

          {/* Mode toggle */}
          <div
            style={{
              display: "flex",
              background: "rgba(53,53,52,0.6)",
              borderRadius: "var(--r-lg)",
              padding: 3,
              marginBottom: 28,
            }}
          >
            {(["student", "teacher"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  borderRadius: "var(--r-md)",
                  background: mode === m ? "var(--glass-10)" : "transparent",
                  border: mode === m ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
                  color: mode === m ? "var(--fg-bone)" : "var(--fg-sand)",
                  fontFamily: "var(--font-label)",
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "background 150ms, color 150ms",
                }}
              >
                {m === "student" ? "Student" : "Teacher"}
              </button>
            ))}
          </div>

          {mode !== "teacher" ? (
            <form
              onSubmit={handleStudentSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "var(--font-label)",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--fg-sand)",
                    marginBottom: 8,
                  }}
                >
                  Your Call Sign
                </label>
                <input
                  type="text"
                  placeholder="e.g. ThunderBolt99"
                  value={callSign}
                  onChange={(e) => setCallSign(e.target.value)}
                  required
                  className="field"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                />
              </div>

              <PinInput value={pin} onChange={setPin} label="PIN" />

              {error && (
                <p style={{ color: "var(--err)", fontSize: "0.875rem", margin: 0, textAlign: "center" }}>
                  {error}
                </p>
              )}

              <BoltButton
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading || callSign.trim().length === 0 || pin.length !== 4}
                style={{ width: "100%", marginTop: 4 }}
              >
                {loading ? "SIGNING IN…" : "LET'S GO"}
              </BoltButton>
            </form>
          ) : (
            <form
              onSubmit={handleTeacherSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="field"
                autoComplete="email"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="field"
                autoComplete="current-password"
              />

              {error && (
                <p style={{ color: "var(--err)", fontSize: "0.875rem", margin: 0 }}>{error}</p>
              )}

              <BoltButton
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                style={{ width: "100%", marginTop: 4 }}
              >
                {loading ? "SIGNING IN…" : "SIGN IN"}
              </BoltButton>

              <p style={{ textAlign: "center", marginTop: 16, fontSize: "0.8rem", color: "var(--fg-sand)" }}>
                New teacher?{" "}
                <a href="/register/teacher" style={{ color: "var(--y-bolt)", textDecoration: "underline" }}>
                  Create an account
                </a>
              </p>
            </form>
          )}
        </GlassCard>
      </div>
    </>
  );
}
