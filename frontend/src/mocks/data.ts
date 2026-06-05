// Stable mock data — used by MSW handlers in dev mode.

export const MOCK_USER = {
  id: "usr_001",
  email: "student@boltabacus.dev",
  role: "STUDENT" as const,
  profile: {
    display_name: "ARJUN",
    avatar_url: "/avatars/avatar1.png",
    locale: "en",
    timezone: "Asia/Kolkata",
  },
  stats: {
    total_xp: 8450,
    streak_days: 7,
    levels_completed: 3,
    current_level: 4,
  },
};

export const MOCK_XP_PROGRESS = {
  total_xp: 8450,
  current_level: 4,
  streak_days: 7,
  current_level_threshold: 7500,
  next_level_threshold: 10000,
  xp_to_next_level: 1550,
};

export const MOCK_LEVELS = [
  { id: "1", order: 1, name: "THE LITTLE FRIEND",    description: "Addition with single digits",   xp_threshold: 0,     is_advanced: false, is_locked: false, is_completed: true  },
  { id: "2", order: 2, name: "THE BIG FRIEND",       description: "Subtraction fundamentals",      xp_threshold: 1000,  is_advanced: false, is_locked: false, is_completed: true  },
  { id: "3", order: 3, name: "DOUBLE DIGITS",        description: "Two-digit operations",          xp_threshold: 2500,  is_advanced: false, is_locked: false, is_completed: true  },
  { id: "4", order: 4, name: "MIXED OPERATIONS",     description: "Addition and subtraction mix",  xp_threshold: 4500,  is_advanced: false, is_locked: false, is_completed: false },
  { id: "5", order: 5, name: "SPEED CHALLENGE",      description: "Timed problem sets",            xp_threshold: 7500,  is_advanced: false, is_locked: true,  is_completed: false },
  { id: "6", order: 6, name: "TRIPLE DIGITS",        description: "Three-digit operations",        xp_threshold: 11000, is_advanced: false, is_locked: true,  is_completed: false },
  { id: "7", order: 7, name: "MULTIPLICATION ENTRY", description: "Intro to multiplication",       xp_threshold: 15500, is_advanced: false, is_locked: true,  is_completed: false },
  { id: "8", order: 8, name: "DIVISION BASICS",      description: "Core division skills",          xp_threshold: 21000, is_advanced: false, is_locked: true,  is_completed: false },
  { id: "9", order: 9, name: "ADVANCED OPERATIONS",  description: "Multi-step problems",           xp_threshold: 27500, is_advanced: false, is_locked: true,  is_completed: false },
  { id: "10",order: 10, name: "MASTER CLASS",        description: "Full operation mastery",        xp_threshold: 35000, is_advanced: false, is_locked: true,  is_completed: false },
];

export const MOCK_LESSONS: Record<string, import("@/shared/types").LessonWithCompletion[]> = {
  "1": [
    { id: "l1-1", order: 1, name: "Class 1 — Counting Up",    description: "Add 1 and 2 on abacus",      classwork_completed: true,  classwork_accuracy_pct: 93,   homework_completed: true,  is_locked: false },
    { id: "l1-2", order: 2, name: "Class 2 — Counting Down",  description: "Subtract 1 and 2",            classwork_completed: true,  classwork_accuracy_pct: 88,   homework_completed: true,  is_locked: false },
    { id: "l1-3", order: 3, name: "Class 3 — Fives Family",   description: "Add/subtract 5 and friends",  classwork_completed: true,  classwork_accuracy_pct: 100,  homework_completed: false, is_locked: false },
  ],
  "2": [
    { id: "l2-1", order: 1, name: "Class 1 — Big Friend",     description: "Partner number technique",    classwork_completed: true,  classwork_accuracy_pct: 85,   homework_completed: true,  is_locked: false },
    { id: "l2-2", order: 2, name: "Class 2 — Small Friend",   description: "Reverse partner technique",   classwork_completed: true,  classwork_accuracy_pct: 90,   homework_completed: false, is_locked: false },
  ],
  "3": [
    { id: "l3-1", order: 1, name: "Class 1 — Tens Column",    description: "Introduce tens bead",         classwork_completed: true,  classwork_accuracy_pct: 78,   homework_completed: true,  is_locked: false },
    { id: "l3-2", order: 2, name: "Class 2 — Tens + Units",   description: "Combined operations",         classwork_completed: false, classwork_accuracy_pct: null, homework_completed: false, is_locked: false },
  ],
  "4": [
    { id: "l4-1", order: 1, name: "Class 1 — Mixed Add",      description: "Add across ten",              classwork_completed: false, classwork_accuracy_pct: null, homework_completed: false, is_locked: false },
    { id: "l4-2", order: 2, name: "Class 2 — Mixed Sub",      description: "Subtract across ten",         classwork_completed: false, classwork_accuracy_pct: null, homework_completed: false, is_locked: true  },
    { id: "l4-3", order: 3, name: "Class 3 — Combo Drills",   description: "Mixed operation drill set",   classwork_completed: false, classwork_accuracy_pct: null, homework_completed: false, is_locked: true  },
  ],
};

