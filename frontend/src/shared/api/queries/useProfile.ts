import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import { ME_QUERY_KEY } from "./useMe";

interface AvatarPresetsResponse {
  presets: string[];
}

interface PatchProfilePayload {
  display_name?: string;
  avatar_url?: string;
}

export function useAvatarPresets() {
  return useQuery<AvatarPresetsResponse>({
    queryKey: ["avatar-presets"],
    queryFn: async () => {
      const { data } = await apiClient.get<AvatarPresetsResponse>("/auth/avatar-presets/");
      return data;
    },
    staleTime: 300_000,
  });
}

export function usePatchProfile() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, PatchProfilePayload>({
    mutationFn: async (payload) => {
      await apiClient.patch("/auth/me/profile/", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}
