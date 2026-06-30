import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";

export interface TeacherLevelLesson {
  id: string;
  name: string;
  order: number;
}

export interface TeacherLevelClassLesson {
  lesson_id: string;
  classwork_completed: number;
  homework_completed: number;
}

export interface TeacherLevelClass {
  id: string;
  name: string;
  total_students: number;
  lessons: TeacherLevelClassLesson[];
}

export interface TeacherLevelDashboard {
  level: { id: string; name: string; order: number };
  lessons: TeacherLevelLesson[];
  classes: TeacherLevelClass[];
}

export function useTeacherLevelDashboard(levelId: string) {
  return useQuery<TeacherLevelDashboard>({
    queryKey: ["teacher-level-dashboard", levelId],
    queryFn: async () => {
      const { data } = await apiClient.get<TeacherLevelDashboard>(
        `/classes/levels/${levelId}/dashboard/`
      );
      return data;
    },
    staleTime: 1000 * 60 * 2,
  });
}
