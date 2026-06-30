import { useParams, Link } from "react-router-dom";
import { Page } from "@/shared/ui/Page";
import { GlassCard } from "@/shared/ui/GlassCard";
import { BoltButton } from "@/shared/ui/BoltButton";
import { PageSkeleton } from "@/features/shared/PageSkeleton";
import { useTeacherLevelDashboard } from "@/shared/api/queries/useTeacherLevelDashboard";

export default function TeacherLevelDashboardPage() {
  const { levelId } = useParams<{ levelId: string }>();
  const { data, isLoading, isError } = useTeacherLevelDashboard(levelId ?? "");

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) {
    return (
      <Page>
        <p style={{ color: "var(--err)" }}>Failed to load level dashboard.</p>
        <Link to="/teacher">
          <BoltButton variant="ghost" size="md">BACK</BoltButton>
        </Link>
      </Page>
    );
  }

  const { level, lessons, classes } = data;

  return (
    <Page>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s-lg)", marginBottom: "var(--s-xl)" }}>
        <Link to="/teacher">
          <BoltButton variant="ghost" size="sm">BACK</BoltButton>
        </Link>
        <h1 className="t-h1" style={{ color: "var(--y-bolt)", margin: 0 }}>
          LEVEL {level.order} — {level.name.toUpperCase()}
        </h1>
      </div>

      {classes.length === 0 && (
        <p className="t-body-sm" style={{ color: "var(--fg-sand)" }}>
          No classes have this level assigned.
        </p>
      )}

      {classes.map((cls) => (
        <GlassCard
          key={cls.id}
          style={{ marginBottom: "var(--s-lg)", padding: "var(--s-xl)", overflowX: "auto" }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "var(--s-md)", marginBottom: "var(--s-md)" }}>
            <h2 className="t-h2" style={{ color: "var(--fg-bone)", margin: 0 }}>{cls.name}</h2>
            <span className="t-label" style={{ color: "var(--fg-muted)" }}>
              {cls.total_students} student{cls.total_students !== 1 ? "s" : ""}
            </span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
            <thead>
              <tr>
                <th
                  className="t-label"
                  style={{
                    textAlign: "left",
                    color: "var(--fg-muted)",
                    padding: "4px 8px",
                    borderBottom: "1px solid var(--glass-10)",
                    whiteSpace: "nowrap",
                  }}
                >
                  TOPIC
                </th>
                <th
                  className="t-label"
                  style={{
                    color: "var(--fg-muted)",
                    padding: "4px 8px",
                    borderBottom: "1px solid var(--glass-10)",
                  }}
                >
                  CLASSWORK
                </th>
                <th
                  className="t-label"
                  style={{
                    color: "var(--fg-muted)",
                    padding: "4px 8px",
                    borderBottom: "1px solid var(--glass-10)",
                  }}
                >
                  HOMEWORK
                </th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((lesson, idx) => {
                const stat = cls.lessons[idx];
                const cw = stat?.classwork_completed ?? 0;
                const hw = stat?.homework_completed ?? 0;
                const total = cls.total_students;
                const cwDone = total > 0 && cw >= total;
                const hwDone = total > 0 && hw >= total;
                return (
                  <tr key={lesson.id}>
                    <td
                      className="t-body-sm"
                      style={{
                        padding: "6px 8px",
                        color: "var(--fg-bone)",
                        borderBottom: "1px solid var(--glass-05)",
                      }}
                    >
                      {lesson.name}
                    </td>
                    <td
                      className="t-label"
                      style={{
                        padding: "6px 8px",
                        textAlign: "center",
                        color: cwDone ? "var(--ok-50)" : "var(--fg-sand)",
                        borderBottom: "1px solid var(--glass-05)",
                      }}
                    >
                      {cw}/{total}
                    </td>
                    <td
                      className="t-label"
                      style={{
                        padding: "6px 8px",
                        textAlign: "center",
                        color: hwDone ? "var(--ok-50)" : "var(--fg-sand)",
                        borderBottom: "1px solid var(--glass-05)",
                      }}
                    >
                      {hw}/{total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </GlassCard>
      ))}
    </Page>
  );
}
