import type { ReactNode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/client";
import { useAuthStore } from "@/shared/store/authStore";
import { teacherA, teacherB } from "@/features/teacher/__tests__/fixtures";
import { useTeacherCatalogue } from "../useTeacherCatalogue";

const clients: QueryClient[] = [];
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
  return function Wrapper({ children }: { children: ReactNode }) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; };
}
const level = { id: "30000000-0000-4000-8000-000000000001", name: "Start", order: 1, is_locked: true, is_completed: true };
const nextPage = new URL("/api/v1/levels/?page=2", window.location.origin).href;
beforeEach(() => useAuthStore.setState({ user: teacherA, accessToken: "synthetic-a", isHydrating: false }));
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.restoreAllMocks(); });

describe("teacher catalogue (mocked HTTP)", () => {
  it.each(["hydrating", "no-token", "logged-out", "student"])("does not fetch catalogue for %s", async state => {
    if (state === "hydrating") useAuthStore.setState({ isHydrating: true });
    if (state === "no-token") useAuthStore.setState({ accessToken: null });
    if (state === "logged-out") useAuthStore.setState({ user: null });
    if (state === "student") useAuthStore.setState({ user: { ...teacherA, role: "STUDENT" } });
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: { results: [] } });
    const view = renderHook(useTeacherCatalogue, { wrapper: wrapper() });
    await act(async () => { await Promise.resolve(); });
    expect(get).not.toHaveBeenCalled(); expect(view.result.current.data).toBeUndefined();
  });

  it("loads all pages using the same cancellation signal and exposes only sorted ID/name/order", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValueOnce({ data: { results: [{ ...level, order: 2, id: "two" }], next: nextPage } })
      .mockResolvedValueOnce({ data: { results: [level], next: null } });
    const view = renderHook(useTeacherCatalogue, { wrapper: wrapper() });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(get.mock.calls.map(([url]) => url)).toEqual(["/levels/", nextPage]);
    expect(get.mock.calls[0][1]?.signal).toBe(get.mock.calls[1][1]?.signal);
    expect(view.result.current.data).toEqual([{ id: level.id, name: "Start", order: 1 }, { id: "two", name: "Start", order: 2 }]);
    expect(view.result.current.data?.every(item => !Object.hasOwn(item, "is_locked") && !Object.hasOwn(item, "is_completed"))).toBe(true);
  });

  it("accepts a bare catalogue array without introducing user unlock state", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: [level] });
    const view = renderHook(useTeacherCatalogue, { wrapper: wrapper() });
    await waitFor(() => expect(view.result.current.data).toEqual([{ id: level.id, name: level.name, order: level.order }]));
  });

  it.each(["https://foreign.example.test/api/v1/levels/?page=2", "/api/v1/classes/", "/api/v1/levels/#fragment"])("rejects unsafe next %s before issuing it", async next => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: { results: [level], next } });
    const view = renderHook(useTeacherCatalogue, { wrapper: wrapper() });
    await waitFor(() => expect(view.result.current.isError).toBe(true));
    expect(get).toHaveBeenCalledTimes(1); expect(view.result.current.data).toBeUndefined();
  });

  it("rejects a pagination cycle instead of silently returning an incomplete catalogue", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: { results: [level], next: "/api/v1/levels/" } });
    const view = renderHook(useTeacherCatalogue, { wrapper: wrapper() });
    await waitFor(() => expect(view.result.current.isError).toBe(true));
    expect(get).toHaveBeenCalledTimes(1); expect(view.result.current.data).toBeUndefined();
  });

  it("cancels delayed A catalogue completion across logout and B sign-in", async () => {
    let resolve!: (value: { data: { results: typeof level[] } }) => void;
    const pending = new Promise<{ data: { results: typeof level[] } }>(done => { resolve = done; });
    const get = vi.spyOn(apiClient, "get").mockImplementationOnce(() => pending)
      .mockResolvedValue({ data: { results: [{ ...level, id: "b-level", name: "B catalogue" }] } });
    const view = renderHook(useTeacherCatalogue, { wrapper: wrapper() });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    const signal = get.mock.calls[0][1]?.signal;
    act(() => useAuthStore.setState({ user: null, accessToken: null }));
    expect(view.result.current.data).toBeUndefined();
    act(() => useAuthStore.setState({ user: teacherB, accessToken: "synthetic-b" }));
    await waitFor(() => expect(view.result.current.data?.[0].name).toBe("B catalogue"));
    await act(async () => { resolve({ data: { results: [level] } }); await pending; });
    expect(signal?.aborted).toBe(true); expect(view.result.current.data?.[0].name).toBe("B catalogue");
  });
});
