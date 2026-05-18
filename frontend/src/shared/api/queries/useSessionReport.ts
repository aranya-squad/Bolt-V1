import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { SessionReport } from "@/shared/types";

export function useSessionReport(sessionId: string) {
  return useQuery<SessionReport>({
    queryKey: ["sessions", sessionId, "report"],
    queryFn: async () => {
      const { data } = await apiClient.get<SessionReport>(`/sessions/${sessionId}/report/`);
      return data;
    },
    staleTime: Infinity,
  });
}
