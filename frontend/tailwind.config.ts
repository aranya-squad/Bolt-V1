import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Canonical Bolt Abacus tokens ──────────────────────────────────
        // Surfaces
        "bg-noir":     "var(--bg-noir)",
        "bg-void":     "var(--bg-void)",
        "bg-shadow":   "var(--bg-shadow)",
        "bg-coal":     "var(--bg-coal)",
        "bg-graphite": "var(--bg-graphite)",
        "bg-ash":      "var(--bg-ash)",
        // Yellow family
        "y-bolt":       "var(--y-bolt)",
        "y-bolt-deep":  "var(--y-bolt-deep)",
        "y-bolt-soft":  "var(--y-bolt-soft)",
        "y-bolt-light": "var(--y-bolt-light)",
        "y-bolt-ink":   "var(--y-bolt-ink)",
        // Purple family
        "p-cyber":      "var(--p-cyber)",
        "p-cyber-deep": "var(--p-cyber-deep)",
        "p-cyber-soft": "var(--p-cyber-soft)",
        // Blue
        "bolt-blue":    "var(--bolt-blue)",
        "b-signal":     "var(--b-signal)",
        // Orange
        "orange-streak":      "var(--orange-streak)",
        "orange-streak-soft": "var(--orange-streak-soft)",
        "orange-streak-deep": "var(--orange-streak-deep)",
        // Foreground
        "fg-bone":  "var(--fg-bone)",
        "fg-sand":  "var(--fg-sand)",
        "fg-pure":  "var(--fg-pure)",
        // Semantic
        "ok":  "var(--ok)",
        "err": "var(--err)",

        // ── Legacy aliases (remove after all pages migrated) ──────────────
        "bg-base":       "var(--color-bg-base)",
        "bg-deep":       "var(--color-bg-deep)",
        surface:         "var(--color-surface)",
        primary:         "var(--color-primary)",
        "accent-blue":   "var(--color-accent-blue)",
        "accent-purple": "var(--color-accent-purple)",
        "accent-orange": "var(--color-accent-orange)",
        success:         "var(--color-success)",
        error:           "var(--color-error)",
        "text-primary":  "var(--color-text-primary)",
        "text-secondary":"var(--color-text-secondary)",
        border:          "var(--color-border)",
        glass:           "var(--color-glass)",
      },
      fontFamily: {
        // ── Canonical ──────────────────────────────────────────────────────
        display: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        body:    ["'Lexend'", "'Inter'", "system-ui", "sans-serif"],
        label:   ["'Space Grotesk'", "'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        mono:    ["'JetBrains Mono'", "'Liberation Mono'", "ui-monospace", "monospace"],
      },
      spacing: {
        // ── Canonical ──────────────────────────────────────────────────────
        "s-xs":  "var(--s-xs)",
        "s-sm":  "var(--s-sm)",
        "s-md":  "var(--s-md)",
        "s-lg":  "var(--s-lg)",
        "s-xl":  "var(--s-xl)",
        "s-2xl": "var(--s-2xl)",
        // ── Legacy aliases ─────────────────────────────────────────────────
        xs:   "var(--space-xs)",
        sm:   "var(--space-sm)",
        md:   "var(--space-md)",
        lg:   "var(--space-lg)",
        xl:   "var(--space-xl)",
        "2xl":"var(--space-2xl)",
      },
      borderRadius: {
        // ── Canonical ──────────────────────────────────────────────────────
        "r-sm":      "var(--r-sm)",
        "r-default": "var(--r-default)",
        "r-md":      "var(--r-md)",
        "r-lg":      "var(--r-lg)",
        "r-xl":      "var(--r-xl)",
        "r-pill":    "var(--r-pill)",
        // ── Legacy aliases ─────────────────────────────────────────────────
        sm:   "var(--radius-sm)",
        md:   "var(--radius-md)",
        lg:   "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },
    },
  },
  plugins: [],
};

export default config;
