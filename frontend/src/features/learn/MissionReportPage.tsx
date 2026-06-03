import { useNavigate, useParams } from "react-router-dom";
import { useSessionReport } from "@/shared/api/queries/useSessionReport";
import { useXpProgress } from "@/shared/api/queries/useXpProgress";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { AttemptsTable } from "@/shared/ui/AttemptsTable";
import { BoltButton } from "@/shared/ui/BoltButton";
import { Page } from "@/shared/ui/Page";
import { StatBentoCard } from "@/shared/ui/StatBentoCard";
import { XpProgressBar } from "@/shared/ui/XpProgressBar";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export default function MissionReportPage() {
  const { levelId, sessionId } = useParams<{ levelId: string; sessionId: string }>();
  const navigate = useNavigate();
  const { data: report, isLoading, isError, refetch } = useSessionReport(sessionId);
  const { data: xp } = useXpProgress();

  const p = report?.progress;

  const retryPath = report?.lesson_id
    ? `/learn/level/${levelId}/lesson/${report.lesson_id}/classwork`
    : `/learn/level/${levelId}/classwork`;

  return (
    <>
      <AmbientScene accents={["yellow", "blue"]} />
      <Page>
        <h1 className="t-h1" style={{ color: "var(--y-bolt)", marginBottom: "var(--s-xl)" }}>
          MISSION REPORT
        </h1>

        {isLoading && <p className="t-body">Loading…</p>}

        {isError && (
          <div style={{ marginBottom: "var(--s-xl)" }}>
            <p className="t-body" style={{ color: "var(--err)" }}>
              Failed to load report.
            </p>
            <BoltButton variant="ghost" size="sm" onClick={() => refetch()}>
              RETRY
            </BoltButton>
          </div>
        )}

        {p && (
          <>
            <div className="stats-row" style={{ marginBottom: "var(--s-xl)" }}>
              <StatBentoCard
                value={`${p.score_correct}/${p.score_total}`}
                label="Score"
                color="var(--y-bolt)"
              />
              <StatBentoCard
                value={`${p.accuracy_pct.toFixed(1)}%`}
                label="Accuracy"
                variant="prominent"
                color="var(--bolt-blue)"
              />
              <StatBentoCard
                value={`+${p.xp_earned} XP`}
                label="XP Earned"
                color="var(--orange-streak)"
              />
              <StatBentoCard value={formatTime(p.time_taken_sec)} label="Time" />
            </div>

            <div style={{ marginBottom: "var(--s-xl)" }}>
              <XpProgressBar
                currentXp={xp?.total_xp ?? 0}
                currentLevelThreshold={xp?.current_level_threshold ?? 0}
                nextLevelThreshold={xp?.next_level_threshold ?? 0}
                label="XP PROGRESS"
              />
            </div>

            <AttemptsTable attempts={report.attempts} questionVerdicts={report.question_verdicts} />
          </>
        )}

        <div style={{ display: "flex", gap: "var(--s-sm)" }}>
          <BoltButton
            variant="ghost"
            size="md"
            style={{ flex: 1 }}
            onClick={() => navigate(retryPath)}
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
    </>
  );
}
