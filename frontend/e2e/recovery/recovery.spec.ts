import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { BulkAttemptItem } from "../../src/shared/api/queries/useSession";
import type { SessionMeta } from "../../src/shared/types";

const apiOrigin = process.env.RECOVERY_API_ORIGIN || "http://127.0.0.1:8011";
const fixturePath = process.env.RECOVERY_FIXTURE_FILE;
if (!fixturePath) throw new Error("Seed the isolated API and set RECOVERY_FIXTURE_FILE first.");
const fixtures: { level_id: string; lesson_id: string; hasher: string; call_signs: string[] } =
  JSON.parse(readFileSync(fixturePath, "utf8"));

function inspect(sessionId: string): { attempt_count: number; result_count: number; xp_count: number; score_correct: number | null; score_total: number | null; xp_earned: number | null } {
  return JSON.parse(execFileSync(process.env.RECOVERY_PYTHON || "python", [
    resolve("e2e/recovery/fixtures.py"), "--inspect-session", sessionId,
  ], { encoding: "utf8", env: process.env }));
}

async function login(page: Page, index: number) {
  await page.goto("/login?role=student");
  await page.getByPlaceholder("e.g. ThunderBolt99").fill(fixtures.call_signs[index]);
  await page.getByLabel("4-digit PIN").fill("2468");
  const response = page.waitForResponse(r => r.url() === `${apiOrigin}/api/v1/auth/callsign-login/` && r.request().method() === "POST");
  await page.getByRole("button", { name: "LET'S GO" }).click();
  const result = await response;
  expect(result.status()).toBe(200);
  const { access }: { access: string } = await result.json();
  expect(typeof access).toBe("string");
  await expect(page).toHaveURL(/\/hub$/);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  return { Authorization: `Bearer ${access}` };
}

test("lost committed practice response reloads and finalizes once", async ({ page }) => {
  const headers = await login(page, 0);
  const start = await page.request.post(`${apiOrigin}/api/v1/practice/start/`, {
    headers, data: { mode: "ZEN", operation: "ADD", digits: 1, rows: 2, question_count: 2, time_limit_sec: 0 },
  });
  expect(start.status()).toBe(201);
  const meta: SessionMeta = await start.json();
  expect(meta.attempt_contract_version).toBe(2);
  const url = `${apiOrigin}/api/v1/sessions/${meta.session_id}/attempts/bulk/`;
  let blocked = true;
  let committed = false;
  let original: { contract_version: number; attempts: BulkAttemptItem[] } | undefined;
  await page.route(url, async route => {
    if (!blocked) { await route.continue(); return; }
    if (!committed) {
      original = route.request().postDataJSON();
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      committed = true;
    }
    await route.abort("failed");
  });
  await page.goto(`/practice/session/${meta.session_id}`);
  await page.getByPlaceholder("Answer").fill(String(meta.questions[0].answer));
  await page.getByRole("button", { name: "SUBMIT", exact: true }).click();
  await expect.poll(() => inspect(meta.session_id).attempt_count).toBe(1);
  await expect(page.getByPlaceholder("Answer")).toBeVisible();
  expect(page.url()).not.toContain("victory");
  expect(inspect(meta.session_id).result_count).toBe(0);

  blocked = false;
  await page.reload();
  await expect(page.getByPlaceholder("Answer")).toBeVisible();
  await page.getByPlaceholder("Answer").fill(String(meta.questions[1].answer));
  await page.getByRole("button", { name: "SUBMIT", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/practice/victory/${meta.session_id}$`));
  expect(inspect(meta.session_id)).toMatchObject({ attempt_count: 2, result_count: 1, xp_count: 1, score_correct: 2, score_total: 2 });

  expect(original).toBeDefined();
  const before = inspect(meta.session_id);
  const replay = await page.request.post(url, { headers, data: original });
  expect(replay.status()).toBe(200);
  expect(inspect(meta.session_id)).toEqual(before);
});

test("classwork cannot advance on an uncertain save and resumes the same session", async ({ page }) => {
  const headers = await login(page, 1);
  const classwork = `/learn/level/${fixtures.level_id}/lesson/${fixtures.lesson_id}/classwork`;
  await page.goto(classwork);
  const started = page.waitForResponse(r => r.url().endsWith("/classwork/start/") && r.request().method() === "POST");
  await page.getByRole("button", { name: "BEGIN SESSION" }).click();
  const meta: SessionMeta = await (await started).json();
  expect(meta.attempt_contract_version).toBe(2);
  expect(meta.questions).toHaveLength(3);
  expect(meta.questions.every(q => q.answer === undefined)).toBe(true);
  let blocked = true;
  const url = `${apiOrigin}/api/v1/sessions/${meta.session_id}/attempts/bulk/`;
  await page.route(url, async route => { if (blocked) await route.abort("failed"); else await route.continue(); });
  await page.getByRole("button", { name: /^(SKIP|Skip question)$/ }).click();
  await expect(page.getByRole("status")).toContainText("Save failed");
  await expect(page.getByRole("button", { name: "NEXT", exact: true })).not.toBeVisible();
  expect(inspect(meta.session_id)).toMatchObject({ attempt_count: 0, result_count: 0, xp_count: 0 });

  blocked = false;
  let restartCount = 0;
  page.on("request", request => { if (request.method() === "POST" && request.url().endsWith("/classwork/start/")) restartCount += 1; });
  await page.reload();
  await expect(page.getByRole("button", { name: "NEXT", exact: true })).toBeVisible();
  expect(restartCount).toBe(0);
  expect(inspect(meta.session_id).attempt_count).toBe(1);
  await page.getByRole("button", { name: "NEXT", exact: true }).click();
  await page.getByRole("button", { name: /^(SKIP|Skip question)$/ }).click();
  await page.getByRole("button", { name: "NEXT", exact: true }).click();
  await page.getByRole("button", { name: /^(SKIP|Skip question)$/ }).click();
  await page.getByRole("button", { name: "FINISH", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/report/${meta.session_id}$`));
  expect(inspect(meta.session_id)).toMatchObject({ attempt_count: 3, result_count: 1, xp_count: 1, score_correct: 0, score_total: 3 });
  const own = await page.request.get(`${apiOrigin}/api/v1/sessions/${meta.session_id}/`, { headers });
  expect(own.status()).toBe(200);
});

