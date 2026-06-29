import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { Batch } from "@/shared/types";

const BATCHES_KEY = ["batches"] as const;

async function fetchBatches(): Promise<Batch[]> {
  const { data } = await apiClient.get<Batch[]>("/classes/");
  return data;
}

async function createBatch(name: string): Promise<Batch> {
  const { data } = await apiClient.post<Batch>("/classes/", { name });
  return data;
}

async function patchBatch(id: string, payload: Partial<Pick<Batch, "name" | "live_session_link" | "is_active">>): Promise<Batch> {
  const { data } = await apiClient.patch<Batch>(`/classes/${id}/`, payload);
  return data;
}

async function rotateJoinCode(id: string): Promise<{ join_code: string }> {
  const { data } = await apiClient.post<{ join_code: string }>(`/classes/${id}/rotate-code/`);
  return data;
}

async function joinClass(join_code: string): Promise<Batch> {
  const { data } = await apiClient.post<Batch>("/classes/join/", { join_code });
  return data;
}

export function useBatches() {
  return useQuery({ queryKey: BATCHES_KEY, queryFn: fetchBatches });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createBatch(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: BATCHES_KEY }),
  });
}

export function usePatchBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof patchBatch>[1] }) =>
      patchBatch(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: BATCHES_KEY }),
  });
}

export function useRotateJoinCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rotateJoinCode(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: BATCHES_KEY }),
  });
}

export function useJoinClass() {
  return useMutation({ mutationFn: (join_code: string) => joinClass(join_code) });
}
