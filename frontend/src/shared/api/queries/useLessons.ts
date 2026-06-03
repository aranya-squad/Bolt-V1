import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { LessonWithCompletion } from "@/shared/types";

export function useLessons(levelId: string) {
  return useQuery<LessonWithCompletion[]>({
    queryKey: ["levels", levelId, "lessons"],
    queryFn: async () => {
      const { data } = await apiClient.get<LessonWithCompletion[]>(`/levels/${levelId}/lessons/`);
      return data;
    },
    staleTime: 60_000,
  });
}
