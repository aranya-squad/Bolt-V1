import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJoinClass } from "@/shared/api/queries/useBatches";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { BoltButton } from "@/shared/ui/BoltButton";
import { GlassCard } from "@/shared/ui/GlassCard";
import { Page } from "@/shared/ui/Page";

export default function JoinClassPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const { mutate, isPending, error } = useJoinClass();

  const errDetail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    mutate(trimmed, {
      onSuccess: (batch) => navigate(`/hub?joined=${batch.name}`),
    });
  }

  return (
    <>
      <AmbientScene accents={["yellow", "blue"]} />
      <Page>
        <h1 className="t-h1" style={{ color: "var(--y-bolt)", marginBottom: "var(--s-sm)" }}>
          JOIN A CLASS
        </h1>
        <p className="t-body-md" style={{ color: "var(--fg-muted)", marginBottom: "var(--s-xl)" }}>
          Enter the join code your teacher gave you.
        </p>

        <GlassCard style={{ padding: "var(--s-xl)", maxWidth: 400 }}>
          <form onSubmit={handleSubmit}>
            <label className="t-label" style={{ display: "block", marginBottom: "var(--s-sm)" }}>
              Join Code
            </label>
            <input
              className="field"
              type="text"
              placeholder="e.g. ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={12}
              autoFocus
              style={{ width: "100%", fontFamily: "monospace", letterSpacing: "0.15em", marginBottom: "var(--s-sm)" }}
            />

            {errDetail && (
              <p className="t-body-sm" style={{ color: "var(--err)", marginBottom: "var(--s-sm)" }}>
                {errDetail}
              </p>
            )}

            <BoltButton
              type="submit"
              variant="primary"
              size="md"
              style={{ width: "100%", marginTop: "var(--s-md)" }}
              disabled={!code.trim() || isPending}
            >
              {isPending ? "JOINING…" : "JOIN CLASS"}
            </BoltButton>
          </form>
        </GlassCard>

        <BoltButton
          variant="ghost"
          size="md"
          style={{ marginTop: "var(--s-lg)" }}
          onClick={() => navigate("/hub")}
        >
          BACK TO HUB
        </BoltButton>
      </Page>
    </>
  );
}
