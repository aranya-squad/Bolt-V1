// Figma frame 1:619 — Classwork Practice session
import { useParams } from "react-router-dom";

export default function ClassworkPage() {
  const { levelId } = useParams<{ levelId: string }>();
  return (
    <main style={{ minHeight: "100vh", background: "var(--color-bg-base)", padding: "var(--space-xl)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", color: "var(--color-primary)" }}>
        Classwork — Level {levelId}
      </h1>
      {/* TODO: active session UI, question display, answer input — implement in Phase 3 */}
    </main>
  );
}
