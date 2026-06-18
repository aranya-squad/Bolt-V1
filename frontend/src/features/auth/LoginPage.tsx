import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/shared/api/client";
import { useAuthStore } from "@/shared/store/authStore";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { GlassCard } from "@/shared/ui/GlassCard";
import { BoltButton } from "@/shared/ui/BoltButton";

// PIN digit box width/height
const PIN_BOX = 52;

function PinInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      style={{ display: "flex", gap: 10, justifyContent: "center", cursor: "text" }}
      onClick={() => inputRef.current?.focus()}
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: PIN_BOX,
            height: PIN_BOX,
            borderRadius: "var(--r-lg)",
            border: `2px solid ${value.length === i ? "var(--y-bolt)" : value[i] ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)"}`,
            background: value[i] ? "rgba(250,204,21,0.08)" : "rgba(53,53,52,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--fg-bone)",
            transition: "border-color 150ms, background 150ms",
          }}
        >
          {value[i] ? "•" : ""}
        </div>
      ))}
      {/* Hidden actual input — overlaid invisibly so native keyboard appears */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        maxLength={4}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
        }}
        aria-label="4-digit PIN"
        autoComplete="one-time-code"
      />
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);

  // "student" mode = call-sign + PIN; "guardian" mode = email + password
  const [mode, setMode] = useState<"student" | "guardian">("student");

  // Student fields
  const [callSign, setCallSign] = useState("");
  const [pin, setPin] = useState("");

  // Guardian fields
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
      setError("Wrong call sign or PIN. Ask your teacher or parent for help.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGuardianSubmit(e: React.FormEvent) {
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
            {(["student", "guardian"] as const).map((m) => (
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
                {m === "student" ? "Student" : "Teacher / Parent"}
              </button>
            ))}
          </div>

          {mode === "student" ? (
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
                    textAlign: "center",
                  }}
                >
                  PIN
                </label>
                <PinInput value={pin} onChange={setPin} />
              </div>

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
              onSubmit={handleGuardianSubmit}
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
            </form>
          )}
        </GlassCard>
      </div>
    </>
  );
}
