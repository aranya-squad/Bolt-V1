import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { Level } from "@/shared/types";

export const LEVELS_QUERY_KEY = ["levels"] as const;

export function useLevels() {
  return useQuery<Level[]>({
    queryKey: LEVELS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: Level[] }>("/levels/");
      return data.results;
    },
    staleTime: 1000 * 60 * 10, // 10 min — level list doesn't change often
  });
}

export function useLevel(id: string) {
  return useQuery<Level>({
    queryKey: [...LEVELS_QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<Level>(`/levels/${id}/`);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