// Generates a simple arithmetic question text
function makeQuestion(index: number): { text: string; expected: number } {
  const pairs = [
    { text: "  12\n+  8", expected: 20 },
    { text: "  25\n+ 37", expected: 62 },
    { text: "  50\n- 13", expected: 37 },
    { text: "  44\n+ 19", expected: 63 },
    { text: "  78\n- 45", expected: 33 },
    { text: "  33\n+ 28", expected: 61 },
    { text: "  60\n- 24", expected: 36 },
    { text: "  15\n+ 47", expected: 62 },
    { text: "  92\n- 38", expected: 54 },
    { text: "  29\n+ 53", expected: 82 },
  ];
  return pairs[index % pairs.length];
}

export function makeMockSession(sessionId: string, kind: string, count = 10) {
  return {
    session_id: sessionId,
    kind,
    questions: Array.from({ length: count }, (_, i) => ({
      index: i,
      text: makeQuestion(i).text,
      operation: "ADD",
    })),
    time_limit_sec: 600,
  };
}

export function makeMockReport(sessionId: string, lessonId: string | null = null) {
  const total = 10;
  // q0–q6: correct; q7: fixed (wrong then correct); q8: skipped; q9: wrong
  const attempts = Array.from({ length: total }, (_, i) => {
    const { text, expected } = makeQuestion(i);
    if (i === 7) {
      // Two attempts — first wrong, second correct
      return [
        {
          question_index: 7,
          attempt_number: 1,
          question_text: text,
          expected_answer: expected,
          submitted_answer: expected - 5,
          is_correct: false,
          elapsed_ms: 9500,
        },
        {
          question_index: 7,
          attempt_number: 2,
          question_text: text,
          expected_answer: expected,
          submitted_answer: expected,
          is_correct: true,
          elapsed_ms: 6200,
        },
      ];
    }
    if (i === 8) {
      return [{
        question_index: 8,
        attempt_number: 1,
        question_text: text,
        expected_answer: expected,
        submitted_answer: -999999,
        is_correct: false,
        elapsed_ms: 2100,
      }];
    }
    return [{
      question_index: i,
      attempt_number: 1,
      question_text: text,
      expected_answer: expected,
      submitted_answer: i < 7 ? expected : expected - 1,
      is_correct: i < 7,
      elapsed_ms: 8000 + i * 1200,
    }];
  }).flat();

  const question_verdicts: Record<number, string> = {};
  for (let i = 0; i < total; i++) {
    if (i < 7) question_verdicts[i] = "correct";
    else if (i === 7) question_verdicts[i] = "fixed";
    else if (i === 8) question_verdicts[i] = "skipped";
    else question_verdicts[i] = "wrong";
  }

  return {
    progress: {
      id: `pr_${sessionId}`,
      session_id: sessionId,
      score_correct: 7,
      score_total: total,
      accuracy_pct: 70,
      time_taken_sec: 183,
      xp_earned: 120,
      created_at: new Date().toISOString(),
    },
    attempts,
    lesson_id: lessonId,
    question_verdicts,
  };
}

export const MOCK_AVATAR_PRESETS = {
  presets: [
    "/avatars/avatar1.png",
    "/avatars/avatar2.png",
    "/avatars/avatar3.png",
    "/avatars/avatar4.png",
  ],
};
