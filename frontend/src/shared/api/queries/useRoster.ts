import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { RosterStudent } from "@/shared/types";
import { teacherKeys, teacherQueryDefaults, teacherRequest, useTeacherIdentity } from "./teacherIdentity";

async function fetchRoster(batchId: string, signal: AbortSignal): Promise<RosterStudent[]> {
  const { data } = await apiClient.get<RosterStudent[]>(`/classes/${batchId}/roster/`, { signal });
  return data;
}

export function useRoster(batchId: string | undefined) {
  const identity = useTeacherIdentity();
  return useQuery({
    queryKey: teacherKeys.roster(identity, batchId),
    queryFn: ({ signal }) => teacherRequest(identity, requestSignal => fetchRoster(batchId!, requestSignal), signal),
    enabled: !!identity && !!batchId,
    ...teacherQueryDefaults,
  });
}
