import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { SessionMeta } from "../../src/shared/types";

const apiOrigin = process.env.RECOVERY_API_ORIGIN || "http://127.0.0.1:8011";
const fixturePath = process.env.RECOVERY_FIXTURE_FILE;
if (!fixturePath) throw new Error("Seed the isolated API and set RECOVERY_FIXTURE_FILE first.");
const fixtures: { call_signs: string[] } = JSON.parse(readFileSync(fixturePath, "utf8"));
function inspect(sessionId: string): Record<string, unknown> {
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
  expect((await response).status()).toBe(200);
  await expect(page).toHaveURL(/\/hub$/);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
}
async function start(page: Page): Promise<SessionMeta> {
  const response = page.waitForResponse(r => /\/daily-quests\/[^/]+\/start\/$/.test(r.url()) && r.request().method() === "POST");
  await page.getByRole("button", { name: "START MISSION", exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(201);
  const meta: SessionMeta = await result.json();
  expect(meta.kind).toBe("ZEN"); expect(meta.questions).toHaveLength(5); expect(meta.time_limit_sec).toBe(0);
  expect(meta.daily_quest).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`/practice/session/${meta.session_id}$`));
  return meta;
}
async function noOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth,
    outside: [...document.querySelectorAll("body *")].filter(el => el.getBoundingClientRect().right > window.innerWidth + 1)
      .map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right })).slice(0, 12) }));
  expect(dimensions.scroll, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.width);
}
async function answer(page: Page, value: number) {
  await page.getByPlaceholder("Answer").fill(String(value));
  await page.getByRole("button", { name: "SUBMIT", exact: true }).click();
}

for (const [index, operation] of [[7, "ADD"], [8, "SUB"], [9, "MUL"]] as const) {
  test(`supported maximum ${operation} operands remain intact on narrow missions`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await login(page, index);
    const meta = await start(page);
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const expression = page.locator(".mission-arena pre").first();
      await expect(expression).toBeVisible();
      const text = await expression.innerText();
      for (const operand of meta.questions[0].text.match(/\d+/g) || []) expect(text).toContain(operand);
      expect(await expression.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const card = el.parentElement!.getBoundingClientRect();
        return el.scrollWidth <= el.clientWidth + 1 && rect.left >= card.left && rect.right <= card.right + 1;
      })).toBe(true);
      await noOverflow(page);
    }
    await page.screenshot({ path: `/tmp/bolt-timing/daily-${operation.toLowerCase()}-390.png`, fullPage: true });
    await answer(page, meta.questions[0].answer!);
    await expect(page.getByText("Q 2 / 5", { exact: true })).toBeVisible();
    expect(inspect(meta.session_id).attempt_count).toBe(1);
  });
}

test("mobile five-try mission completes with mistakes and existing XP once", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page, 4);
  await expect(page.getByText("Today’s Bolt Mission", { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: "/tmp/bolt-timing/daily-hub-320.png", fullPage: true });
  const button = page.getByRole("button", { name: "START MISSION", exact: true });
  const box = await button.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44);
  await button.focus(); expect(await button.evaluate(el => el === document.activeElement)).toBe(true);
  const meta = await start(page);
  await noOverflow(page);
  await expect(page.getByRole("button", { name: "SKIP", exact: true })).toHaveCount(0);
  await expect(page.getByPlaceholder("Answer")).toHaveAttribute("inputmode", "numeric");
  await page.screenshot({ path: "/tmp/bolt-timing/daily-arena-320.png", fullPage: true });
  // Simulate the usable visual viewport when a software keyboard occupies space.
  await page.setViewportSize({ width: 320, height: 420 });
  await page.getByPlaceholder("Answer").focus();
  await page.getByRole("button", { name: "SUBMIT", exact: true }).scrollIntoViewIfNeeded();
  const submitBox = await page.getByRole("button", { name: "SUBMIT", exact: true }).boundingBox();
  expect(submitBox!.height).toBeGreaterThanOrEqual(44);
  expect(submitBox!.y + submitBox!.height).toBeLessThanOrEqual(420);
  await noOverflow(page);
  await page.setViewportSize({ width: 320, height: 720 });
  for (let i = 0; i < 5; i++) {
    // All wrong is still effort. Verify finalization, rather than client feedback, owns completion.
    await expect(page.getByText(`Q ${i + 1} / 5`, { exact: true })).toBeVisible();
    if (i === 0) {
      await page.getByPlaceholder("Answer").fill(String(meta.questions[i].answer! + 1));
      await page.getByPlaceholder("Answer").press("Enter");
    } else await answer(page, meta.questions[i].answer! + 1);
  }
  await expect(page).toHaveURL(new RegExp(`/practice/victory/${meta.session_id}$`));
  await expect(page.getByRole("heading", { name: /mission complete/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "PLAY AGAIN", exact: true })).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({ path: "/tmp/bolt-timing/daily-complete-320.png", fullPage: true });
  const answersRegion = page.getByRole("region", { name: "Mission answer details" });
  await answersRegion.focus();
  await answersRegion.press("ArrowRight");
  await expect.poll(() => answersRegion.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  expect(inspect(meta.session_id)).toMatchObject({ attempt_count: 5, result_count: 1, xp_count: 1, xp_earned: 0,
    quest_count: 1, quest_completed: true, lesson_completion_count: 0, level_completion_count: 0 });
  await page.reload();
  await expect(page.getByRole("heading", { name: /mission complete/i })).toBeVisible();
  await page.getByRole("button", { name: "RETURN TO HUB", exact: true }).click();
  await expect(page.getByText(/5\s*\/\s*5.*saved|5\s*\/\s*5.*complete/i)).toBeVisible();
  expect(inspect(meta.session_id)).toMatchObject({ result_count: 1, xp_count: 1 });
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
});

