import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { SessionReport } from "@/shared/types";

export function useSessionReport(sessionId: string | undefined) {
  return useQuery<SessionReport>({
    queryKey: ["sessions", sessionId, "report"],
    queryFn: async () => {
      const { data } = await apiClient.get<SessionReport>(`/sessions/${sessionId}/report/`);
      return data;
    },
    enabled: !!sessionId,
    retry: 2,                       // brief retry for the finalize race window
    retryDelay: (i) => 500 * (i + 1),
    staleTime: 60_000,              // allow re-fetch if user revisits within 60s
  });
}
