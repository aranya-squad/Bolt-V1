// Figma frame 1:795 — Victory! (practice session results)
import { useParams } from "react-router-dom";

export default function VictoryPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return (
    <main style={{ minHeight: "100vh", background: "var(--color-bg-base)", padding: "var(--space-xl)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "4rem", color: "var(--color-primary)" }}>
        Victory!
      </h1>
      <p style={{ color: "var(--color-text-secondary)" }}>Session: {sessionId}</p>
      {/* TODO: score, accuracy, XP, play again — implement in Phase 4 */}
    </main>
  );
}
