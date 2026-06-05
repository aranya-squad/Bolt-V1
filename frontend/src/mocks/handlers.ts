import { http, HttpResponse } from "msw";
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

export const handlers = [
  // ── Auth ────────────────────────────────────────────────────────────────

  http.post(`${BASE}/auth/login/`, async () => {
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

  http.post(`${BASE}/levels/:levelId/lessons/:lessonId/classwork/start/`, () => {
    const sessionId = nextSessionId();
    return HttpResponse.json(makeMockSession(sessionId, "CLASSWORK"), { status: 201 });
  }),

  http.post(`${BASE}/levels/:levelId/classwork/start/`, () => {
    const sessionId = nextSessionId();
    return HttpResponse.json(makeMockSession(sessionId, "CLASSWORK"), { status: 201 });
  }),

  http.post(`${BASE}/practice/start/`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const sessionId = nextSessionId();
    const mode = (body.mode as string) ?? "FLASH_CARDS";
    const count = (body.question_count as number) ?? 10;
    return HttpResponse.json(makeMockSession(sessionId, mode, count), { status: 201 });
  }),

  // ── Active session ───────────────────────────────────────────────────────

  http.get(`${BASE}/sessions/:sessionId/`, ({ params }) => {
    return HttpResponse.json(makeMockSession(params.sessionId as string, "CLASSWORK"));
  }),

  http.post(`${BASE}/sessions/:sessionId/attempts/`, async ({ request }) => {
    const body = await request.json() as { question_index: number; answer: number; elapsed_ms: number };
    const isSkip = body.answer === -999999;
    const expected = [20, 62, 37, 63, 33, 61, 36, 62, 54, 82];
    const isCorrect = !isSkip && body.answer === expected[body.question_index % expected.length];
    return HttpResponse.json({
      question_index: body.question_index,
      is_correct: isCorrect,
      xp_delta: isCorrect ? 10 : 0,
    });
  }),

  http.post(`${BASE}/sessions/:sessionId/submit/`, ({ params }) => {
    return HttpResponse.json({
      id: `pr_${params.sessionId}`,
      session_id: params.sessionId,
      score_correct: 7,
      score_total: 10,
      accuracy_pct: 70,
      time_taken_sec: 183,
      xp_earned: 120,
      created_at: new Date().toISOString(),
    });
  }),

  http.get(`${BASE}/sessions/:sessionId/report/`, ({ params }) => {
    return HttpResponse.json(makeMockReport(params.sessionId as string, "l4-1"));
  }),
];
