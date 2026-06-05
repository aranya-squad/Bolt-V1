// Core domain types. Extended as features are built. See ARCHITECTURE.md §6.

export type Role = "STUDENT" | "GUARDIAN" | "TEACHER" | "ADMIN";

export interface HudStats {
  total_xp: number;
  streak_days: number;
  levels_completed: number;
  current_level: number;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  profile: Profile | null;
  stats?: HudStats;
}

export interface Profile {
  display_name: string;
  avatar_url: string;
  locale: string;
  timezone: string;
}

export interface Level {
  id: string;
  order: number;
  name: string;
  description: string;
  xp_threshold: number;
  is_advanced: boolean;
  // Per-user computed fields from the API
  is_locked: boolean;
  is_completed: boolean;
}

export interface Exercise {
  id: string;
  lesson_id: string;
  kind: "CLASSWORK" | "HOMEWORK";
  question_count: number;
  time_limit_sec: number;
}

export interface ProgressRecord {
  id: string;
  session_id: string;
  score_correct: number;
  score_total: number;
  accuracy_pct: number;
  time_taken_sec: number;
  xp_earned: number;
  created_at: string;
}

export interface XPEvent {
  id: number;
  event_type: string;
  delta: number;
  created_at: string;
}

// Session types (used during active gameplay)
export type SessionKind =
  | "CLASSWORK"
  | "HOMEWORK"
  | "FLASH_CARDS"
  | "ZEN"
  | "TIME_ATTACK"
  | "CUSTOM";

export interface SessionQuestion {
  index: number;
  text: string;
  operation: string;
  // Present only for practice kinds (FLASH_CARDS, ZEN, TIME_ATTACK, CUSTOM) — never for CLASSWORK/HOMEWORK.
  answer?: number;
}

export interface SessionMeta {
  session_id: string;
  kind: SessionKind;
  questions: SessionQuestion[];
  time_limit_sec: number;
}

export interface AttemptVerdict {
  question_index: number;
  is_correct: boolean;
  xp_delta: number;
}

export interface QuestionAttempt {
  question_index: number;
  attempt_number: number;
  question_text: string;
  expected_answer: number;
  submitted_answer: number;
  is_correct: boolean;
  elapsed_ms: number;
}

export type QuestionVerdict = "correct" | "wrong" | "fixed" | "skipped";

export interface SessionReport {
  progress: ProgressRecord;
  attempts: QuestionAttempt[];
  lesson_id: string | null;
  question_verdicts: Record<number, QuestionVerdict>;
}

export interface LessonWithCompletion {
  id: string;
  order: number;
  name: string;
  description: string;
  classwork_completed: boolean;
  classwork_accuracy_pct: number | null;
  homework_completed: boolean;
  is_locked: boolean;
}
