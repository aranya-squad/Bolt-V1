import { useNavigate, useParams } from "react-router-dom";
import { useSession } from "@/shared/api/queries/useSession";
import { useSessionReport } from "@/shared/api/queries/useSessionReport";
import { useXpProgress } from "@/shared/api/queries/useXpProgress";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { Page } from "@/shared/ui/Page";
import { BoltButton } from "@/shared/ui/BoltButton";
import { StatBentoCard } from "@/shared/ui/StatBentoCard";
import { XpProgressBar } from "@/shared/ui/XpProgressBar";

const PRACTICE_MODES = new Set(["TIME_ATTACK", "ZEN", "CUSTOM", "FLASH_CARDS"]);

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export default function VictoryPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data: session } = useSession(sessionId!);
  const { data: report, isLoading, isError, refetch } = useSessionReport(sessionId);
  const { data: xp } = useXpProgress();

  const p = report?.progress;
  const canReplay = session && PRACTICE_MODES.has(session.kind);

  return (
    <>
      <AmbientScene accents={["yellow", "orange"]} />
      <Page>
        <h1 className="t-h1" style={{ color: "var(--y-bolt)", marginBottom: "var(--s-xl)" }}>
          VICTORY!
        </h1>

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
                label="Speed"
              />
            </div>

            <div style={{ marginBottom: "var(--s-xl)" }}>
              <XpProgressBar
                currentXp={xp?.total_xp ?? 0}
                currentLevelThreshold={xp?.current_level_threshold ?? 0}
                nextLevelThreshold={xp?.next_level_threshold ?? 0}
              />
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: "var(--s-sm)" }}>
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
      </Page>
    </>
  );
}
