import { http, HttpResponse } from "msw";
import type { Batch, RosterStudent } from "@/shared/types";
import { MOCK_LEVELS, MOCK_LESSONS, MOCK_USER } from "./data";

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
const joinedBatches = new Set<string>();
const notFound = () => HttpResponse.json({ detail: "Not found." }, { status: 404 });
function serializeBatch(batch: Batch) {
  return { ...batch, assigned_level_ids: MOCK_LEVELS.filter(level => assignedLevels.get(batch.id)?.has(level.id)).map(level => level.id) };
}
function normalizedUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const hex = value.replace(/^urn:uuid:/i, "").replace(/^\{(.*)\}$/, "$1").replaceAll("-", "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const assignmentFailure = () => HttpResponse.json({ assigned_level_ids: ["Select unique existing levels using UUID strings."] }, { status: 400 });

export const classroomHandlers = [
  http.get(`${BASE}/classes/`, () => HttpResponse.json(batches.map(serializeBatch))),
  http.post(`${BASE}/classes/`, async ({ request }) => {
    const body = await request.json() as { name?: string; assigned_level_ids?: unknown };
    if ("assigned_level_ids" in body) {
      return HttpResponse.json({ assigned_level_ids: ["Configure assigned levels through the batch editor after creation."] }, { status: 400 });
    }
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
    return HttpResponse.json(serializeBatch(batch), { status: 201 });
  }),
  http.patch(`${BASE}/classes/:batchId/`, async ({ request, params }) => {
    const batch = batches.find(item => item.id === params.batchId);
    if (!batch) return notFound();
    const body = await request.json() as Partial<Batch>;
    let selected: string[] | undefined;
    if ("assigned_level_ids" in body) {
      if (!Array.isArray(body.assigned_level_ids)) return assignmentFailure();
      const normalized = body.assigned_level_ids.map(normalizedUuid);
      if (normalized.some(id => !id || !MOCK_LEVELS.some(level => level.id === id)) || new Set(normalized).size !== normalized.length) return assignmentFailure();
      selected = normalized as string[];
    }
    if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim() || body.name.length > 128)) {
      return HttpResponse.json({ name: ["Enter a batch name of at most 128 characters."] }, { status: 400 });
    }
    if (body.name !== undefined) batch.name = body.name.trim();
    if (body.live_session_link !== undefined) batch.live_session_link = body.live_session_link;
    if (body.is_active !== undefined) batch.is_active = body.is_active;
    if (selected !== undefined) assignedLevels.set(batch.id, new Set(selected));
    return HttpResponse.json(serializeBatch(batch));
  }),
  http.post(`${BASE}/classes/join/`, async ({ request }) => {
    const body = await request.json() as { join_code?: string };
    const batch = batches.find(item => item.is_active && item.join_code === body.join_code?.trim().toUpperCase());
    if (!batch) return HttpResponse.json({ detail: "Invalid or expired join code." }, { status: 400 });
    if (joinedBatches.has(batch.id)) return HttpResponse.json({ detail: "Already enrolled." }, { status: 400 });
    joinedBatches.add(batch.id);
    roster.get(batch.id)!.push({ id: MOCK_USER.id, call_sign: MOCK_USER.profile.display_name,
      current_level: MOCK_USER.stats.current_level, accuracy_pct: null, enrolled_at: new Date().toISOString() });
    batch.student_count += 1;
    return HttpResponse.json(serializeBatch(batch), { status: 201 });
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
