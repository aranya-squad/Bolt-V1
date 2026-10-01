import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { SessionMeta } from "../../src/shared/types";

const apiOrigin = process.env.TEACHER_API_ORIGIN || "http://127.0.0.1:8012";
const fixturePath = process.env.TEACHER_FIXTURE_FILE;
if (!fixturePath || process.env.TEACHER_E2E !== "1") {
  throw new Error("Seed the isolated teacher API and set TEACHER_E2E=1 / TEACHER_FIXTURE_FILE first.");
}
interface TeacherFixture {
  hasher: string;
  teachers: { id: string; email: string; password: string; display_name: string }[];
  students: { active: { id: string; call_sign: string; pin: string }; inactive: { id: string; call_sign: string; pin: string } };
  classes: { owned: { id: string; name: string; join_code: string }; foreign: { id: string; name: string } };
  levels: { id: string; order: number; name: string; lesson_id: string; lesson_name: string }[];
}
const fixtures: TeacherFixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const owned = fixtures.classes.owned;
const firstLevel = fixtures.levels.find(level => level.order === 1)!;

function inspect(args: string[] = ["--inspect"]): Record<string, unknown> {
  return JSON.parse(execFileSync(process.env.TEACHER_PYTHON || "python", [
    "-m", "apps.classroom.tests.seed_teacher_e2e", ...args,
  ], { cwd: resolve("../backend"), encoding: "utf8", env: process.env }));
}

async function loginTeacher(page: Page, index: number, navigate = true) {
  const user = fixtures.teachers[index];
  if (navigate) await page.goto("/login?role=teacher");
  else await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await page.getByPlaceholder("Email", { exact: true }).fill(user.email);
  await page.getByPlaceholder("Password", { exact: true }).fill(user.password);
  const response = page.waitForResponse(r => r.url() === `${apiOrigin}/api/v1/auth/login/` && r.request().method() === "POST");
  await page.getByRole("button", { name: "SIGN IN", exact: true }).click();
  const login = await response;
  expect(login.status()).toBe(200);
  const { access }: { access: string } = await login.json();
  await expect(page).toHaveURL(/\/teacher$/);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  return { Authorization: `Bearer ${access}` };
}

async function loginStudent(page: Page) {
  await page.goto("/login?role=student");
  await page.getByPlaceholder("e.g. ThunderBolt99").fill(fixtures.students.active.call_sign);
  await page.getByLabel("4-digit PIN").fill(fixtures.students.active.pin);
  await page.getByRole("button", { name: "LET'S GO", exact: true }).click();
  await expect(page).toHaveURL(/\/hub$/);
}

async function refresh(page: Page, endpoint: string) {
  const response = page.waitForResponse(r => r.url() === `${apiOrigin}/api/v1${endpoint}` && r.request().method() === "GET");
  await page.getByRole("button", { name: "REFRESH", exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole("button", { name: "REFRESH", exact: true })).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
}

test("F1 real student finalization becomes visible through teacher Refresh; inactive history stays excluded", async ({ page, browser }) => {
  expect(fixtures.hasher).toBe("pbkdf2_sha256");
  const headers = await loginTeacher(page, 0);
  await expect(page.getByText("1 student", { exact: true })).toBeVisible();
  await page.goto(`/teacher/batch/${owned.id}`);
  const activeRow = page.getByRole("row").filter({ hasText: fixtures.students.active.call_sign });
  await expect(activeRow).toBeVisible();
  await expect(activeRow.getByRole("cell").last()).toHaveText("—");
  await expect(page.getByText(fixtures.students.inactive.call_sign, { exact: true })).toHaveCount(0);
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.goto(`/teacher/level/${firstLevel.id}`);
  const lessonRow = page.getByRole("row").filter({ hasText: firstLevel.lesson_name });
  await expect(lessonRow.getByRole("cell").nth(1)).toHaveText("0/1");
  await expect(lessonRow.getByRole("cell").nth(2)).toHaveText("0/1");

  const studentContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    const student = await studentContext.newPage();
    await loginStudent(student);
    await student.goto(`/learn/level/${firstLevel.id}/lesson/${firstLevel.lesson_id}/classwork`);
    const started = student.waitForResponse(r => r.url().endsWith("/classwork/start/") && r.request().method() === "POST");
    await student.getByRole("button", { name: "BEGIN SESSION", exact: true }).click();
    const start = await started;
    expect(start.status()).toBe(201);
    const session: SessionMeta = await start.json();
    expect(session.questions).toHaveLength(3);
    expect(session.questions.every(question => question.answer === undefined)).toBe(true);
    // Only the synthetic fixture inspector reads the server-owned answers; the runtime API hides them.
    const answers = inspect(["--inspect-session", session.session_id]).answers as number[];
    expect(answers).toHaveLength(session.questions.length);
    for (const [index, answer] of answers.entries()) {
      await student.getByPlaceholder("Answer").fill(String(answer));
      await student.getByRole("button", { name: "SUBMIT", exact: true }).click();
      await student.getByRole("button", { name: index === answers.length - 1 ? "FINISH" : "NEXT", exact: true }).click();
    }
    await expect(student).toHaveURL(new RegExp(`/report/${session.session_id}$`));
    expect(inspect(["--inspect-session", session.session_id])).toMatchObject({
      attempt_count: 3, result_count: 1, score_correct: 3, score_total: 3,
    });
    // Teacher matrix remains the previously fetched state until its explicit primary refresh.
    await expect(lessonRow.getByRole("cell").nth(1)).toHaveText("0/1");
    await refresh(page, `/classes/levels/${firstLevel.id}/dashboard/`);
    await expect(lessonRow.getByRole("cell").nth(1)).toHaveText("1/1");
    await page.goto(`/teacher/batch/${owned.id}`);
    await refresh(page, `/classes/${owned.id}/roster/`);
    await expect(page.getByRole("row").filter({ hasText: fixtures.students.active.call_sign }).getByRole("cell").last()).toHaveText("100%");
    const matrix = await page.request.get(`${apiOrigin}/api/v1/classes/levels/${firstLevel.id}/dashboard/`, { headers });
    expect(matrix.status()).toBe(200);
    expect((await matrix.json()).classes[0].total_students).toBe(1);
  } finally {
    await studentContext.close();
  }
});

