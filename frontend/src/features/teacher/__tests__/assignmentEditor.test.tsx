import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/client";
import { useAuthStore } from "@/shared/store/authStore";
import type { Batch, Level } from "@/shared/types";
import BatchDetailPage from "../BatchDetailPage";
import { CreateBatchModal } from "../CreateBatchModal";
import { batch, teacherA, teacherB } from "./fixtures";

vi.mock("@/shared/ui/AmbientScene", () => ({ AmbientScene: () => null }));
const levels: Level[] = [1, 2, 3].map(order => ({
  id: `30000000-0000-4000-8000-${String(order).padStart(12, "0")}`, order, name: `Topic ${order}`,
  description: "Synthetic", xp_threshold: 0, is_advanced: false, is_locked: true, is_completed: false,
}));
const savedBatch = { ...batch, assigned_level_ids: [levels[0].id] };
const clients: QueryClient[] = [];
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function setup(initial: Batch = savedBatch, available = levels, missing = false) {
  let currentBatch = initial;
  let catalogue = available;
  const otherBatch = { ...savedBatch, id: "batch-b", assigned_level_ids: [levels[1].id] };
  const get = vi.spyOn(apiClient, "get").mockImplementation(async url => {
    if (missing && url.endsWith("roster/")) throw { response: { status: 404 } };
    return { data: url === "/levels/" ? { results: catalogue } : url.endsWith("roster/") || missing ? [] : [currentBatch, otherBatch] };
  });
  const patch = vi.spyOn(apiClient, "patch").mockImplementation(async (_url, body) => {
    const ids = (body as { assigned_level_ids: string[] }).assigned_level_ids;
    currentBatch = { ...currentBatch, assigned_level_ids: catalogue.filter(level => ids.includes(level.id)).map(level => level.id) };
    return { data: currentBatch };
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  const view = render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/teacher/batch/${initial.id}`]}>
    <Link to="/teacher/batch/batch-b">Switch batch</Link>
    <Routes><Route path="/teacher/batch/:batchId" element={<BatchDetailPage />} /></Routes>
  </MemoryRouter></QueryClientProvider>);
  return { ...view, client, get, patch, batch: (next: Batch) => { currentBatch = next; }, catalogue: (next: Level[]) => { catalogue = next; } };
}
const checkbox = (order: number) => screen.getByRole("checkbox", { name: `Level ${order}: Topic ${order}` });
const saveButton = () => screen.getByRole("button", { name: "SAVE" });
async function loaded() { await screen.findByRole("checkbox", { name: "Level 3: Topic 3" }); await waitFor(() => expect(checkbox(3)).toBeEnabled()); }
async function refreshBatch() {
  fireEvent.click(screen.getByRole("button", { name: "REFRESH" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "REFRESH" })).toBeEnabled());
}
beforeEach(() => useAuthStore.setState({ user: teacherA, accessToken: "synthetic-a", isHydrating: false }));
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.restoreAllMocks(); });

describe("assigned level editor in existing BatchDetail (mocked HTTP)", () => {
  it("displays existing IDs and lets a teacher save noncontiguous locked catalogue levels; success uses server canonical order", async () => {
    const test = setup(); await loaded();
    expect(checkbox(1)).toBeChecked(); expect(checkbox(2)).not.toBeChecked();
    expect(saveButton()).toBeDisabled();
    fireEvent.click(checkbox(1)); fireEvent.click(checkbox(3)); fireEvent.click(checkbox(1));
    fireEvent.click(saveButton());
    await screen.findByText("Assigned levels saved.");
    expect(test.patch.mock.calls[0].slice(0, 2)).toEqual([`/classes/${batch.id}/`, { assigned_level_ids: [levels[2].id, levels[0].id] }]);
    expect(checkbox(1)).toBeChecked(); expect(checkbox(3)).toBeChecked(); expect(saveButton()).toBeDisabled();
    expect(screen.queryByText(/locked/i)).not.toBeInTheDocument();
  });

  it("clears all assignments intentionally using []", async () => {
    const test = setup(); await loaded();
    fireEvent.click(checkbox(1)); fireEvent.click(saveButton());
    await screen.findByText("Assigned levels saved.");
    expect(test.patch.mock.calls[0][1]).toEqual({ assigned_level_ids: [] });
    expect(checkbox(1)).not.toBeChecked();
  });

  it("dirty drafts survive background batch refresh; Cancel uses the latest confirmed saved set", async () => {
    const test = setup(); await loaded();
    fireEvent.click(checkbox(3));
    test.batch({ ...savedBatch, assigned_level_ids: [levels[1].id] });
    await refreshBatch();
    expect(checkbox(1)).toBeChecked(); expect(checkbox(3)).toBeChecked(); expect(checkbox(2)).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "CANCEL" }));
    expect(checkbox(1)).not.toBeChecked(); expect(checkbox(2)).toBeChecked(); expect(checkbox(3)).not.toBeChecked();
    expect(saveButton()).toBeDisabled();
    expect(test.patch).not.toHaveBeenCalled();
  });

  it.each(["field", "generic"])("%s save failure retains edits and supports retry without a success claim", async kind => {
    const test = setup(); await loaded();
    test.patch.mockRejectedValueOnce(kind === "field" ? { response: { data: { assigned_level_ids: { 0: ["Level was removed."] } } } } : new Error("Lost response"));
    fireEvent.click(checkbox(3)); fireEvent.click(saveButton());
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent(kind === "field" ? "Level was removed." : "Could not save assigned levels.");
    expect(checkbox(1)).toBeChecked(); expect(checkbox(3)).toBeChecked();
    expect(screen.queryByText("Assigned levels saved.")).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
    fireEvent.click(saveButton()); await screen.findByText("Assigned levels saved.");
    expect(test.patch).toHaveBeenCalledTimes(2);
  });

  it("disables duplicate submission and selection changes while the response is pending", async () => {
    const test = setup(); await loaded();
    const pending = deferred<{ data: Batch }>();
    test.patch.mockImplementationOnce(() => pending.promise);
    fireEvent.click(checkbox(3)); fireEvent.click(saveButton());
    await waitFor(() => expect(screen.getByRole("button", { name: "SAVING…" })).toBeDisabled());
    expect(checkbox(1)).toBeDisabled(); expect(screen.getByRole("button", { name: "CANCEL" })).toBeDisabled();
    expect(screen.queryByText("Assigned levels saved.")).not.toBeInTheDocument();
    test.batch({ ...savedBatch, assigned_level_ids: [levels[0].id, levels[2].id] });
    await act(async () => { pending.resolve({ data: { ...savedBatch, assigned_level_ids: [levels[0].id, levels[2].id] } }); });
    await screen.findByText("Assigned levels saved.");
    expect(test.patch).toHaveBeenCalledTimes(1);
  });

  it("missing backend capability disables saving and never infers []", async () => {
    const test = setup(batch);
    await screen.findByText(/Assigned-level editing is unavailable/);
    expect(saveButton()).toBeDisabled(); expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(test.patch).not.toHaveBeenCalled();
  });

  it("a PATCH response missing capability cannot claim saved", async () => {
    const test = setup(); await loaded();
    test.patch.mockResolvedValueOnce({ data: batch });
    fireEvent.click(checkbox(3)); fireEvent.click(saveButton());
    await screen.findByText(/Assigned-level editing is unavailable/);
    expect(screen.queryByText("Assigned levels saved.")).not.toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("a confirmed saved ID absent from the catalogue disables Save rather than discarding it", async () => {
    setup({ ...savedBatch, assigned_level_ids: ["removed-level"] });
    await screen.findByText("A saved level is missing from the catalogue. Refresh levels before saving.");
    expect(saveButton()).toBeDisabled(); expect(screen.getByRole("button", { name: "RETRY LEVELS" })).toBeEnabled();
  });

  it("a saved 51st level on the next catalogue page remains available and selectable", async () => {
    const many = Array.from({ length: 51 }, (_, index) => ({ ...levels[0], id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, order: index + 1, name: `Topic ${index + 1}` }));
    const saved = { ...savedBatch, assigned_level_ids: [many[50].id] };
    const test = setup(saved, many);
    const next = new URL("/api/v1/levels/?page=2", window.location.origin).href;
    test.get.mockImplementation(async url => ({ data: url === "/levels/" ? { results: many.slice(0, 50), next } : url === next ? { results: many.slice(50), next: null } : url.endsWith("roster/") ? [] : [saved] }));
    const last = await screen.findByRole("checkbox", { name: "Level 51: Topic 51" });
    await waitFor(() => expect(last).toBeEnabled()); expect(last).toBeChecked();
    expect(screen.queryByText(/saved level is missing/)).not.toBeInTheDocument();
    fireEvent.click(checkbox(1)); expect(saveButton()).toBeEnabled();
    expect(test.get.mock.calls.some(([url]) => url === next)).toBe(true);
  });

  it("catalogue deletion of an unsaved selection sends the complete draft and preserves its field failure", async () => {
    const test = setup(); await loaded(); fireEvent.click(checkbox(3));
    test.catalogue(levels.slice(0, 2));
    await act(async () => { await test.client.invalidateQueries({ predicate: query => query.queryKey.includes("level-catalogue") }); });
    await waitFor(() => expect(screen.queryByRole("checkbox", { name: "Level 3: Topic 3" })).not.toBeInTheDocument());
    test.patch.mockRejectedValueOnce({ response: { data: { assigned_level_ids: ["Unknown selected level."] } } });
    fireEvent.click(saveButton()); await screen.findByText("Unknown selected level.");
    expect(test.patch.mock.calls[0][1]).toEqual({ assigned_level_ids: [levels[0].id, levels[2].id] });
    expect(screen.queryByText("Assigned levels saved.")).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it("catalogue failure prevents Save and can be retried", async () => {
    const test = setup();
    test.get.mockImplementation(async url => { if (url === "/levels/") throw new Error("Unavailable"); return { data: url.endsWith("roster/") ? [] : [savedBatch] }; });
    await screen.findByText("Failed to load levels. Retry before saving.");
    expect(saveButton()).toBeDisabled();
    test.get.mockImplementation(async url => ({ data: url === "/levels/" ? { results: levels } : [] }));
    fireEvent.click(screen.getByRole("button", { name: "RETRY LEVELS" }));
    await loaded(); expect(checkbox(1)).toBeChecked();
  });

  it("catalogue loading prevents Save until current options are available", async () => {
    const test = setup(); const pending = deferred<{ data: { results: Level[] } }>();
    test.get.mockImplementation(async url => url === "/levels/" ? pending.promise : { data: url.endsWith("roster/") ? [] : [savedBatch] });
    await screen.findByText("Loading levels…");
    expect(saveButton()).toBeDisabled(); expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    await act(async () => { pending.resolve({ data: { results: levels } }); });
    await loaded(); expect(checkbox(1)).toBeChecked();
  });

  it("batch refresh failure disables saving but retains the dirty draft", async () => {
    const test = setup(); await loaded(); fireEvent.click(checkbox(3));
    test.get.mockImplementation(async url => { if (url === "/classes/") throw new Error("Unavailable"); return { data: url === "/levels/" ? { results: levels } : [] }; });
    await refreshBatch();
    await screen.findByRole("alert"); expect(saveButton()).toBeDisabled();
    expect(checkbox(3)).toBeChecked(); expect(checkbox(3)).toBeDisabled();
    expect(test.patch).not.toHaveBeenCalled();
  });

  it("a lost write response reconciles on Refresh without inventing a successful write receipt", async () => {
    const test = setup(); await loaded(); fireEvent.click(checkbox(3));
    test.patch.mockImplementationOnce(async () => {
      test.batch({ ...savedBatch, assigned_level_ids: [levels[0].id, levels[2].id] });
      throw new Error("Committed response lost");
    });
    fireEvent.click(saveButton()); await screen.findByRole("alert");
    expect(screen.queryByText("Assigned levels saved.")).not.toBeInTheDocument();
    await refreshBatch();
    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(checkbox(1)).toBeChecked(); expect(checkbox(3)).toBeChecked();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Assigned levels saved.")).not.toBeInTheDocument();
    expect(test.patch).toHaveBeenCalledTimes(1);
  });

  it("an empty catalogue and empty saved selection are valid and unchanged", async () => {
    setup({ ...savedBatch, assigned_level_ids: [] }, []);
    await screen.findByText("No levels are available yet. An empty assignment is valid.");
    expect(saveButton()).toBeDisabled(); expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("switching batch resets the draft to that batch's persisted IDs", async () => {
    setup(); await loaded(); fireEvent.click(checkbox(3));
    fireEvent.click(screen.getByRole("link", { name: "Switch batch" }));
    await waitFor(() => expect(checkbox(2)).toBeChecked());
    expect(checkbox(1)).not.toBeChecked(); expect(checkbox(3)).not.toBeChecked(); expect(saveButton()).toBeDisabled();
  });

  it("late A assignment response cannot affect B's batch/editor or render a saved claim", async () => {
    const test = setup(); await loaded(); fireEvent.click(checkbox(3));
    const pending = deferred<{ data: Batch }>(); test.patch.mockImplementationOnce(() => pending.promise);
    fireEvent.click(saveButton()); await waitFor(() => expect(test.patch).toHaveBeenCalled());
    test.batch({ ...savedBatch, assigned_level_ids: [levels[1].id], name: "B batch" });
    act(() => useAuthStore.setState({ user: null, accessToken: null }));
    act(() => useAuthStore.setState({ user: teacherB, accessToken: "synthetic-b" }));
    await screen.findByText("B batch"); await waitFor(() => expect(checkbox(2)).toBeChecked());
    await act(async () => { pending.resolve({ data: { ...savedBatch, assigned_level_ids: [levels[0].id, levels[2].id] } }); });
    expect(checkbox(1)).not.toBeChecked(); expect(checkbox(3)).not.toBeChecked();
    expect(screen.queryByText("Assigned levels saved.")).not.toBeInTheDocument();
  });

  it("a missing/foreign batch never exposes assignment controls", async () => {
    setup(savedBatch, levels, true);
    await screen.findByRole("alert");
    expect(screen.queryByRole("group", { name: "Assigned levels" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});

it("name-only create renders a truthful generic API error and does not close on failure", async () => {
  const post = vi.spyOn(apiClient, "post").mockRejectedValue(new Error("Synthetic failed request"));
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } }); clients.push(client);
  render(<QueryClientProvider client={client}><CreateBatchModal onClose={onClose} /></QueryClientProvider>);
  fireEvent.change(screen.getByPlaceholderText("e.g. Grade 3 — Morning"), { target: { value: "New batch" } });
  fireEvent.click(screen.getByRole("button", { name: "CREATE" }));
  await screen.findByText("Could not create the batch. Please try again.");
  expect(post.mock.calls[0][1]).toEqual({ name: "New batch" });
  expect(onClose).not.toHaveBeenCalled();
  expect(within(screen.getByRole("button", { name: "CREATE" }).closest("form")!).queryByRole("checkbox")).not.toBeInTheDocument();
});
