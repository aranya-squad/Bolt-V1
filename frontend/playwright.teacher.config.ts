import { defineConfig, devices } from "@playwright/test";

function loopbackOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Teacher integration requires a plain HTTP loopback origin.");
  }
  return url.origin;
}

const apiOrigin = loopbackOrigin(process.env.TEACHER_API_ORIGIN || "http://127.0.0.1:8012");
const previewOrigin = loopbackOrigin(process.env.TEACHER_PREVIEW_ORIGIN || "http://127.0.0.1:4182");
const preview = new URL(previewOrigin);

export default defineConfig({
  testDir: "./e2e/teacher",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 60_000,
  outputDir: "./node_modules/.cache/teacher-results",
  reporter: "list",
  use: {
    baseURL: previewOrigin,
    trace: "retain-on-failure",
    launchOptions: process.env.TEACHER_CHROMIUM_PATH
      ? { executablePath: process.env.TEACHER_CHROMIUM_PATH } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run preview -- --host ${preview.hostname} --port ${preview.port || "80"} --strictPort`,
    url: previewOrigin,
    reuseExistingServer: false,
    env: { VITE_API_BASE_URL: apiOrigin },
  },
});
