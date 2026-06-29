import { useState } from "react";
import { GlassCard } from "@/shared/ui/GlassCard";
import { BoltButton } from "@/shared/ui/BoltButton";
import { useCreateBatch } from "@/shared/api/queries/useBatches";

interface Props {
  onClose: () => void;
}

export function CreateBatchModal({ onClose }: Props) {
  const [name, setName] = useState("");
  const { mutate, isPending, error } = useCreateBatch();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    mutate(name.trim(), { onSuccess: onClose });
  }

  const errMsg = (error as { response?: { data?: { name?: string[] } } })?.response?.data?.name?.[0];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 100,
        }}
      />
      {/* Modal */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 101,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--s-lg)",
        }}
      >
        <GlassCard style={{ width: "100%", maxWidth: 420, padding: "var(--s-xl)" }}>
          <h2 className="t-h2" style={{ color: "var(--y-bolt)", marginBottom: "var(--s-lg)" }}>
            CREATE BATCH
          </h2>
          <form onSubmit={handleSubmit}>
            <label className="t-label" style={{ display: "block", marginBottom: "var(--s-sm)" }}>
              Batch Name
            </label>
            <input
              className="field"
              type="text"
              placeholder="e.g. Grade 3 — Morning"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={128}
              autoFocus
              style={{ width: "100%", marginBottom: "var(--s-sm)" }}
            />
            {errMsg && (
              <p className="t-body-sm" style={{ color: "var(--err)", marginBottom: "var(--s-sm)" }}>
                {errMsg}
              </p>
            )}
            <div style={{ display: "flex", gap: "var(--s-sm)", marginTop: "var(--s-md)" }}>
              <BoltButton
                type="button"
                variant="ghost"
                size="md"
                style={{ flex: 1 }}
                onClick={onClose}
              >
                CANCEL
              </BoltButton>
              <BoltButton
                type="submit"
                variant="primary"
                size="md"
                style={{ flex: 2 }}
                disabled={!name.trim() || isPending}
              >
                {isPending ? "CREATING…" : "CREATE"}
              </BoltButton>
            </div>
          </form>
        </GlassCard>
      </div>
    </>
  );
}
