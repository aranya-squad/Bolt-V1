// Figma frame 1:795 — Victory! (practice session results)
import { useNavigate, useParams } from "react-router-dom";
import { useSession } from "@/shared/api/queries/useSession";
import { useSessionReport } from "@/shared/api/queries/useSessionReport";
import { ResultStatTile } from "@/shared/ui/ResultStatTile";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export default function VictoryPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data: session } = useSession(sessionId!);
  const { data: report, isLoading } = useSessionReport(sessionId!);

  const p = report?.progress;

  return (
    <main className="page-wrap">
      <div className="page-content">
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            color: "var(--color-primary)",
            marginBottom: "var(--space-xl)",
            letterSpacing: "0.04em",
          }}
        >
          VICTORY!
        </h1>

        {isLoading && (
          <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>
        )}

        {p && (
          <>
            <div className="stats-row">
              <ResultStatTile
                value={`${p.score_correct}/${p.score_total}`}
                label="Score"
                valueColor="var(--color-primary)"
              />
              <ResultStatTile
                value={`${p.accuracy_pct.toFixed(1)}%`}
                label="Accuracy"
                valueColor="var(--color-accent-blue)"
              />
              <ResultStatTile
                value={`+${p.xp_earned} XP`}
                label="XP Earned"
                valueColor="var(--color-accent-orange)"
              />
              <ResultStatTile value={formatTime(p.time_taken_sec)} label="Time" />
            </div>

            {/* Per-question breakdown */}
            {report.attempts.length > 0 && (
              <div style={{ overflowX: "auto", marginBottom: "var(--space-2xl)" }}>
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
                            padding: "var(--space-sm) var(--space-md)",
                            color: "var(--color-text-secondary)",
                            borderBottom: "1px solid var(--color-border)",
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
                        <td style={{ padding: "var(--space-sm) var(--space-md)", color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>
                          {a.question_index + 1}
                        </td>
                        <td style={{ padding: "var(--space-sm) var(--space-md)", color: "var(--color-text-primary)", borderBottom: "1px solid var(--color-border)" }}>
                          {a.question_text}
                        </td>
                        <td style={{ padding: "var(--space-sm) var(--space-md)", color: a.is_correct ? "var(--color-success)" : "var(--color-error)", borderBottom: "1px solid var(--color-border)" }}>
                          {a.submitted_answer}
                        </td>
                        <td style={{ padding: "var(--space-sm) var(--space-md)", color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>
                          {a.expected_answer}
                        </td>
                        <td style={{ padding: "var(--space-sm) var(--space-md)", borderBottom: "1px solid var(--color-border)", color: a.is_correct ? "var(--color-success)" : "var(--color-error)" }}>
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

        <div className="btn-row">
          <button
            type="button"
            onClick={() => navigate(`/practice/setup/${session?.kind ?? "CUSTOM"}`)}
            className="btn btn-secondary"
            style={{ flex: 1, padding: "var(--space-md)", fontSize: "1.1rem" }}
          >
            PLAY AGAIN
          </button>
          <button
            type="button"
            onClick={() => navigate("/hub")}
            className="btn btn-primary"
            style={{ flex: 2, padding: "var(--space-md)", fontSize: "1.1rem" }}
          >
            RETURN TO HUB
          </button>
        </div>
      </div>
    </main>
  );
}
