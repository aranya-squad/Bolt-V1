import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { RosterStudent } from "@/shared/types";

async function fetchRoster(batchId: string): Promise<RosterStudent[]> {
  const { data } = await apiClient.get<RosterStudent[]>(`/classes/${batchId}/roster/`);
  return data;
}

export function useRoster(batchId: string | undefined) {
  return useQuery({
    queryKey: ["roster", batchId],
    queryFn: () => fetchRoster(batchId!),
    enabled: !!batchId,
  });
}
