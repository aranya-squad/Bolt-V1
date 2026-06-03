import { Icon } from "./Icon";
import type { QuestionAttempt, QuestionVerdict } from "@/shared/types";

interface AttemptsTableProps {
  attempts: QuestionAttempt[];
  questionVerdicts?: Record<number, QuestionVerdict>;
}

const CELL: React.CSSProperties = {
  padding: "var(--s-sm) var(--s-md)",
  borderBottom: "1px solid var(--md-outline)",
};

function groupByQuestion(attempts: QuestionAttempt[]): Map<number, QuestionAttempt[]> {
  const map = new Map<number, QuestionAttempt[]>();
  for (const a of attempts) {
    const group = map.get(a.question_index) ?? [];
    group.push(a);
    map.set(a.question_index, group);
  }
  return map;
}

export function AttemptsTable({ attempts, questionVerdicts }: AttemptsTableProps) {
  if (attempts.length === 0) return null;

  const groups = groupByQuestion(attempts);

  return (
    <div style={{ overflowX: "auto", marginBottom: "var(--s-xl)" }}>
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
                  ...CELL,
                  textAlign: "left",
                  color: "var(--fg-sand)",
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
          {Array.from(groups.entries()).map(([qIndex, group]) => {
            const verdict = questionVerdicts?.[qIndex];
            const fixed = verdict === "fixed";
            return group.map((a, i) => {
              const isRetry = i > 0;
              return (
                <tr key={`${qIndex}-${a.attempt_number}`} className="table-row">
                  <td style={{ ...CELL, color: "var(--fg-sand)" }}>
                    {isRetry ? (
                      <span style={{ color: "var(--fg-sand-30)", paddingLeft: 8 }}>
                        ↳ Retry #{a.attempt_number}
                      </span>
                    ) : (
                      qIndex + 1
                    )}
                  </td>
                  <td style={{ ...CELL, color: isRetry ? "var(--fg-sand)" : "var(--fg-bone)" }}>
                    {a.question_text}
                  </td>
                  <td style={{ ...CELL, color: a.is_correct ? "var(--ok)" : "var(--err)" }}>
                    {a.submitted_answer}
                  </td>
                  <td style={{ ...CELL, color: "var(--fg-sand)" }}>{a.expected_answer}</td>
                  <td style={{ ...CELL }}>
                    {!isRetry && fixed ? (
                      <Icon name="wrench" size={14} color="var(--y-bolt)" />
                    ) : (
                      <span style={{ color: a.is_correct ? "var(--ok)" : "var(--err)" }}>
                        {a.is_correct ? "✓" : "✗"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
