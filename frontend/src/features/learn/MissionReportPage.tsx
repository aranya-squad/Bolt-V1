import { useNavigate, useParams } from "react-router-dom";
import { useSessionReport } from "@/shared/api/queries/useSessionReport";
import { ResultStatTile } from "@/shared/ui/ResultStatTile";
import { Page } from "@/shared/ui/Page";
import { BoltButton } from "@/shared/ui/BoltButton";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export default function MissionReportPage() {
  const { levelId, sessionId } = useParams<{ levelId: string; sessionId: string }>();
  const navigate = useNavigate();
  const { data: report, isLoading } = useSessionReport(sessionId!);

  const p = report?.progress;

  return (
    <Page>
      <h1 className="t-h1" style={{ color: "var(--y-bolt)", marginBottom: 40 }}>
        MISSION REPORT
      </h1>

      {isLoading && (
        <p style={{ color: "var(--fg-sand)" }}>Loading…</p>
      )}

      {p && (
        <>
          <div className="stats-row">
            <ResultStatTile
              value={`${p.score_correct}/${p.score_total}`}
              label="Score"
              valueColor="var(--y-bolt)"
            />
            <ResultStatTile
              value={`${p.accuracy_pct.toFixed(1)}%`}
              label="Accuracy"
              valueColor="var(--bolt-blue)"
            />
            <ResultStatTile
              value={`+${p.xp_earned} XP`}
              label="XP Earned"
              valueColor="var(--orange-streak)"
            />
            <ResultStatTile
              value={formatTime(p.time_taken_sec)}
              label="Time"
            />
          </div>

          {report.attempts.length > 0 && (
            <div style={{ overflowX: "auto", marginBottom: 48 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.9rem",
                }}
              >
                <thead>
                  <tr>
                    {["#", "Question", "Your Answer", "Correct Answer", ""].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "var(--s-sm) var(--s-md)",
                          color: "var(--fg-sand)",
                          borderBottom: "1px solid var(--md-outline)",
                          fontFamily: "var(--font-body)",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.attempts.map((a) => (
                    <tr key={a.question_index} className="table-row">
                      <td style={{ padding: "var(--s-sm) var(--s-md)", color: "var(--fg-sand)", borderBottom: "1px solid var(--md-outline)" }}>
                        {a.question_index + 1}
                      </td>
                      <td style={{ padding: "var(--s-sm) var(--s-md)", color: "var(--fg-bone)", borderBottom: "1px solid var(--md-outline)" }}>
                        {a.question_text}
                      </td>
                      <td style={{ padding: "var(--s-sm) var(--s-md)", color: a.is_correct ? "var(--ok)" : "var(--err)", borderBottom: "1px solid var(--md-outline)" }}>
                        {a.submitted_answer}
                      </td>
                      <td style={{ padding: "var(--s-sm) var(--s-md)", color: "var(--fg-sand)", borderBottom: "1px solid var(--md-outline)" }}>
                        {a.expected_answer}
                      </td>
                      <td style={{ padding: "var(--s-sm) var(--s-md)", borderBottom: "1px solid var(--md-outline)", color: a.is_correct ? "var(--ok)" : "var(--err)" }}>
                        {a.is_correct ? "✓" : "✗"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <BoltButton
          variant="ghost"
          size="md"
          style={{ flex: 1 }}
          onClick={() => navigate(`/learn/level/${levelId}/classwork`)}
        >
          RETRY
        </BoltButton>
        <BoltButton
          variant="primary"
          size="md"
          style={{ flex: 2 }}
          onClick={() => navigate("/hub")}
        >
          RETURN TO HUB
        </BoltButton>
      </div>
    </Page>
  );
}
