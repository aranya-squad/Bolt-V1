import { http, HttpResponse } from "msw";
import type { AcceptedReceipt, SessionKind, SessionMeta } from "@/shared/types";
import { identityKey, isPending, matchesReceipt } from "@/shared/store/answerRecovery";
import {
  MOCK_USER,
  MOCK_XP_PROGRESS,
  MOCK_LEVELS,
  MOCK_LESSONS,
  MOCK_AVATAR_PRESETS,
  makeMockSession,
  makeMockReport,
} from "./data";

const BASE = "/api/v1";

let sessionCounter = 1;
function nextSessionId() {
  return `sess_mock_${String(sessionCounter++).padStart(4, "0")}`;
}

const sessions = new Map<string, SessionMeta>();
const receipts = new Map<string, AcceptedReceipt[]>();
function remember(meta: SessionMeta) { sessions.set(meta.session_id, meta); return meta; }
function mockWrite(sessionId: string, value: unknown, bulk: boolean) {
  const session = sessions.get(sessionId);
  if (!session) return HttpResponse.json({ detail: "Session unavailable." }, { status: 404 });
  const body = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const attempts = bulk ? body.attempts : [body];
  if (body.contract_version !== 2 || !Array.isArray(attempts) || attempts.length > 100 || !attempts.every(isPending)) return HttpResponse.json({ code: "invalid_attempt", detail: "Invalid v2 attempt." }, { status: 400 });
  const previous = receipts.get(sessionId) ?? [];
  const accepted: AcceptedReceipt[] = [];
  for (const a of attempts) {
    const prior = previous.find(r => identityKey(r) === identityKey(a));
    if (prior && !matchesReceipt(a, prior)) return HttpResponse.json({ code: "identity_conflict", detail: "Attempt identity conflict.", receipt: prior }, { status: 409 });
    const expected = [20, 62, 37, 63, 33, 61, 36, 62, 54, 82];
    accepted.push(prior ?? { contract_version: 2, question_index: a.question_index, attempt_number: a.attempt_number, submitted_answer: a.answer, elapsed_ms: a.elapsed_ms, is_skip: a.is_skip, is_correct: !a.is_skip && a.answer === expected[a.question_index % expected.length], accepted: true, xp_delta: 0 });
  }
  const updated = [...previous, ...accepted.filter(a => !previous.some(r => identityKey(r) === identityKey(a)))];
  receipts.set(sessionId, updated);
  session.question_states = session.questions.map(q => {
    const rows = updated.filter(a => a.question_index === q.index).sort((a, b) => a.attempt_number - b.attempt_number);
    const latest = rows[rows.length - 1] ?? null;
    return { question_index: q.index, max_attempt_number: latest?.attempt_number ?? 0, attempt_count: rows.length, terminal: !!latest && (latest.is_correct || latest.is_skip || session.is_test_mode), latest_receipt: latest };
  });
  return HttpResponse.json(bulk ? { contract_version: 2, verdicts: accepted } : accepted[0]);
}

