import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { Batch } from "@/shared/types";
import { teacherKeys, teacherQueryDefaults, teacherRequest, useTeacherIdentity, useTeacherMutation } from "./teacherIdentity";

async function fetchBatches(signal: AbortSignal): Promise<Batch[]> {
  const { data } = await apiClient.get<Batch[]>("/classes/", { signal });
  return data;
}

async function createBatch(name: string, signal: AbortSignal): Promise<Batch> {
  const { data } = await apiClient.post<Batch>("/classes/", { name }, { signal });
  return data;
}

async function patchBatch(id: string, payload: Partial<Pick<Batch, "name" | "live_session_link" | "is_active">>, signal: AbortSignal): Promise<Batch> {
  const { data } = await apiClient.patch<Batch>(`/classes/${id}/`, payload, { signal });
  return data;
}

async function rotateJoinCode(id: string, signal: AbortSignal): Promise<{ join_code: string }> {
  const { data } = await apiClient.post<{ join_code: string }>(`/classes/${id}/rotate-code/`, undefined, { signal });
  return data;
}

async function joinClass(join_code: string): Promise<Batch> {
  const { data } = await apiClient.post<Batch>("/classes/join/", { join_code });
  return data;
}

export function useBatches() {
  const identity = useTeacherIdentity();
  return useQuery({
    queryKey: teacherKeys.batches(identity),
    queryFn: ({ signal }) => teacherRequest(identity, fetchBatches, signal),
    enabled: !!identity,
    ...teacherQueryDefaults,
  });
}

export function useCreateBatch() {
  return useTeacherMutation(createBatch, identity => [teacherKeys.batches(identity), teacherKeys.matrices(identity)]);
}

export function usePatchBatch() {
  return useTeacherMutation(
    ({ id, payload }: { id: string; payload: Parameters<typeof patchBatch>[1] }, signal) => patchBatch(id, payload, signal),
    identity => [teacherKeys.batches(identity), teacherKeys.rosters(identity), teacherKeys.matrices(identity)],
  );
}

export function useRotateJoinCode() {
  return useTeacherMutation(rotateJoinCode, identity => [teacherKeys.batches(identity)]);
}

export function useJoinClass() {
  return useMutation({ mutationFn: (join_code: string) => joinClass(join_code) });
}
