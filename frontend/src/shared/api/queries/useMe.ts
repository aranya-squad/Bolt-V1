import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { User } from "@/shared/types";

export const ME_QUERY_KEY = ["auth", "me"] as const;

export function useMe() {
  return useQuery<User>({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<User>("/auth/me/");
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 min
  });
}
