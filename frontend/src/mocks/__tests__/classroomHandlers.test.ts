import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { handlers } from "../handlers";
import { MOCK_LEVELS, MOCK_LESSONS } from "../data";
import type { Batch, Level } from "@/shared/types";
import type { TeacherLevelDashboard } from "@/shared/api/queries/useTeacherLevelDashboard";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
async function request(path: string, method = "GET", data?: unknown) {
  return fetch(new URL(`/api/v1${path}`, window.location.origin), {
    method, headers: { "Content-Type": "application/json" }, ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}
async function create(): Promise<Batch> {
  const response = await request("/classes/", "POST", { name: "Synthetic new batch" });
  expect(response.status).toBe(201); return response.json();
}
async function persisted(id: string): Promise<Batch> {
  const response = await request("/classes/");
  return (await response.json() as Batch[]).find(batch => batch.id === id)!;
}
async function matrix(levelId: string): Promise<TeacherLevelDashboard> {
  const response = await request(`/classes/levels/${levelId}/dashboard/`);
  expect(response.status).toBe(200); return response.json();
}

describe("synthetic classroom MSW contracts (not DB, ownership or real API evidence)", () => {
  it("uses canonical Level UUID identities coherently in student catalogue/detail/lesson and teacher routes", async () => {
    const catalogue = await (await request("/levels/")).json() as { results: Level[] };
    expect(catalogue.results).toHaveLength(10);
    for (const level of catalogue.results) {
      expect(level.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      const detail = await (await request(`/levels/${level.id}/`)).json();
      expect(detail).toEqual(level);
      const lessons = await (await request(`/levels/${level.id}/lessons/`)).json();
      expect(lessons).toEqual(MOCK_LESSONS[level.id]);
      expect((await matrix(level.id)).lessons.map(lesson => lesson.id)).toEqual(lessons.map((lesson: { id: string }) => lesson.id));
    }
    expect(catalogue.results.find(level => level.order === 4)).toMatchObject({ is_locked: false, is_completed: false });
  });

  it("keeps name-only creation unassigned and rejects supplied assignment input before creating", async () => {
    const created = await create(); expect(created.assigned_level_ids).toEqual([]);
    expect((await persisted(created.id)).assigned_level_ids).toEqual([]);
    expect((await matrix(MOCK_LEVELS[0].id)).classes.some(batch => batch.id === created.id)).toBe(false);
    const before = await (await request("/classes/")).json() as Batch[];
    const invalid = await request("/classes/", "POST", { name: "Must not create", assigned_level_ids: [MOCK_LEVELS[0].id] });
    expect(invalid.status).toBe(400); expect(await invalid.json()).toHaveProperty("assigned_level_ids");
    expect((await (await request("/classes/")).json() as Batch[]).length).toBe(before.length);
  });

  it("replaces canonically, preserves omitted IDs, clears [] and updates report inclusion", async () => {
    const created = await create(); const first = MOCK_LEVELS[0].id; const third = MOCK_LEVELS[2].id;
    const saved = await request(`/classes/${created.id}/`, "PATCH", { assigned_level_ids: [third, first] });
    expect(saved.status).toBe(200); expect((await saved.json()).assigned_level_ids).toEqual([first, third]);
    expect((await matrix(third)).classes.some(batch => batch.id === created.id)).toBe(true);
    await request(`/classes/${created.id}/`, "PATCH", { name: "Name-only preserved" });
    expect((await persisted(created.id)).assigned_level_ids).toEqual([first, third]);
    const clear = await request(`/classes/${created.id}/`, "PATCH", { assigned_level_ids: [] });
    expect((await clear.json()).assigned_level_ids).toEqual([]);
    expect((await matrix(third)).classes.some(batch => batch.id === created.id)).toBe(false);
  });

  it.each([
    null, "not-an-array", [5], [null], ["malformed"], [MOCK_LEVELS[0].id, MOCK_LEVELS[0].id.replaceAll("-", "")],
    [MOCK_LEVELS[0].id, "ffffffff-ffff-4fff-8fff-ffffffffffff"],
  ])("invalid assignment %j rejects accompanying scalar changes", async assigned => {
    const created = await create();
    const response = await request(`/classes/${created.id}/`, "PATCH", { name: "Must remain unchanged", assigned_level_ids: assigned });
    expect(response.status).toBe(400); expect(await response.json()).toHaveProperty("assigned_level_ids");
    expect(await persisted(created.id)).toMatchObject({ name: created.name, assigned_level_ids: [] });
  });

  it("join response includes assignments and rotate remains code-only", async () => {
    const created = await create();
    await request(`/classes/${created.id}/`, "PATCH", { assigned_level_ids: [MOCK_LEVELS[0].id] });
    const joined = await request("/classes/join/", "POST", { join_code: created.join_code });
    expect(joined.status).toBe(201); expect((await joined.json()).assigned_level_ids).toEqual([MOCK_LEVELS[0].id]);
    expect((await persisted(created.id)).student_count).toBe(1);
    expect((await (await request(`/classes/${created.id}/roster/`)).json())).toHaveLength(1);
    expect((await request("/classes/join/", "POST", { join_code: created.join_code })).status).toBe(400);
    const rotated = await request(`/classes/${created.id}/rotate-code/`, "POST");
    expect(Object.keys(await rotated.json())).toEqual(["join_code"]);
  });
});
