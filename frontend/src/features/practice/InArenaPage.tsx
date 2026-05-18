// Figma frame 1:553 — In the Arena (active practice session)
import { useParams } from "react-router-dom";

export default function InArenaPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return (
    <main style={{ minHeight: "100vh", background: "var(--color-bg-base)", padding: "var(--space-xl)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", color: "var(--color-primary)" }}>
        In the Arena
      </h1>
      <p style={{ color: "var(--color-text-secondary)" }}>Session: {sessionId}</p>
      {/* TODO: question display, answer input, timer HUD — implement in Phase 4 */}
    </main>
  );
}