test("F1 same-browser teacher account switch exposes only B and real API denies foreign roster/PATCH", async ({ page }) => {
  await loginTeacher(page, 0);
  await expect(page.getByText(owned.name, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "LOG OUT", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  // Keep the SPA/QueryClient alive across router logout and B's sign-in.
  const headers = await loginTeacher(page, 1, false);
  await expect(page.getByText(fixtures.classes.foreign.name, { exact: true })).toBeVisible();
  await expect(page.getByText(owned.name, { exact: true })).toHaveCount(0);
  const roster = await page.request.get(`${apiOrigin}/api/v1/classes/${owned.id}/roster/`, { headers });
  expect(roster.status()).toBe(404);
  const patch = await page.request.patch(`${apiOrigin}/api/v1/classes/${owned.id}/`, { headers, data: { name: "Denied foreign edit" } });
  expect(patch.status()).toBe(404);
  await page.goto(`/teacher/batch/${owned.id}`);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText(fixtures.students.active.call_sign, { exact: true })).toHaveCount(0);
});

test("F2 owner assignment Save/reload controls report membership and preserves learning history", async ({ page }) => {
  test.skip(process.env.TEACHER_ASSIGNMENT_E2E !== "1", "Enable after integrated F2 API/editor checkpoint.");
  const headers = await loginTeacher(page, 0);
  const thirdLevel = fixtures.levels.find(level => level.order === 3)!;
  const before = inspect();
  await page.goto(`/teacher/batch/${owned.id}`);
  const editor = page.getByRole("group", { name: "Assigned levels" });
  const first = editor.getByRole("checkbox", { name: `Level ${firstLevel.order}: ${firstLevel.name}` });
  const third = editor.getByRole("checkbox", { name: `Level ${thirdLevel.order}: ${thirdLevel.name}` });
  await expect(first).toBeChecked();
  await expect(third).not.toBeChecked();
  await third.check();
  const saved = page.waitForResponse(r => r.url() === `${apiOrigin}/api/v1/classes/${owned.id}/` && r.request().method() === "PATCH");
  await editor.getByRole("button", { name: "SAVE", exact: true }).click();
  const response = await saved;
  expect(response.status()).toBe(200);
  expect((await response.json()).assigned_level_ids).toEqual([firstLevel.id, thirdLevel.id]);
  await expect(editor.getByRole("status")).toContainText("Assigned levels saved.");
  await page.reload();
  await expect(first).toBeChecked();
  await expect(third).toBeChecked();
  await expect(editor.getByRole("button", { name: "SAVE", exact: true })).toBeDisabled();
  await page.goto(`/teacher/level/${thirdLevel.id}`);
  await expect(page.getByRole("heading", { name: owned.name, exact: true })).toBeVisible();
  await page.goto(`/teacher/batch/${owned.id}`);
  await third.uncheck();
  await editor.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect(editor.getByRole("status")).toContainText("Assigned levels saved.");
  await page.goto(`/teacher/level/${thirdLevel.id}`);
  await expect(page.getByText("No classes have this level assigned.", { exact: true })).toBeVisible();
  const after = inspect();
  for (const field of ["progress_records", "lesson_completions", "level_completions", "question_attempts"]) {
    expect(Number.isInteger(before[field])).toBe(true);
    expect(after[field]).toBe(before[field]);
  }
  expect(Array.isArray(before.enrollments)).toBe(true);
  expect(after.enrollments).toEqual(before.enrollments);
  expect(after.assigned_level_ids).toEqual([firstLevel.id]);
  const studentData = await page.request.get(`${apiOrigin}/api/v1/classes/${owned.id}/roster/`, { headers });
  expect(studentData.status()).toBe(200);
  expect((await studentData.json()).map((student: { id: string }) => student.id)).toEqual([fixtures.students.active.id]);
});
