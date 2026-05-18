// Figma frame 1:2 — Bolt Abacus Hub
import { useTranslation } from "react-i18next";
import { useMe } from "@/shared/api/queries/useMe";

export default function HubPage() {
  const { t } = useTranslation("hub");
  const { data: user } = useMe();

  return (
    <main style={{ minHeight: "100vh", background: "var(--color-bg-base)", padding: "var(--space-xl)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "3rem", color: "var(--color-primary)" }}>
        {t("title", "Bolt Abacus Hub")}
      </h1>
      <p style={{ color: "var(--color-text-secondary)" }}>
        {t("welcome", "Welcome")}, {user?.profile.display_name ?? "…"}
      </p>
      {/* TODO: portal cards (Learn / Practice), HUD stats — implement in Phase 2 */}
    </main>
  );
}
