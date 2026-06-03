/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
  ],
  ignorePatterns: ["dist", "node_modules"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react-refresh"],
  settings: { react: { version: "detect" } },
  rules: {
    // Enforced: deprecated component imports are errors
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["*/TopNav", "**/TopNav"],
            message: "Deprecated — use ShellLayout (Sidebar + BottomNav). Delete post-Wave-5 QA.",
          },
          {
            group: ["*/BackLink", "**/BackLink"],
            message: "Deprecated — use BreadcrumbChip.",
          },
          {
            group: ["*/SegmentedToggle", "**/SegmentedToggle"],
            message: "Deprecated — use ConfigSlider + AdvancedToggleRow.",
          },
        ],
      },
    ],

    // Pre-existing violations — downgraded to warn so they surface without blocking CI
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "no-redeclare": "off",
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
  },
};
