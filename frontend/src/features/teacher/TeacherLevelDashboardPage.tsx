import { useParams, Link } from "react-router-dom";
import { Page } from "@/shared/ui/Page";
import { GlassCard } from "@/shared/ui/GlassCard";
import { BoltButton } from "@/shared/ui/BoltButton";
import { PageSkeleton } from "@/features/shared/PageSkeleton";
import { useTeacherLevelDashboard } from "@/shared/api/queries/useTeacherLevelDashboard";
import { useTeacherIdentity } from "@/shared/api/queries/teacherIdentity";

export default function TeacherLevelDashboardPage() {
  const { levelId } = useParams<{ levelId: string }>();
  const { data, isLoading, isError, isFetching, refetch } = useTeacherLevelDashboard(levelId ?? "");
  const identity = useTeacherIdentity();

  if (isLoading) return <PageSkeleton />;
  if (!data) {
    return (
      <Page>
        <p role="alert" style={{ color: "var(--err)" }}>Failed to load level dashboard. Try Refresh again.</p>
        <BoltButton variant="ghost" size="md" disabled={!identity || isFetching} onClick={() => { void refetch(); }}>
          {isFetching ? "REFRESHING…" : "REFRESH"}
        </BoltButton>
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
        <BoltButton variant="ghost" size="sm" disabled={!identity || isFetching} onClick={() => { void refetch(); }}>
          {isFetching ? "REFRESHING…" : "REFRESH"}
        </BoltButton>
      </div>
      {isFetching && <p role="status" style={{ color: "var(--fg-muted)" }}>Refreshing level dashboard…</p>}
      {isError && <p role="alert" style={{ color: "var(--err)" }}>Failed to refresh level dashboard. Showing previously loaded data; try Refresh again.</p>}

      {classes.length === 0 && (
        <p className="t-body-sm" style={{ color: "var(--fg-sand)" }}>
          No classes have this level assigned.
        </p>
      )}
      {lessons.length === 0 && <p style={{ color: "var(--fg-muted)" }}>No topics in this level yet.</p>}

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
              {lessons.map(lesson => {
                const stat = cls.lessons.find(item => item.lesson_id === lesson.id);
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
