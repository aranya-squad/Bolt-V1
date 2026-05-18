// Figma frame 1:272 — Path of Conquest
import { useParams } from "react-router-dom";

export default function PathOfConquestPage() {
  const { levelId } = useParams<{ levelId: string }>();
  return (
    <main style={{ minHeight: "100vh", background: "var(--color-bg-base)", padding: "var(--space-xl)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", color: "var(--color-primary)" }}>
        Path of Conquest — Level {levelId}
      </h1>
      {/* TODO: vertical lesson path, Download Materials link — implement in Phase 3 */}
    </main>
  );
}
