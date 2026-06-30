import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store/authStore";
import { useBatches, usePatchBatch, useRotateJoinCode } from "@/shared/api/queries/useBatches";
import { useLevels } from "@/shared/api/queries/useLevels";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { BoltButton } from "@/shared/ui/BoltButton";
import { GlassCard } from "@/shared/ui/GlassCard";
import { Page } from "@/shared/ui/Page";
import type { Batch } from "@/shared/types";
import { CreateBatchModal } from "./CreateBatchModal";

// ── Batch card ────────────────────────────────────────────────────────────────

function BatchCard({ batch }: { batch: Batch }) {
  const navigate = useNavigate();
  const { mutate: patch } = usePatchBatch();
  const { mutate: rotate, isPending: rotating } = useRotateJoinCode();

  const [liveLink, setLiveLink] = useState(batch.live_session_link);
  const [liveLinkDirty, setLiveLinkDirty] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(batch.join_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function saveLiveLink() {
    patch({ id: batch.id, payload: { live_session_link: liveLink } }, {
      onSuccess: () => setLiveLinkDirty(false),
    });
  }

  return (
    <GlassCard style={{ padding: "var(--s-xl)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--s-md)" }}>
        <div>
          <h3 className="t-h3" style={{ color: "var(--fg-bone)", marginBottom: 4 }}>
            {batch.name}
          </h3>
          <p className="t-body-sm" style={{ color: "var(--fg-muted)", margin: 0 }}>
            {batch.student_count} student{batch.student_count !== 1 ? "s" : ""}
          </p>
        </div>
        <BoltButton
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/teacher/batch/${batch.id}`)}
        >
          ROSTER
        </BoltButton>
      </div>

      {/* Join code */}
      <div style={{ marginBottom: "var(--s-md)" }}>
        <p className="t-label" style={{ color: "var(--fg-muted)", marginBottom: 6 }}>
          JOIN CODE
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s-sm)" }}>
          <span
            className="t-h2"
            style={{
              color: "var(--y-bolt)",
              letterSpacing: "0.2em",
              fontFamily: "monospace",
              flex: 1,
            }}
          >
            {batch.join_code}
          </span>
          <BoltButton variant="ghost" size="sm" onClick={copyCode}>
            {copied ? "COPIED!" : "COPY"}
          </BoltButton>
          <BoltButton
            variant="ghost"
            size="sm"
            onClick={() => rotate(batch.id)}
            disabled={rotating}
          >
            {rotating ? "…" : "ROTATE"}
          </BoltButton>
        </div>
      </div>

      {/* Live session link */}
      <div style={{ marginBottom: "var(--s-md)" }}>
        <p className="t-label" style={{ color: "var(--fg-muted)", marginBottom: 6 }}>
          LIVE SESSION LINK
        </p>
        <div style={{ display: "flex", gap: "var(--s-sm)" }}>
          <input
            className="field"
            type="url"
            placeholder="https://meet.google.com/…"
            value={liveLink}
            onChange={(e) => { setLiveLink(e.target.value); setLiveLinkDirty(true); }}
            style={{ flex: 1 }}
          />
          {liveLinkDirty && (
            <BoltButton variant="ghost" size="sm" onClick={saveLiveLink}>
              SAVE
            </BoltButton>
          )}
        </div>
      </div>

      {/* Launch */}
      {batch.live_session_link && (
        <BoltButton
          variant="primary"
          size="md"
          style={{ width: "100%" }}
          onClick={() => window.open(batch.live_session_link, "_blank", "noopener")}
        >
          LAUNCH SESSION
        </BoltButton>
      )}
    </GlassCard>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function TeacherDashboardPage() {
  const navigate = useNavigate();
  const { data: batches, isLoading, isError } = useBatches();
  const { data: levels } = useLevels();
  const [showCreate, setShowCreate] = useState(false);

  function handleLogout() {
    useAuthStore.getState().logout();
    navigate("/login");
  }

  return (
    <>
      <AmbientScene accents={["yellow", "blue"]} />
      <Page>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "var(--s-xl)",
            flexWrap: "wrap",
            gap: "var(--s-md)",
          }}
        >
          <h1 className="t-h1" style={{ color: "var(--y-bolt)" }}>
            INSTRUCTOR COMMAND
          </h1>
          <div style={{ display: "flex", gap: "var(--s-sm)" }}>
            <BoltButton variant="primary" size="md" onClick={() => setShowCreate(true)}>
              + CREATE BATCH
            </BoltButton>
            <BoltButton variant="ghost" size="md" onClick={handleLogout}>
              LOG OUT
            </BoltButton>
          </div>
        </div>

        {/* States */}
        {isLoading && <p className="t-body" style={{ color: "var(--fg-muted)" }}>Loading…</p>}

        {isError && (
          <p className="t-body" style={{ color: "var(--err)" }}>
            Failed to load batches.
          </p>
        )}

        {batches && batches.length === 0 && (
          <GlassCard style={{ padding: "var(--s-xl)", textAlign: "center" }}>
            <p className="t-h3" style={{ color: "var(--fg-sand)", marginBottom: 12 }}>
              No batches yet
            </p>
            <p className="t-body-md" style={{ color: "var(--fg-muted)", marginBottom: "var(--s-lg)" }}>
              Create your first batch and share the join code with your students.
            </p>
            <BoltButton variant="primary" size="md" onClick={() => setShowCreate(true)}>
              CREATE BATCH
            </BoltButton>
          </GlassCard>
        )}

        {batches && batches.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "var(--s-lg)" }}>
            {batches.map((b) => (
              <BatchCard key={b.id} batch={b} />
            ))}
          </div>
        )}

        {levels && levels.length > 0 && (
          <div style={{ marginTop: "var(--s-2xl)" }}>
            <h2 className="t-h2" style={{ color: "var(--fg-bone)", marginBottom: "var(--s-md)" }}>
              LEVEL DASHBOARDS
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-sm)" }}>
              {levels.map((lvl) => (
                <Link key={lvl.id} to={`/teacher/level/${lvl.id}`} style={{ textDecoration: "none" }}>
                  <BoltButton variant="ghost" size="sm">
                    LEVEL {lvl.order}
                  </BoltButton>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Page>

      {showCreate && <CreateBatchModal onClose={() => setShowCreate(false)} />}
    </>
  );
}
