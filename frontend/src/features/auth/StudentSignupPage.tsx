import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "@/shared/api/client";
import { useAuthStore } from "@/shared/store/authStore";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { GlassCard } from "@/shared/ui/GlassCard";
import { BoltButton } from "@/shared/ui/BoltButton";
import { PinInput } from "@/shared/ui/PinInput";

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-label)",
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--fg-sand)",
  marginBottom: 8,
};

export default function StudentSignupPage() {
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);

  const [callSign, setCallSign] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [dob, setDob] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (callSign.trim().length < 3) return "Call sign must be at least 3 characters.";
    if (callSign.trim().length > 32) return "Call sign must be 32 characters or fewer.";
    if (pin.length !== 4) return "PIN must be exactly 4 digits.";
    if (pin !== pinConfirm) return "PINs do not match.";
    if (!dob) return "Date of birth is required.";
    if (!joinCode.trim()) return "Class code is required. Ask your teacher.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post<{ access: string }>("/auth/register-student/", {
        call_sign: callSign.trim(),
        pin,
        date_of_birth: dob,
        join_code: joinCode.trim().toUpperCase(),
      });
      setAccessToken(data.access);
      const { data: me } = await apiClient.get("/auth/me/");
      setUser(me);
      navigate("/onboarding");
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
              JOIN BOLT
            </h1>
            <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.25em", color: "var(--fg-sand)", textTransform: "uppercase" }}>
              Student Sign-Up
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Class code — first and prominent per 2f */}
            <div>
              <label style={LABEL_STYLE}>Class Code</label>
              <input
                type="text"
                placeholder="e.g. J66QER"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                required
                className="field field--mono"
                autoCapitalize="characters"
                autoCorrect="off"
                maxLength={12}
              />
              {!joinCode.trim() && (
                <p style={{ fontSize: "0.75rem", color: "var(--fg-sand)", margin: "6px 0 0", lineHeight: 1.4 }}>
                  Don't have a code?{" "}
                  <span style={{ color: "var(--y-bolt)" }}>Ask your teacher</span> — they'll give you one after creating a class.
                </p>
              )}
            </div>

            <div>
              <label style={LABEL_STYLE}>Call Sign</label>
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
                minLength={3}
                maxLength={32}
              />
            </div>

            <PinInput value={pin} onChange={setPin} label="PIN (4 digits)" />

            <PinInput value={pinConfirm} onChange={setPinConfirm} label="Confirm PIN" />

            <div>
              <label style={LABEL_STYLE}>Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                className="field"
                max={new Date().toISOString().split("T")[0]}
              />
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
              disabled={loading}
              style={{ width: "100%", marginTop: 4 }}
            >
              {loading ? "CREATING ACCOUNT…" : "LET'S GO"}
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
