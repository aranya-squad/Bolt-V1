// Figma frame 1:397 — Arena Setup (Custom Challenge config)
import { useParams } from "react-router-dom";

export default function ArenaSetupPage() {
  const { mode } = useParams<{ mode: string }>();
  return (
    <main style={{ minHeight: "100vh", background: "var(--color-bg-base)", padding: "var(--space-xl)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", color: "var(--color-primary)" }}>
        Arena Setup — {mode}
      </h1>
      {/* TODO: operation selector, digits, rows, question count — implement in Phase 4 */}
    </main>
  );
}