test("real JWT requests enforce the configured user throttle", async ({ page }) => {
  expect(fixtures.hasher).toBe("pbkdf2_sha256");
  const headers = await login(page, 2);
  let retryAfter: string | undefined;
  for (let i = 0; i < 65; i += 1) {
    const response = await page.request.get(`${apiOrigin}/api/v1/auth/me/`, { headers });
    if (response.status() === 429) { retryAfter = response.headers()["retry-after"]; break; }
    expect(response.status()).toBe(200);
  }
  expect(Number(retryAfter)).toBeGreaterThan(0);
});

test("expired authentication retains a finish queue for same-learner sign-in", async ({ page }) => {
  const headers = await login(page, 3);
  const start = await page.request.post(`${apiOrigin}/api/v1/practice/start/`, {
    headers, data: { mode: "ZEN", operation: "ADD", digits: 1, rows: 2, question_count: 1, time_limit_sec: 0 },
  });
  expect(start.status()).toBe(201);
  const meta: SessionMeta = await start.json();
  let blocked = true;
  await page.route(`${apiOrigin}/api/v1/sessions/${meta.session_id}/attempts/bulk/`, async route => {
    if (blocked) await route.abort("failed"); else await route.continue();
  });
  const pendingState = () => page.evaluate(sessionId => {
    const key = Object.keys(sessionStorage).find(k => k.startsWith("bolt-recovery:") && k.endsWith(`:${sessionId}`));
    if (!key) return null;
    const saved = JSON.parse(sessionStorage.getItem(key)!);
    return { pending: saved.pending, manifest: saved.manifest };
  }, meta.session_id);
  await page.goto(`/practice/session/${meta.session_id}`);
  await page.getByPlaceholder("Answer").fill(String(meta.questions[0].answer));
  await page.getByRole("button", { name: "SUBMIT", exact: true }).click();
  await expect.poll(async () => (await pendingState())?.manifest?.length).toBe(1);
  const beforeExpiry = await pendingState();
  expect(inspect(meta.session_id)).toMatchObject({ attempt_count: 0, result_count: 0, xp_count: 0 });

  // Reload drops the in-memory access token; removing the cookie causes a real refresh 401.
  await page.context().clearCookies();
  await page.reload();
  await expect(page).toHaveURL(/\/login/);
  expect(await pendingState()).toEqual(beforeExpiry);
  blocked = false;
  await login(page, 3);
  await page.goto(`/practice/session/${meta.session_id}`);
  await expect(page).toHaveURL(new RegExp(`/practice/victory/${meta.session_id}$`));
  expect(inspect(meta.session_id)).toMatchObject({ attempt_count: 1, result_count: 1, xp_count: 1, score_correct: 1, score_total: 1 });
});
