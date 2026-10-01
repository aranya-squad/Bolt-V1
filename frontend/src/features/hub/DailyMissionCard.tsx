import { useNavigate } from "react-router-dom";
import { useDailyQuest, useStartDailyQuest } from "@/shared/api/queries/useDailyQuest";
import { BoltButton } from "@/shared/ui/BoltButton";
import type { DailyQuestMission } from "@/shared/types";
import "./dailyMission.css";

export function DailyMissionCard() {
  const today = useDailyQuest();
  const start = useStartDailyQuest();
  const navigate = useNavigate();
  if (!today.enabled) return null;
  const mission = today.data?.mission;
  const previous = today.data?.previous_unfinished;
  const open = async (selected: DailyQuestMission) => {
    try {
      const meta = await start.mutateAsync(selected.id);
      // Recovery preserves explicit switch/discard choices before opening a report.
      navigate(`/practice/session/${meta.session_id}`);
    } catch { /* Mutation error is displayed with a retry action below. */ }
  };
  return <section className="daily-mission" aria-labelledby="daily-mission-title" aria-busy={today.isFetching || start.isPending}>
    <h2 id="daily-mission-title" className="t-h2">Today’s Bolt Mission</h2>
    <p>Practice 5 questions</p>
    {today.isPending && <p role="status">Loading your mission…</p>}
    {today.isError && <div role="alert">
      <p>Your mission could not be loaded. Your saved progress is kept.</p>
      <BoltButton variant="ghost" onClick={() => { void today.refetch(); }}>RETRY MISSION</BoltButton>
    </div>}
    {today.data && <>
      <p className="daily-mission-reset">Resets at local midnight · {today.data.timezone}</p>
      {!mission && <p role="status">No mission available yet. Keep exploring Learn and Practice.</p>}
      {mission && <>
        <p>Level {mission.level_order} · {mission.level_name}<br />{mission.lesson_name}</p>
        <p role="status" aria-live="polite">Saved {mission.progress}/5{mission.state === "completed" ? " · Mission complete!" : ""}</p>
        <progress value={mission.progress} max={5} aria-label="Saved mission progress" />
        {mission.state === "completed" && <p>{mission.xp_earned ?? 0} XP earned</p>}
        <BoltButton disabled={start.isPending} onClick={() => { void open(mission); }}>
          {start.isPending && start.variables === mission.id ? "OPENING…" : mission.state === "completed" ? "VIEW MISSION REPORT" : mission.state === "in_progress" ? "RESUME MISSION" : "START MISSION"}
        </BoltButton>
      </>}
      {previous && <div className="daily-mission-previous">
        <p>Continue your {previous.date} mission · Saved {previous.progress}/5</p>
        <BoltButton variant="ghost" disabled={start.isPending} onClick={() => { void open(previous); }}>CONTINUE PREVIOUS MISSION</BoltButton>
      </div>}
    </>}
    {start.isError && <div role="alert">
      <p>Your mission could not be opened. Retry to resume the same session.</p>
      <BoltButton variant="ghost" disabled={start.isPending} onClick={() => {
        const selected = [mission, previous].find(m => m?.id === start.variables);
        if (selected) void open(selected);
      }}>RETRY OPENING MISSION</BoltButton>
    </div>}
  </section>;
}
