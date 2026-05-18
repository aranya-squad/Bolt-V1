// Figma frame 1:795 — Victory! (practice session results)
import { useNavigate, useParams } from "react-router-dom";
import { useSession } from "@/shared/api/queries/useSession";
import { useSessionReport } from "@/shared/api/queries/useSessionReport";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

const statTile: React.CSSProperties = {
  flex: 1,
  padding: "var(--space-md) var(--space-lg)",
  background: "var(--color-surface)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  textAlign: "center",
};

export default function VictoryPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data: session } = useSession(sessionId!);
  const { data: report, isLoading } = useSessionReport(sessionId!);

  const p = report?.progress;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-bg-base)",
        padding: "var(--space-xl)",
        fontFamily: "var(--font-body)",
        color: "var(--color-text-primary)",
        maxWidth: 960,
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          color: "var(--color-primary)",
          margin: "0 0 var(--space-xl)",
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
          {/* Stat tiles */}
          <div style={{ display: "flex", gap: "var(--space-md)", marginBottom: "var(--space-2xl)" }}>
            <div style={statTile}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.8rem",
                  color: "var(--color-primary)",
                  letterSpacing: "0.04em",
                }}
              >
                {p.score_correct}/{p.score_total}
              </div>
              <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem", marginTop: 2 }}>
                Score
              </div>
            </div>

            <div style={statTile}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.8rem",
                  color: "var(--color-accent-blue)",
                  letterSpacing: "0.04em",
                }}
              >
                {p.accuracy_pct.toFixed(1)}%
              </div>
              <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem", marginTop: 2 }}>
                Accuracy
              </div>
            </div>

            <div style={statTile}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.8rem",
                  color: "var(--color-accent-orange)",
                  letterSpacing: "0.04em",
                }}
              >
                +{p.xp_earned} XP
              </div>
              <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem", marginTop: 2 }}>
                XP Earned
              </div>
            </div>

            <div style={statTile}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.8rem",
                  color: "var(--color-text-primary)",
                  letterSpacing: "0.04em",
                }}
              >
                {formatTime(p.time_taken_sec)}
              </div>
              <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem", marginTop: 2 }}>
                Time
              </div>
            </div>
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
                    <tr key={a.question_index}>
                      <td
                        style={{
                          padding: "var(--space-sm) var(--space-md)",
                          color: "var(--color-text-secondary)",
                          borderBottom: "1px solid var(--color-border)",
                        }}
                      >
                        {a.question_index + 1}
                      </td>
                      <td
                        style={{
                          padding: "var(--space-sm) var(--space-md)",
                          color: "var(--color-text-primary)",
                          borderBottom: "1px solid var(--color-border)",
                        }}
                      >
                        {a.question_text}
                      </td>
                      <td
                        style={{
                          padding: "var(--space-sm) var(--space-md)",
                          color: a.is_correct ? "var(--color-success)" : "var(--color-error)",
                          borderBottom: "1px solid var(--color-border)",
                        }}
                      >
                        {a.submitted_answer}
                      </td>
                      <td
                        style={{
                          padding: "var(--space-sm) var(--space-md)",
                          color: "var(--color-text-secondary)",
                          borderBottom: "1px solid var(--color-border)",
                        }}
                      >
                        {a.expected_answer}
                      </td>
                      <td
                        style={{
                          padding: "var(--space-sm) var(--space-md)",
                          borderBottom: "1px solid var(--color-border)",
                          color: a.is_correct ? "var(--color-success)" : "var(--color-error)",
                        }}
                      >
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

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "var(--space-md)" }}>
        <button
          type="button"
          onClick={() => navigate(`/practice/setup/${session?.kind ?? "CUSTOM"}`)}
          style={{
            flex: 1,
            padding: "var(--space-md)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-display)",
            fontSize: "1.1rem",
            letterSpacing: "0.04em",
            cursor: "pointer",
          }}
        >
          PLAY AGAIN
        </button>
        <button
          type="button"
          onClick={() => navigate("/hub")}
          style={{
            flex: 2,
            padding: "var(--space-md)",
            background: "var(--color-primary)",
            border: "none",
            borderRadius: "var(--radius-md)",
            color: "#000",
            fontFamily: "var(--font-display)",
            fontSize: "1.1rem",
            letterSpacing: "0.04em",
            cursor: "pointer",
          }}
        >
          RETURN TO HUB
        </button>
      </div>
    </main>
  );
}
