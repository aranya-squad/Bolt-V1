import { http, HttpResponse } from "msw";
import type { AcceptedReceipt, DailyQuestMission, ProgressRecord, SessionKind, SessionMeta } from "@/shared/types";
import { identityKey, isPending, matchesReceipt } from "@/shared/store/answerRecovery";
import {
  MOCK_USER,
  MOCK_XP_PROGRESS,
  MOCK_LEVELS,
  MOCK_LESSONS,
  MOCK_AVATAR_PRESETS,
  makeMockDailyMission,
  makeMockSession,
  makeMockReport,
} from "./data";

const BASE = "/api/v1";

let sessionCounter = 1;
function nextSessionId() {
  return `sess_mock_${String(sessionCounter++).padStart(4, "0")}`;
}

const missions = new Map<string, DailyQuestMission>();
const results = new Map<string, ProgressRecord>();
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
    if (!prior && session.is_test_mode && (a.is_skip || previous.concat(accepted).some(r => r.question_index === a.question_index))) return HttpResponse.json({ code: "attempt_limit", detail: "One non-skip answer per question.", items: [a] }, { status: 409 });
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
  if (session.daily_quest) session.daily_quest.progress = new Set(updated.filter(r => !r.is_skip).map(r => r.question_index)).size;
  return HttpResponse.json(bulk ? { contract_version: 2, verdicts: accepted } : accepted[0]);
}

export const handlers = [
  http.get(`${BASE}/daily-quests/today/`, () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    if (!missions.has(date)) missions.set(date, makeMockDailyMission(date));
    const reset = new Date(now); reset.setUTCHours(24, 0, 0, 0);
    const previous = [...missions.values()].filter(m => m.date < date && m.state === "in_progress").sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
    return HttpResponse.json({ server_now: now.toISOString(), timezone: "UTC", reset_at: reset.toISOString(), mission: missions.get(date), previous_unfinished: previous, reason: null }, { headers: { "Cache-Control": "no-store" } });
  }),
  http.post(`${BASE}/daily-quests/:id/start/`, ({ params }) => {
    const mission = [...missions.values()].find(m => m.id === params.id);
    if (!mission) return HttpResponse.json({ detail: "Mission unavailable." }, { status: 404 });
    if (mission.session_id) return HttpResponse.json(sessions.get(mission.session_id), { headers: { "Cache-Control": "no-store" } });
    const meta = makeMockSession(nextSessionId(), "ZEN", 5);
    mission.session_id = meta.session_id; mission.state = "in_progress";
    return HttpResponse.json(remember({ ...meta, is_test_mode: true, daily_quest: mission }), { status: 201, headers: { "Cache-Control": "no-store" } });
  }),
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
    if (meta.daily_quest && new Set(rows.filter(r => !r.is_skip).map(r => r.question_index)).size !== 5) return HttpResponse.json({ code: "mission_incomplete", detail: "Practice all five questions before finishing." }, { status: 409 });
    if (results.has(sessionId)) return HttpResponse.json(results.get(sessionId));
    meta.state = "submitted";
    const correct = new Set(rows.filter(a => a.is_correct && !a.is_skip).map(a => a.question_index)).size;
    const result: ProgressRecord = {
      contract_version: 2, id: `pr_${sessionId}`, session_id: sessionId, score_correct: correct,
      score_total: meta.questions.length, accuracy_pct: correct / meta.questions.length * 100,
      time_taken_sec: 183, xp_earned: correct * 10 + (correct === meta.questions.length ? 50 : 0), created_at: new Date().toISOString(),
    };
    results.set(sessionId, result);
    if (meta.daily_quest) Object.assign(meta.daily_quest, { state: "completed", progress: 5, xp_earned: result.xp_earned, completed_at: result.created_at });
    return HttpResponse.json(result);
  }),

  http.get(`${BASE}/sessions/:sessionId/report/`, ({ params }) => {
    const sessionId = String(params.sessionId);
    const meta = sessions.get(sessionId);
    const result = results.get(sessionId);
    if (!meta?.daily_quest) return HttpResponse.json(makeMockReport(sessionId, "l4-1"));
    if (!result) return HttpResponse.json({ detail: "Report unavailable until submitted." }, { status: 404 });
    const rows = receipts.get(sessionId) ?? [];
    const attempts = rows.map(r => ({ ...r, question_text: meta.questions[r.question_index].text, expected_answer: meta.questions[r.question_index].answer! }));
    return HttpResponse.json({ progress: result, attempts, lesson_id: null, question_verdicts: Object.fromEntries(rows.map(r => [r.question_index, r.is_correct ? "correct" : "wrong"])) });
  }),
];
