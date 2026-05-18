// Figma frame 1:678 — Mission Report (Classwork results)
import { useParams } from "react-router-dom";

export default function MissionReportPage() {
  const { levelId, sessionId } = useParams<{ levelId: string; sessionId: string }>();
  return (
    <main style={{ minHeight: "100vh", background: "var(--color-bg-base)", padding: "var(--space-xl)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", color: "var(--color-primary)" }}>
        Mission Report
      </h1>
      <p style={{ color: "var(--color-text-secondary)" }}>Session: {sessionId} / Level: {levelId}</p>
      {/* TODO: score breakdown, per-question table, XP display — implement in Phase 3 */}
    </main>
  );
}
