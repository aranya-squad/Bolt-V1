import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { AttemptVerdict, ProgressRecord, SessionMeta } from "@/shared/types";

export function useSession(sessionId: string) {
  return useQuery<SessionMeta>({
    queryKey: ["sessions", sessionId],
    queryFn: async () => {
      const { data } = await apiClient.get<SessionMeta>(`/sessions/${sessionId}/`);
      return data;
    },
    staleTime: Infinity, // session data doesn't change while active
  });
}

export function useSubmitAttempt(sessionId: string) {
  return useMutation<
    AttemptVerdict,
    Error,
    { question_index: number; answer: number; elapsed_ms: number }
  >({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<AttemptVerdict>(
        `/sessions/${sessionId}/attempts/`,
        payload
      );
      return data;
    },
  });
}

export function useFinalizeSession(sessionId: string) {
  return useMutation<ProgressRecord, Error>({
    mutationFn: async () => {
      const { data } = await apiClient.post<ProgressRecord>(`/sessions/${sessionId}/submit/`);
      return data;
    },
  });
}
