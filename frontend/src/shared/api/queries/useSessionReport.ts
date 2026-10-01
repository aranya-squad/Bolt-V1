import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { apiClient } from "@/shared/api/client";
import type { SessionReport } from "@/shared/types";

export function useSessionReport(sessionId: string | undefined) {
  const userId = useAuthStore(s => s.user?.id);
  const token = useAuthStore(s => s.accessToken);
  const hydrating = useAuthStore(s => s.isHydrating);
  const enabled = !!sessionId && !!userId && !!token && !hydrating;
  const query = useQuery<SessionReport>({
    queryKey: ["sessions", userId, sessionId, "report"],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<SessionReport>(`/sessions/${sessionId}/report/`, { signal, timeout: 10000 });
      return data;
    },
    enabled,
    retry: 2,                       // brief retry for the finalize race window
    retryDelay: (i) => 500 * (i + 1),
    staleTime: 60_000,              // allow re-fetch if user revisits within 60s
  });
  return { ...query, data: enabled ? query.data : undefined };
}
