import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/client";
import { useAuthStore } from "@/shared/store/authStore";
import TeacherDashboardPage from "../TeacherDashboardPage";
import BatchDetailPage from "../BatchDetailPage";
import TeacherLevelDashboardPage from "../TeacherLevelDashboardPage";
import { batch, matrix, roster, teacherA } from "./fixtures";

const clients: QueryClient[] = [];
function page(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/teacher" element={<TeacherDashboardPage />} />
    <Route path="/teacher/batch/:batchId" element={<BatchDetailPage />} />
    <Route path="/teacher/level/:levelId" element={<TeacherLevelDashboardPage />} />
  </Routes></MemoryRouter></QueryClientProvider>);
}
function successfulReads() {
  return vi.spyOn(apiClient, "get").mockImplementation(async url => ({
    data: url === "/levels/" ? { results: [] } : url.endsWith("roster/") ? roster : url.includes("dashboard/") ? matrix : [batch],
  }));
}
beforeEach(() => useAuthStore.setState({ user: teacherA, accessToken: "synthetic-a", isHydrating: false }));
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.restoreAllMocks(); });

describe("existing teacher screens (mocked HTTP)", () => {
  it("attaches matrix values by lesson ID, renders absent values as zero and ignores unrelated rows", async () => {
    successfulReads(); page(`/teacher/level/${matrix.level.id}`);
    const first = await screen.findByText("First topic");
    expect(within(first.closest("tr")!).getAllByRole("cell").map(cell => cell.textContent)).toEqual(["First topic", "1/2", "0/2"]);
    expect(within(screen.getByText("Second topic").closest("tr")!).getAllByRole("cell").map(cell => cell.textContent)).toEqual(["Second topic", "2/2", "1/2"]);
    expect(within(screen.getByText("Missing topic").closest("tr")!).getAllByRole("cell").map(cell => cell.textContent)).toEqual(["Missing topic", "0/2", "0/2"]);
    expect(screen.queryByText("99/2")).not.toBeInTheDocument();
  });

  it.each(["dashboard", "roster", "matrix"])("%s explicit Refresh preserves content during refresh, exposes failure and retries", async kind => {
    const get = successfulReads();
    const path = kind === "dashboard" ? "/teacher" : kind === "roster" ? `/teacher/batch/${batch.id}` : `/teacher/level/${matrix.level.id}`;
    page(path);
    await screen.findByText(kind === "roster" ? "Comet" : "Morning batch");
    await waitFor(() => expect(screen.getByRole("button", { name: "REFRESH" })).toBeEnabled());
    const fail: ((error: Error) => void)[] = [];
    get.mockImplementation(() => new Promise((_resolve, reject) => { fail.push(reject); }));
    fireEvent.click(screen.getByRole("button", { name: "REFRESH" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "REFRESHING…" })).toBeDisabled());
    expect(screen.getByText(kind === "roster" ? "Comet" : "Morning batch")).toBeInTheDocument();
    // BatchDetail refreshes two independent reads; reject both synthetic requests.
    get.mockRejectedValue(new Error("Synthetic network failure"));
    await act(async () => { fail.forEach(reject => reject(new Error("Synthetic network failure"))); });
    await screen.findByRole("alert");
    expect(screen.getByText(kind === "roster" ? "Comet" : "Morning batch")).toBeInTheDocument();
    get.mockImplementation(async url => ({ data: url.endsWith("roster/") ? [{ ...roster[0], accuracy_pct: 91 }] : url.includes("dashboard/") ? { ...matrix, classes: [] } : [{ ...batch, student_count: 3 }] }));
    fireEvent.click(screen.getByRole("button", { name: "REFRESH" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    if (kind === "roster") expect(await screen.findByText("91%")).toBeInTheDocument();
    if (kind === "matrix") expect(await screen.findByText("No classes have this level assigned.")).toBeInTheDocument();
    if (kind === "dashboard") expect(await screen.findByText("3 students")).toBeInTheDocument();
  });

  it("preserves null accuracy and distinct active-roster empty state", async () => {
    const get = successfulReads(); page(`/teacher/batch/${batch.id}`);
    const first = await screen.findByText("Comet");
    expect(within(first.closest("tr")!).getByText("—")).toBeInTheDocument();
    expect(screen.getByText("82.5%")).toBeInTheDocument();
    get.mockImplementation(async url => ({ data: url.endsWith("roster/") ? [] : [batch] }));
    fireEvent.click(screen.getByRole("button", { name: "REFRESH" }));
    expect(await screen.findByText("No students yet")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(["dashboard", "roster", "matrix"])("%s initial failure offers retry without showing a false empty state", async kind => {
    vi.spyOn(apiClient, "get").mockRejectedValue(new Error("Synthetic unavailable"));
    page(kind === "dashboard" ? "/teacher" : kind === "roster" ? `/teacher/batch/${batch.id}` : `/teacher/level/${matrix.level.id}`);
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "REFRESH" })).toBeEnabled();
    expect(screen.queryByText("No students yet")).not.toBeInTheDocument();
    expect(screen.queryByText("No batches yet")).not.toBeInTheDocument();
    expect(screen.queryByText("No classes have this level assigned.")).not.toBeInTheDocument();
  });
});
