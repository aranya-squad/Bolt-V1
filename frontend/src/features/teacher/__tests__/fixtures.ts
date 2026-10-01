import type { Batch, RosterStudent, User } from "@/shared/types";
import type { TeacherLevelDashboard } from "@/shared/api/queries/useTeacherLevelDashboard";

export const teacherA: User = { id: "teacher-a", email: "a@example.test", role: "TEACHER", profile: null };
export const teacherB: User = { id: "teacher-b", email: "b@example.test", role: "TEACHER", profile: null };
export const batch: Batch = {
  id: "batch-a", name: "Morning batch", join_code: "ABC123", live_session_link: "",
  is_active: true, created_at: "2026-10-01T00:00:00Z", student_count: 2,
};
export const roster: RosterStudent[] = [
  { id: "student-a", call_sign: "Comet", current_level: 1, accuracy_pct: null, enrolled_at: "2026-10-01T00:00:00Z" },
  { id: "student-b", call_sign: "Nova", current_level: 4, accuracy_pct: 82.5, enrolled_at: "2026-10-01T00:00:00Z" },
];
export const matrix: TeacherLevelDashboard = {
  level: { id: "level-a", name: "Foundations", order: 1 },
  lessons: [
    { id: "lesson-a", name: "First topic", order: 1 },
    { id: "lesson-b", name: "Second topic", order: 2 },
    { id: "lesson-c", name: "Missing topic", order: 3 },
  ],
  classes: [{
    id: batch.id, name: batch.name, total_students: 2,
    lessons: [
      { lesson_id: "lesson-b", classwork_completed: 2, homework_completed: 1 },
      { lesson_id: "lesson-a", classwork_completed: 1, homework_completed: 0 },
      { lesson_id: "unrelated", classwork_completed: 99, homework_completed: 99 },
    ],
  }],
};
