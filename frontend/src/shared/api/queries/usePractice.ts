import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { SessionMeta } from "@/shared/types";

export interface PracticeConfig {
  mode: string;
  operation: string;
  digits: number;
  rows: number;
  question_count: number;
  time_limit_sec: number;
  flash_speed_ms?: number;
  digits_row1?: number;
  digits_row2?: number;
}

export function useStartPractice() {
  return useMutation<SessionMeta, Error, PracticeConfig>({
    mutationFn: async (config) => {
      const { data } = await apiClient.post<SessionMeta>("/practice/start/", config);
      return data;
    },
  });
}
