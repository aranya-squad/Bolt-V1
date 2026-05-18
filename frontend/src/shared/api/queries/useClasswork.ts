import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { SessionMeta } from "@/shared/types";

export function useStartClasswork(levelId: string) {
  return useMutation<SessionMeta, Error>({
    mutationFn: async () => {
      const { data } = await apiClient.post<SessionMeta>(`/levels/${levelId}/classwork/start/`);
      return data;
    },
  });
}
