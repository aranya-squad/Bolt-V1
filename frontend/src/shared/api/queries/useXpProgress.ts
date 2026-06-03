import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";

interface XpProgressData {
  total_xp: number;
  current_level: number;
  streak_days: number;
  current_level_threshold: number;
  next_level_threshold: number;
  xp_to_next_level: number;
}

export function useXpProgress() {
  return useQuery<XpProgressData>({
    queryKey: ["xp-progress"],
    queryFn: async () => {
      const { data } = await apiClient.get<XpProgressData>("/auth/me/xp-progress/");
      return data;
    },
    staleTime: 60_000,
  });
}
