import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { apiClient } from "@/shared/api/client";
import { matchesReceipt, validateBulk } from "@/shared/store/answerRecovery";
import type { PendingAttempt } from "@/shared/store/answerRecovery";
import type { AcceptedReceipt, AttemptIdentity, ProgressRecord, SessionMeta } from "@/shared/types";

export const SESSION_REQUEST_TIMEOUT_MS = 10000;

export type BulkAttemptItem = PendingAttempt;
export type BulkVerdict = AcceptedReceipt;

export function useSession(sessionId: string) {
  const userId = useAuthStore(s => s.user?.id);
  const token = useAuthStore(s => s.accessToken);
  const hydrating = useAuthStore(s => s.isHydrating);
  const enabled = !!sessionId && !!userId && !!token && !hydrating;
  const query = useQuery<SessionMeta>({
    queryKey: ["sessions", userId, sessionId],
    queryFn: async ({ signal }) => (await apiClient.get<SessionMeta>(`/sessions/${sessionId}/`, { signal, timeout: SESSION_REQUEST_TIMEOUT_MS })).data,
    enabled,
    staleTime: 0,
    refetchOnReconnect: true,
  });
  return { ...query, data: enabled ? query.data : undefined };
}

export async function submitBulk(sessionId: string, attempts: PendingAttempt[]) {
  const { data } = await apiClient.post<unknown>(`/sessions/${sessionId}/attempts/bulk/`, { contract_version: 2, attempts }, { timeout: SESSION_REQUEST_TIMEOUT_MS });
  return validateBulk(data, attempts);
}
export async function finalize(sessionId: string, expected_attempts: AttemptIdentity[]): Promise<ProgressRecord> {
  const { data } = await apiClient.post<ProgressRecord>(`/sessions/${sessionId}/submit/`, { contract_version: 2, expected_attempts }, { timeout: SESSION_REQUEST_TIMEOUT_MS });
  if (data.contract_version !== 2 || data.session_id !== sessionId || typeof data.id !== "string" || typeof data.created_at !== "string" || !Number.isFinite(Date.parse(data.created_at)) || !Number.isInteger(data.score_correct) || !Number.isInteger(data.score_total) || data.score_correct < 0 || data.score_correct > data.score_total || ![data.score_correct, data.score_total, data.accuracy_pct, data.time_taken_sec, data.xp_earned].every(n => typeof n === "number" && Number.isFinite(n))) throw new Error("Final result is incompatible. Your required answers remain recoverable; retry after the API is upgraded.");
  return data;
}
export function useSubmitAttempt(sessionId: string) {
  return useMutation<AcceptedReceipt, Error, PendingAttempt>({
    mutationFn: async payload => {
      const { data } = await apiClient.post<unknown>(`/sessions/${sessionId}/attempts/`, { contract_version: 2, ...payload }, { timeout: SESSION_REQUEST_TIMEOUT_MS });
      if (!matchesReceipt(payload, data)) throw new Error("API acknowledgment is incompatible; the answer remains pending.");
      return data;
    },
  });
}
export function useFinalizeSession(sessionId: string) {
  return useMutation<ProgressRecord, Error, AttemptIdentity[]>({ mutationFn: manifest => finalize(sessionId, manifest) });
}
export function useBulkSubmit(sessionId: string) {
  return useMutation<{ contract_version: 2; verdicts: AcceptedReceipt[] }, Error, { attempts: PendingAttempt[] }>({
    mutationFn: async payload => ({ contract_version: 2, verdicts: await submitBulk(sessionId, payload.attempts) }),
  });
}