test("delayed wrong receipt and lost committed response reload preserve mission identity", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 5); const meta = await start(page);
  const url = `${apiOrigin}/api/v1/sessions/${meta.session_id}/attempts/bulk/`;
  let lost = true;
  let committed = false;
  await page.route(url, async route => {
    if (!lost) { await route.continue(); return; }
    const response = await route.fetch(); expect(response.status()).toBe(200);
    committed = true;
    await route.abort("failed");
  });
  await answer(page, meta.questions[0].answer! + 1);
  // Let the async interception finish before synchronous DB inspection; repeated
  // child-process inspection otherwise starves the route handler's event loop.
  await expect.poll(() => committed).toBe(true);
  expect(inspect(meta.session_id).attempt_count).toBe(1);
  expect(inspect(meta.session_id).result_count).toBe(0);
  expect(page.url()).not.toContain("victory");
  lost = false; await page.reload();
  await expect(page.getByText("Q 2 / 5", { exact: true })).toBeVisible();
  let delayed = false;
  await page.unroute(url);
  await page.route(url, async route => {
    const response = await route.fetch(); expect(response.status()).toBe(200);
    // A held real response arrives after the normal 600ms verdict feedback expires.
    if (!delayed) { delayed = true; await new Promise(resolve => setTimeout(resolve, 900)); }
    await route.fulfill({ response });
  });
  await answer(page, meta.questions[1].answer! + 1);
  await expect(page.getByText("Q 3 / 5", { exact: true })).toBeVisible();
  await page.goto("/hub");
  await page.getByRole("button", { name: "RESUME MISSION", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/practice/session/${meta.session_id}$`));
  await expect(page.getByText("Q 3 / 5", { exact: true })).toBeVisible();
  for (let i = 2; i < 5; i++) { await expect(page.getByText(`Q ${i + 1} / 5`, { exact: true })).toBeVisible(); await answer(page, meta.questions[i].answer!); }
  await expect(page).toHaveURL(new RegExp(`/practice/victory/${meta.session_id}$`));
  expect(inspect(meta.session_id)).toMatchObject({ attempt_count: 5, result_count: 1, xp_count: 1, quest_completed: true });
});

test("lost mission start and finalize acknowledgments recover without extra rewards", async ({ page }) => {
  await login(page, 6);
  const startPattern = /\/daily-quests\/[^/]+\/start\/$/;
  let loseStart = true;
  let meta: SessionMeta | undefined;
  await page.route(startPattern, async route => {
    const response = await route.fetch();
    if (loseStart) { meta = await response.json(); loseStart = false; await route.abort("failed"); }
    else await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "START MISSION", exact: true }).click();
  await expect.poll(() => !!meta).toBe(true);
  expect(inspect(meta!.session_id)).toMatchObject({ quest_count: 1, result_count: 0, xp_count: 0 });
  await page.reload();
  await page.getByRole("button", { name: "RESUME MISSION", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/practice/session/${meta!.session_id}$`));
  let loseFinalize = true;
  let finalizeCommitted = false;
  const submitUrl = `${apiOrigin}/api/v1/sessions/${meta!.session_id}/submit/`;
  await page.route(submitUrl, async route => {
    const response = await route.fetch(); expect(response.status()).toBe(200);
    finalizeCommitted = true;
    if (loseFinalize) await route.abort("failed"); else await route.fulfill({ response });
  });
  for (let i = 0; i < 5; i++) { await expect(page.getByText(`Q ${i + 1} / 5`, { exact: true })).toBeVisible(); await answer(page, meta!.questions[i].answer!); }
  await expect.poll(() => finalizeCommitted).toBe(true);
  expect(inspect(meta!.session_id).quest_completed).toBe(true);
  expect(page.url()).not.toContain("victory");
  expect(inspect(meta!.session_id)).toMatchObject({ result_count: 1, xp_count: 1 });
  loseFinalize = false; await page.reload();
  await expect(page).toHaveURL(new RegExp(`/practice/victory/${meta!.session_id}$`));
  expect(inspect(meta!.session_id)).toMatchObject({ result_count: 1, xp_count: 1 });
});
