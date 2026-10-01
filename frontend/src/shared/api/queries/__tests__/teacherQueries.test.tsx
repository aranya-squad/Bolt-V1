import type { ReactNode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/client";
import { useAuthStore } from "@/shared/store/authStore";
import { useBatches, useCreateBatch, usePatchBatch, useRotateJoinCode } from "../useBatches";
import { useRoster } from "../useRoster";
import { useTeacherLevelDashboard } from "../useTeacherLevelDashboard";
import { batch, matrix, teacherA, teacherB } from "@/features/teacher/__tests__/fixtures";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const clients: QueryClient[] = [];
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  return { client, wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> };
}
function useTeacherReads() {
  return { batches: useBatches(), roster: useRoster(batch.id), matrix: useTeacherLevelDashboard(matrix.level.id) };
}
beforeEach(() => { useAuthStore.setState({ user: teacherA, accessToken: "synthetic-a", isHydrating: false }); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.restoreAllMocks(); });

describe("teacher queries (mocked HTTP, not real API integration)", () => {
  it.each(["hydrating", "no-token", "logged-out", "student"])("does not fetch protected teacher data while %s", async state => {
    if (state === "hydrating") useAuthStore.setState({ isHydrating: true });
    if (state === "no-token") useAuthStore.setState({ accessToken: null });
    if (state === "logged-out") useAuthStore.setState({ user: null });
    if (state === "student") useAuthStore.setState({ user: { ...teacherA, role: "STUDENT" } });
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: [] });
    const view = renderHook(useTeacherReads, wrapper());
    await act(async () => { await Promise.resolve(); });
    expect(get).not.toHaveBeenCalled();
    expect(view.result.current.batches.data).toBeUndefined();
    expect(view.result.current.roster.data).toBeUndefined();
    expect(view.result.current.matrix.data).toBeUndefined();
  });

  it("isolates all three cached reads on A → logout → B and cancels delayed A responses", async () => {
    const pending = deferred<{ data: unknown }>();
    const get = vi.spyOn(apiClient, "get").mockImplementation(() => pending.promise);
    const { client, wrapper: provider } = wrapper();
    const view = renderHook(useTeacherReads, { wrapper: provider });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(3));
    const aSignals = get.mock.calls.map(([, options]) => options?.signal);
    act(() => useAuthStore.setState({ user: null, accessToken: null }));
    expect(view.result.current.batches.data).toBeUndefined();
    expect(view.result.current.roster.data).toBeUndefined();
    expect(view.result.current.matrix.data).toBeUndefined();
    get.mockImplementation(async url => ({ data: url.endsWith("roster/") ? [] : url.includes("dashboard/") ? { ...matrix, classes: [] } : [{ ...batch, id: "batch-b", name: "B only" }] }));
    act(() => useAuthStore.setState({ user: teacherB, accessToken: "synthetic-b" }));
    await waitFor(() => expect(view.result.current.batches.data?.[0].name).toBe("B only"));
    await act(async () => { pending.resolve({ data: [batch] }); await pending.promise; });
    expect(aSignals.every(signal => signal?.aborted)).toBe(true);
    expect(view.result.current.batches.data?.[0].name).toBe("B only");
    expect(view.result.current.roster.data).toEqual([]);
    expect(view.result.current.matrix.data?.classes).toEqual([]);
    expect(client.getQueryCache().findAll().filter(query => query.queryKey.includes(teacherB.id)).every(query => !JSON.stringify(query.state.data).includes("Morning batch"))).toBe(true);
  });

  it("always refetches on remount even when cached data is inside the two minute stale window", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: [batch] });
    const { wrapper: provider } = wrapper();
    const first = renderHook(useBatches, { wrapper: provider });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();
    get.mockResolvedValue({ data: [{ ...batch, student_count: 3 }] });
    const second = renderHook(useBatches, { wrapper: provider });
    await waitFor(() => expect(second.result.current.data?.[0].student_count).toBe(3));
    expect(get).toHaveBeenCalledTimes(2);
  });

  it.each(["create", "patch", "rotate"])("late %s completion neither calls A callbacks nor invalidates B", async kind => {
    const pending = deferred<{ data: typeof batch }>();
    vi.spyOn(apiClient, "post").mockImplementation(() => pending.promise);
    vi.spyOn(apiClient, "patch").mockImplementation(() => pending.promise);
    const { client, wrapper: provider } = wrapper();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const callbacks = { onSuccess: vi.fn(), onError: vi.fn(), onSettled: vi.fn() };
    const view = renderHook(() => ({ create: useCreateBatch(), patch: usePatchBatch(), rotate: useRotateJoinCode() }), { wrapper: provider });
    act(() => {
      if (kind === "create") view.result.current.create.mutate("New batch", callbacks);
      if (kind === "patch") view.result.current.patch.mutate({ id: batch.id, payload: { name: "New name" } }, callbacks);
      if (kind === "rotate") view.result.current.rotate.mutate(batch.id, callbacks);
    });
    await waitFor(() => expect(kind === "patch" ? apiClient.patch : apiClient.post).toHaveBeenCalledTimes(1));
    act(() => useAuthStore.setState({ user: null, accessToken: null }));
    act(() => useAuthStore.setState({ user: teacherB, accessToken: "synthetic-b" }));
    await act(async () => { pending.resolve({ data: batch }); await pending.promise; });
    expect(invalidate).not.toHaveBeenCalled();
    expect(callbacks.onSuccess).not.toHaveBeenCalled();
    expect(callbacks.onError).not.toHaveBeenCalled();
    expect(callbacks.onSettled).not.toHaveBeenCalled();
    expect(view.result.current.create.data).toBeUndefined();
    expect(view.result.current.patch.data).toBeUndefined();
    expect(view.result.current.rotate.data).toBeUndefined();
  });

  it("scopes successful owner mutation invalidations to issuing teacher and includes level matrices", async () => {
    vi.spyOn(apiClient, "patch").mockResolvedValue({ data: batch });
    const { client, wrapper: provider } = wrapper();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const success = vi.fn();
    const view = renderHook(usePatchBatch, { wrapper: provider });
    act(() => view.result.current.mutate({ id: batch.id, payload: { is_active: false } }, { onSuccess: success }));
    await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every(key => key?.includes(teacherA.id) && !key.includes(teacherB.id))).toBe(true);
    expect(keys.some(key => key?.includes("level-dashboard"))).toBe(true);
  });

  it("late A mutation failure cannot replace B's successful mutation state or call A error handlers", async () => {
    const aRequest = deferred<{ data: typeof batch }>();
    const post = vi.spyOn(apiClient, "post").mockImplementationOnce(() => aRequest.promise);
    post.mockResolvedValue({ data: { ...batch, id: "batch-b", name: "B created" } });
    const callbacks = { onError: vi.fn(), onSettled: vi.fn() };
    const view = renderHook(useCreateBatch, wrapper());
    act(() => view.result.current.mutate("A pending", callbacks));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    act(() => useAuthStore.setState({ user: null, accessToken: null }));
    act(() => useAuthStore.setState({ user: teacherB, accessToken: "synthetic-b" }));
    act(() => view.result.current.mutate("B created"));
    await waitFor(() => expect(view.result.current.data?.name).toBe("B created"));
    await act(async () => { aRequest.reject(new Error("Late A failure")); await aRequest.promise.catch(() => undefined); });
    expect(view.result.current.data?.name).toBe("B created");
    expect(view.result.current.error).toBeNull();
    expect(callbacks.onError).not.toHaveBeenCalled();
    expect(callbacks.onSettled).not.toHaveBeenCalled();
  });

  it("does not issue a queued A create with B credentials after an immediate account switch", async () => {
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({ data: batch });
    const success = vi.fn();
    const view = renderHook(useCreateBatch, wrapper());
    act(() => {
      view.result.current.mutate("A draft", { onSuccess: success });
      useAuthStore.setState({ user: teacherB, accessToken: "synthetic-b" });
    });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(post).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
  });
});
