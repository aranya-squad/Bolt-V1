import { useNavigate, useParams } from "react-router-dom";
import { useBatches } from "@/shared/api/queries/useBatches";
import { useRoster } from "@/shared/api/queries/useRoster";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { BreadcrumbChip } from "@/shared/ui/BreadcrumbChip";
import { BoltButton } from "@/shared/ui/BoltButton";
import { GlassCard } from "@/shared/ui/GlassCard";
import { Page } from "@/shared/ui/Page";
import type { RosterStudent } from "@/shared/types";
import { RANK_NAMES } from "@/shared/lib/rankNames";
import { useTeacherIdentity } from "@/shared/api/queries/teacherIdentity";

const TH: React.CSSProperties = {
  textAlign: "left",
  padding: "var(--s-sm) var(--s-md)",
  color: "var(--fg-muted)",
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderBottom: "1px solid var(--glass-10)",
  whiteSpace: "nowrap",
};

const TD: React.CSSProperties = {
  padding: "var(--s-sm) var(--s-md)",
  color: "var(--fg-bone)",
  borderBottom: "1px solid var(--glass-05)",
};

function RosterTable({ students }: { students: RosterStudent[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={TH}>#</th>
            <th style={TH}>Call Sign</th>
            <th style={TH}>Rank</th>
            <th style={TH}>Level</th>
            <th style={TH}>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => (
            <tr key={s.id}>
              <td style={{ ...TD, color: "var(--fg-muted)", width: 40 }}>{i + 1}</td>
              <td style={{ ...TD, fontWeight: 600 }}>{s.call_sign}</td>
              <td style={{ ...TD, color: "var(--p-cyber)", fontSize: 12 }}>
                {RANK_NAMES[s.current_level as keyof typeof RANK_NAMES] ?? `LVL ${s.current_level}`}
              </td>
              <td style={TD}>{s.current_level}</td>
              <td style={TD}>
                {s.accuracy_pct !== null ? `${s.accuracy_pct}%` : <span style={{ color: "var(--fg-muted)" }}>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const batchesQuery = useBatches();
  const rosterQuery = useRoster(batchId);
  const { data: batches } = batchesQuery;
  const { data: roster, isLoading } = rosterQuery;
  const identity = useTeacherIdentity();
  const isFetching = batchesQuery.isFetching || rosterQuery.isFetching;
  const isError = batchesQuery.isError || rosterQuery.isError;

  const batch = batches?.find((b) => b.id === batchId);

  return (
    <>
      <AmbientScene accents={["blue", "purple"]} />
      <Page>
        <BreadcrumbChip items={["Instructor Command", "Class Detail"]} />
        <div style={{ marginTop: "var(--s-md)" }}>
          <BoltButton variant="ghost" size="sm" disabled={!identity || isFetching} onClick={() => {
            void Promise.all([batchesQuery.refetch(), rosterQuery.refetch()]);
          }}>
            {isFetching ? "REFRESHING…" : "REFRESH"}
          </BoltButton>
        </div>

        <h1
          className="t-h1"
          style={{ color: "var(--y-bolt)", marginTop: "var(--s-lg)", marginBottom: "var(--s-sm)" }}
        >
          {batch?.name ?? "BATCH ROSTER"}
        </h1>
        <p className="t-body-sm" style={{ color: "var(--fg-muted)", marginBottom: "var(--s-xl)" }}>
          {batch ? `Join code: ${batch.join_code}` : ""}
        </p>

        {isLoading && <p className="t-body" style={{ color: "var(--fg-muted)" }}>Loading roster…</p>}
        {!isLoading && isFetching && <p role="status" style={{ color: "var(--fg-muted)" }}>Refreshing roster and batch details…</p>}

        {isError && (
          <p role="alert" className="t-body" style={{ color: "var(--err)" }}>
            {roster ? "Failed to refresh roster or batch details. Showing previously loaded data; try Refresh again." : "Failed to load roster or batch details. Try Refresh again."}
          </p>
        )}

        {roster && roster.length === 0 && (
          <GlassCard style={{ padding: "var(--s-xl)", textAlign: "center" }}>
            <p className="t-h3" style={{ color: "var(--fg-sand)", marginBottom: 12 }}>
              No students yet
            </p>
            <p className="t-body-md" style={{ color: "var(--fg-muted)" }}>
              Share the join code{batch ? ` (${batch.join_code})` : ""} with your students.
            </p>
          </GlassCard>
        )}

        {roster && roster.length > 0 && (
          <GlassCard>
            <RosterTable students={roster} />
          </GlassCard>
        )}

        <div style={{ marginTop: "var(--s-xl)" }}>
          <BoltButton variant="ghost" size="md" onClick={() => navigate("/teacher")}>
            BACK TO DASHBOARD
          </BoltButton>
        </div>
      </Page>
    </>
  );
}
