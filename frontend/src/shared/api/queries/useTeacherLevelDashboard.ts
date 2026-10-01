import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import { teacherKeys, teacherQueryDefaults, teacherRequest, useTeacherIdentity } from "./teacherIdentity";

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
  const identity = useTeacherIdentity();
  return useQuery<TeacherLevelDashboard>({
    queryKey: teacherKeys.matrix(identity, levelId),
    queryFn: ({ signal }) => teacherRequest(identity, async requestSignal => {
      const { data } = await apiClient.get<TeacherLevelDashboard>(
        `/classes/levels/${levelId}/dashboard/`, { signal: requestSignal }
      );
      return data;
    }, signal),
    enabled: !!identity && !!levelId,
    ...teacherQueryDefaults,
  });
}
