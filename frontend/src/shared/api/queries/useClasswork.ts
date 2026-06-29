import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { SessionMeta } from "@/shared/types";

export function useStartClasswork(levelId: string, lessonId?: string) {
  return useMutation<SessionMeta, Error, { is_test_mode?: boolean }>({
    mutationFn: async ({ is_test_mode = false } = {}) => {
      const url = lessonId
        ? `/levels/${levelId}/lessons/${lessonId}/classwork/start/`
        : `/levels/${levelId}/classwork/start/`;
      const { data } = await apiClient.post<SessionMeta>(url, { is_test_mode });
      return data;
    },
  });
}
