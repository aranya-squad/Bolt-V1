import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { SessionMeta } from "@/shared/types";

export function useStartClasswork(levelId: string, lessonId?: string) {
  return useMutation<SessionMeta, Error>({
    mutationFn: async () => {
      const url = lessonId
        ? `/levels/${levelId}/lessons/${lessonId}/classwork/start/`
        : `/levels/${levelId}/classwork/start/`;
      const { data } = await apiClient.post<SessionMeta>(url);
      return data;
    },
  });
}
