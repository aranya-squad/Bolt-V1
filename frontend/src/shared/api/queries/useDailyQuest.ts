import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import { useAuthStore } from "@/shared/store/authStore";
import type { DailyQuestToday, SessionMeta } from "@/shared/types";

export const DAILY_QUEST_QUERY_KEY = ["daily-quests"] as const;

export function useDailyQuest() {
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.accessToken);
  const hydrating = useAuthStore(s => s.isHydrating);
  const client = useQueryClient();
  const enabled = user?.role === "STUDENT" && !!token && !hydrating;
  const query = useQuery<DailyQuestToday>({
    queryKey: [...DAILY_QUEST_QUERY_KEY, user?.id],
    queryFn: async ({ signal }) => (await apiClient.get<DailyQuestToday>("/daily-quests/today/", { signal, timeout: 10000 })).data,
    enabled,
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
  useEffect(() => useAuthStore.subscribe((next, previous) => {
    if (next.user?.id !== previous.user?.id || !next.accessToken) {
      void client.cancelQueries({ queryKey: DAILY_QUEST_QUERY_KEY });
      client.removeQueries({ queryKey: DAILY_QUEST_QUERY_KEY });
    }
  }), [client]);
  const { refetch, data } = query;
  useEffect(() => {
    if (!enabled || !data) return;
    // Delay comes from the server's interval, not the device's calendar or clock.
    const delay = Date.parse(data.reset_at) - Date.parse(data.server_now);
    if (!Number.isFinite(delay) || delay <= 0) return;
    let timer: number | undefined;
    const schedule = () => {
      if (document.visibilityState === "hidden") return;
      timer = window.setTimeout(() => { void refetch(); }, Math.min(delay, 2147483647));
    };
    const onReturn = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    schedule();
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [enabled, data, refetch]);
  return { ...query, data: enabled ? data : undefined, enabled };
}

export function useStartDailyQuest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (missionId: string) => {
      const identity = useAuthStore.getState().user?.id;
      const { data } = await apiClient.post<SessionMeta>(`/daily-quests/${encodeURIComponent(missionId)}/start/`, {}, { timeout: 10000 });
      if (!identity || identity !== useAuthStore.getState().user?.id || !useAuthStore.getState().accessToken) throw new Error("Sign in again to open your mission.");
      if (data.daily_quest?.id !== missionId || data.daily_quest.session_id !== data.session_id) throw new Error("Mission response is incompatible. Retry to recover the same mission.");
      client.setQueryData(["sessions", identity, data.session_id], data);
      void client.invalidateQueries({ queryKey: DAILY_QUEST_QUERY_KEY });
      return data;
    },
  });
}
