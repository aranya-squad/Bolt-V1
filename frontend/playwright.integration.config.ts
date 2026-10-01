import { defineConfig, devices } from "@playwright/test";

function loopbackOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Recovery integration tests require a plain HTTP loopback origin.");
  }
  return url.origin;
}

const apiOrigin = loopbackOrigin(process.env.RECOVERY_API_ORIGIN || "http://127.0.0.1:8011");
const previewOrigin = loopbackOrigin(process.env.RECOVERY_PREVIEW_ORIGIN || "http://127.0.0.1:4181");
const preview = new URL(previewOrigin);
const chromiumArgs: unknown = JSON.parse(process.env.RECOVERY_CHROMIUM_ARGS || "[]");
if (!Array.isArray(chromiumArgs) || !chromiumArgs.every(arg => typeof arg === "string")) {
  throw new Error("RECOVERY_CHROMIUM_ARGS must be a JSON array of strings.");
}

export default defineConfig({
  testDir: "./e2e/recovery",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  outputDir: "./node_modules/.cache/recovery-results",
  reporter: "list",
  use: {
    baseURL: previewOrigin,
    trace: "retain-on-failure",
    launchOptions: {
      args: chromiumArgs,
      ...(process.env.RECOVERY_CHROMIUM_PATH ? { executablePath: process.env.RECOVERY_CHROMIUM_PATH } : {}),
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run preview -- --host ${preview.hostname} --port ${preview.port || "80"} --strictPort`,
    url: previewOrigin,
    reuseExistingServer: false,
    env: { VITE_API_BASE_URL: apiOrigin },
  },
});
