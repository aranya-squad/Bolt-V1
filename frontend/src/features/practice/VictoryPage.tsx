import "@/features/hub/dailyMission.css";
import { useNavigate, useParams } from "react-router-dom";
import { useSession } from "@/shared/api/queries/useSession";
import { useSessionReport } from "@/shared/api/queries/useSessionReport";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { Page } from "@/shared/ui/Page";
import { BoltButton } from "@/shared/ui/BoltButton";
import { StatBentoCard } from "@/shared/ui/StatBentoCard";
import { Icon } from "@/shared/ui/Icon";
import { AttemptsTable } from "@/shared/ui/AttemptsTable";

const PRACTICE_MODES = new Set(["TIME_ATTACK", "ZEN", "CUSTOM", "FLASH_CARDS"]);

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export default function VictoryPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading: sessionLoading, isError: sessionError, refetch: refetchSession } = useSession(sessionId!);
  const { data: report, isLoading, isError, refetch } = useSessionReport(sessionId);

  const p = report?.progress;
  const mission = session?.daily_quest;
  const missionCompleted = !!(p && mission?.state === "completed" && mission.completed_at && mission.session_id === p.session_id && session?.state === "submitted");
  const canReplay = session && !mission && PRACTICE_MODES.has(session.kind);

  return (
    <div className={mission ? "mission-report-screen" : undefined}>
      <AmbientScene accents={["yellow", "orange"]} />
      <Page padded={!mission}>
        <div className={mission ? "mission-report-content" : undefined}>
        <h1 className="t-h1" style={{ color: "var(--y-bolt)", marginBottom: "var(--s-xl)" }}>
          {missionCompleted ? "MISSION COMPLETE!" : mission || sessionLoading || !session ? "SESSION REPORT" : "VICTORY!"}
        </h1>

        {missionCompleted && <div className="mission-celebration" role="status" aria-live="polite">
          <div className="mission-success-ring" aria-hidden="true"><Icon name="check" size={48} color="var(--y-bolt)" /></div>
          <p>You practiced all 5 questions. Great effort!</p>
          <p>{mission!.date} · Level {mission!.level_order} · {mission!.level_name}</p>
          <p>{p!.xp_earned} XP earned</p>
        </div>}
        {mission && p && !missionCompleted && <div role="status">
          <p>Confirming your mission completion…</p>
          <BoltButton variant="ghost" onClick={() => { void refetchSession(); }}>REFRESH MISSION STATUS</BoltButton>
        </div>}
        {sessionError && <div role="alert"><p>Mission status could not be confirmed.</p><BoltButton variant="ghost" onClick={() => { void refetchSession(); }}>RETRY SESSION STATUS</BoltButton></div>}
        {isLoading && (
          <p className="t-body">Loading…</p>
        )}

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
            <div
              className={mission ? "mission-report-stats" : undefined}
              style={{
                display: "flex",
                gap: "var(--s-md)",
                marginBottom: "var(--s-xl)",
              }}
            >
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
                value={formatTime(p.time_taken_sec)}
                label={mission ? "Practice time" : "Speed"}
              />
            </div>

            {/* Report card — zero attempts renders nothing (AttemptsTable returns null) */}
            <div
              className={mission ? "mission-report-attempts" : undefined}
              tabIndex={mission ? 0 : undefined}
              role={mission ? "region" : undefined}
              aria-label={mission ? "Mission answer details" : undefined}
              style={{ maxHeight: "60vh", overflowY: "auto", marginBottom: "var(--s-xl)" }}
            >
              <AttemptsTable
                attempts={report!.attempts}
                questionVerdicts={report!.question_verdicts}
              />
            </div>
          </>
        )}

        <div className={mission ? "mission-report-actions" : undefined} style={{ display: "flex", gap: "var(--s-sm)" }}>
          {canReplay && (
            <BoltButton
              variant="ghost"
              size="md"
              style={{ flex: 1 }}
              onClick={() => navigate(`/practice/setup/${session!.kind}`)}
            >
              PLAY AGAIN
            </BoltButton>
          )}
          <BoltButton
            variant="primary"
            size="md"
            style={{ flex: canReplay ? 2 : 1 }}
            onClick={() => navigate("/hub")}
          >
            RETURN TO HUB
          </BoltButton>
        </div>
      </div>
      </Page>
    </div>
  );
}