export const handlers = [
  // ── Auth ────────────────────────────────────────────────────────────────

  http.post(`${BASE}/auth/login/`, async () => {
    return HttpResponse.json({ access: "mock-access-token" });
  }),

  // Student login — call-sign + PIN
  http.post(`${BASE}/auth/callsign-login/`, async ({ request }) => {
    const body = await request.json() as { call_sign?: string; pin?: string };
    // Any non-empty call_sign + 4-digit PIN succeeds in dev
    if (!body.call_sign || !body.pin || body.pin.length !== 4) {
      return HttpResponse.json({ detail: "Wrong call sign or PIN." }, { status: 401 });
    }
    return HttpResponse.json({ access: "mock-access-token" });
  }),

  http.post(`${BASE}/auth/register/`, async () => {
    return HttpResponse.json(MOCK_USER, { status: 201 });
  }),

  http.post(`${BASE}/auth/refresh/`, async () => {
    return HttpResponse.json({ access: "mock-access-token" });
  }),

  http.get(`${BASE}/auth/me/`, () => {
    return HttpResponse.json(MOCK_USER);
  }),

  http.get(`${BASE}/auth/me/xp-progress/`, () => {
    return HttpResponse.json(MOCK_XP_PROGRESS);
  }),

  http.get(`${BASE}/auth/avatar-presets/`, () => {
    return HttpResponse.json(MOCK_AVATAR_PRESETS);
  }),

  http.patch(`${BASE}/auth/me/profile/`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    // Merge into mock user profile — in-memory only (resets on page refresh)
    if (body.display_name) MOCK_USER.profile.display_name = body.display_name as string;
    if (body.avatar_url) MOCK_USER.profile.avatar_url = body.avatar_url as string;
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Levels ──────────────────────────────────────────────────────────────

  http.get(`${BASE}/levels/`, () => {
    return HttpResponse.json({ results: MOCK_LEVELS });
  }),

  http.get(`${BASE}/levels/:id/`, ({ params }) => {
    const level = MOCK_LEVELS.find((l) => l.id === params.id);
    if (!level) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(level);
  }),

  http.get(`${BASE}/levels/:levelId/lessons/`, ({ params }) => {
    const lessons = MOCK_LESSONS[params.levelId as string] ?? [];
    return HttpResponse.json(lessons);
  }),

  // ── Session start ────────────────────────────────────────────────────────

  http.post(`${BASE}/levels/:levelId/lessons/:lessonId/classwork/start/`, async ({ request, params }) => {
    const body = await request.json() as { is_test_mode?: boolean };
    const meta = makeMockSession(nextSessionId(), "CLASSWORK");
    return HttpResponse.json(remember({ ...meta, level_id: String(params.levelId), lesson_id: String(params.lessonId), is_test_mode: body.is_test_mode === true }), { status: 201 });
  }),
  http.post(`${BASE}/levels/:levelId/classwork/start/`, async ({ request, params }) => {
    const body = await request.json() as { is_test_mode?: boolean };
    const meta = makeMockSession(nextSessionId(), "CLASSWORK");
    return HttpResponse.json(remember({ ...meta, level_id: String(params.levelId), is_test_mode: body.is_test_mode === true }), { status: 201 });
  }),
  http.post(`${BASE}/practice/start/`, async ({ request }) => {
    const body = await request.json() as { mode?: SessionKind; question_count?: number };
    return HttpResponse.json(remember(makeMockSession(nextSessionId(), body.mode ?? "FLASH_CARDS", body.question_count ?? 10)), { status: 201 });
  }),
  http.get(`${BASE}/sessions/:sessionId/`, ({ params }) => {
    const meta = sessions.get(String(params.sessionId));
    return meta ? HttpResponse.json({ ...meta, server_now: new Date().toISOString() }) : HttpResponse.json({ detail: "Session unavailable." }, { status: 404 });
  }),
  http.post(`${BASE}/sessions/:sessionId/attempts/`, async ({ request, params }) => mockWrite(String(params.sessionId), await request.json(), false)),
  http.post(`${BASE}/sessions/:sessionId/attempts/bulk/`, async ({ request, params }) => mockWrite(String(params.sessionId), await request.json(), true)),
  http.post(`${BASE}/sessions/:sessionId/submit/`, async ({ request, params }) => {
    const body = await request.json() as { contract_version?: number; expected_attempts?: { question_index: number; attempt_number: number }[] };
    const sessionId = String(params.sessionId);
    const meta = sessions.get(sessionId);
    if (!meta) return HttpResponse.json({ detail: "Session unavailable." }, { status: 404 });
    const rows = receipts.get(sessionId) ?? [];
    if (body.contract_version !== 2 || !Array.isArray(body.expected_attempts)) return HttpResponse.json({ code: "invalid_attempt", detail: "Expected a v2 manifest." }, { status: 400 });
    const missing = body.expected_attempts.filter(a => !rows.some(r => identityKey(a) === identityKey(r)));
    if (missing.length) return HttpResponse.json({ code: "pending_attempts", detail: "Required answers remain pending.", missing_attempts: missing }, { status: 409 });
    meta.state = "submitted";
    const correct = new Set(rows.filter(a => a.is_correct && !a.is_skip).map(a => a.question_index)).size;
    return HttpResponse.json({
      contract_version: 2, id: `pr_${sessionId}`, session_id: sessionId, score_correct: correct,
      score_total: meta.questions.length, accuracy_pct: correct / meta.questions.length * 100,
      time_taken_sec: 183, xp_earned: correct * 10, created_at: meta.started_at,
    });
  }),

  http.get(`${BASE}/sessions/:sessionId/report/`, ({ params }) => {
    return HttpResponse.json(makeMockReport(params.sessionId as string, "l4-1"));
  }),
];
