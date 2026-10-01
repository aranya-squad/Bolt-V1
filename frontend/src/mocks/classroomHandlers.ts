import { http, HttpResponse } from "msw";
import type { Batch, RosterStudent } from "@/shared/types";
import { MOCK_LEVELS, MOCK_LESSONS } from "./data";

// Synthetic development fixtures only. Real ownership/primary/SQL evidence comes
// from classroom database tests and the built-SPA teacher API integration suite.
const BASE = "/api/v1";
const firstId = "10000000-0000-4000-8000-000000000001";
const batches: Batch[] = [{
  id: firstId, name: "Morning explorers", join_code: "BOLT01", live_session_link: "",
  is_active: true, created_at: "2026-10-01T00:00:00Z", student_count: 2,
}];
const assignedLevels = new Map<string, Set<string>>([[firstId, new Set([MOCK_LEVELS[0].id])]]);
const roster = new Map<string, RosterStudent[]>([[firstId, [
  { id: "20000000-0000-4000-8000-000000000001", call_sign: "Comet", current_level: 1, accuracy_pct: null, enrolled_at: "2026-10-01T00:00:00Z" },
  { id: "20000000-0000-4000-8000-000000000002", call_sign: "Nova", current_level: 2, accuracy_pct: 87.5, enrolled_at: "2026-10-01T00:00:00Z" },
]]]);
let nextBatch = 2;
const notFound = () => HttpResponse.json({ detail: "Not found." }, { status: 404 });

export const classroomHandlers = [
  http.get(`${BASE}/classes/`, () => HttpResponse.json(batches)),
  http.post(`${BASE}/classes/`, async ({ request }) => {
    const body = await request.json() as { name?: string };
    if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 128) {
      return HttpResponse.json({ name: ["Enter a batch name of at most 128 characters."] }, { status: 400 });
    }
    const number = nextBatch++;
    const batch: Batch = {
      id: `10000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
      name: body.name.trim(), join_code: `BOLT${String(number).padStart(2, "0")}`, live_session_link: "",
      is_active: true, created_at: new Date().toISOString(), student_count: 0,
    };
    batches.push(batch); roster.set(batch.id, []); assignedLevels.set(batch.id, new Set());
    return HttpResponse.json(batch, { status: 201 });
  }),
  http.patch(`${BASE}/classes/:batchId/`, async ({ request, params }) => {
    const batch = batches.find(item => item.id === params.batchId);
    if (!batch) return notFound();
    const body = await request.json() as Partial<Batch>;
    if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim() || body.name.length > 128)) {
      return HttpResponse.json({ name: ["Enter a batch name of at most 128 characters."] }, { status: 400 });
    }
    if (body.name !== undefined) batch.name = body.name.trim();
    if (body.live_session_link !== undefined) batch.live_session_link = body.live_session_link;
    if (body.is_active !== undefined) batch.is_active = body.is_active;
    return HttpResponse.json(batch);
  }),
  http.post(`${BASE}/classes/:batchId/rotate-code/`, ({ params }) => {
    const batch = batches.find(item => item.id === params.batchId);
    if (!batch) return notFound();
    batch.join_code = `NEW${String(nextBatch++).padStart(3, "0")}`;
    return HttpResponse.json({ join_code: batch.join_code });
  }),
  http.get(`${BASE}/classes/:batchId/roster/`, ({ params }) => {
    const students = roster.get(String(params.batchId));
    return students ? HttpResponse.json(students) : notFound();
  }),
  http.get(`${BASE}/classes/levels/:levelId/dashboard/`, ({ params }) => {
    const level = MOCK_LEVELS.find(item => item.id === params.levelId);
    if (!level) return notFound();
    const lessons = (MOCK_LESSONS[level.id] ?? []).map(({ id, name, order }) => ({ id, name, order }));
    return HttpResponse.json({
      level: { id: level.id, name: level.name, order: level.order }, lessons,
      classes: batches.filter(batch => batch.is_active && assignedLevels.get(batch.id)?.has(level.id)).map(batch => ({
        id: batch.id, name: batch.name, total_students: roster.get(batch.id)?.length ?? 0,
        lessons: lessons.map(lesson => ({ lesson_id: lesson.id, classwork_completed: 0, homework_completed: 0 })),
      })),
    });
  }),
];
