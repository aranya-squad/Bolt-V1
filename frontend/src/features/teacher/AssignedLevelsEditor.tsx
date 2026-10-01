import { useEffect, useState } from "react";
import { usePatchBatch } from "@/shared/api/queries/useBatches";
import { useTeacherCatalogue } from "@/shared/api/queries/useTeacherCatalogue";
import { BoltButton } from "@/shared/ui/BoltButton";
import { GlassCard } from "@/shared/ui/GlassCard";
import type { Batch } from "@/shared/types";

function sameSelection(first: string[], second: string[]) {
  return first.length === second.length && first.every(id => second.includes(id));
}
function messages(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(messages);
  if (value && typeof value === "object") return Object.values(value).flatMap(messages);
  return [];
}
function assignmentError(error: unknown) {
  const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
  return messages(data?.assigned_level_ids).join(" ") || messages(data?.detail).join(" ") || "Could not save assigned levels. Your edits are retained; try again.";
}

export function AssignedLevelsEditor({ batch, batchUnavailable }: { batch: Batch; batchUnavailable: boolean }) {
  const catalogue = useTeacherCatalogue();
  const mutation = usePatchBatch();
  const ids = batch.assigned_level_ids;
  const capability = Array.isArray(ids) && ids.every(id => typeof id === "string");
  const [form, setForm] = useState({
    confirmed: capability ? [...ids] : [], draft: capability ? [...ids] : [], saved: false, incompatible: false,
  });

  useEffect(() => {
    if (!Array.isArray(ids)) return;
    setForm(previous => {
      if (sameSelection(previous.confirmed, ids)) return previous;
      const dirty = !sameSelection(previous.draft, previous.confirmed);
      return { ...previous, confirmed: [...ids], draft: dirty ? previous.draft : [...ids], saved: false };
    });
  }, [ids]);
  const { reset, isError: saveFailed } = mutation;
  useEffect(() => {
    // A lost response can be reconciled by a later read of the persisted set.
    // Clear the earlier write error without inventing a successful PATCH receipt.
    if (saveFailed && Array.isArray(ids) && sameSelection(form.draft, ids)) reset();
  }, [ids, form.draft, saveFailed, reset]);

  const levels = catalogue.data;
  const dirty = !sameSelection(form.draft, form.confirmed);
  const missingSaved = levels !== undefined && form.confirmed.some(id => !levels.some(level => level.id === id));
  const unavailable = !capability || form.incompatible;
  const blocked = unavailable || batchUnavailable || catalogue.isPending || catalogue.isFetching || catalogue.isError || missingSaved;

  function change(id: string, checked: boolean) {
    mutation.reset();
    setForm(previous => ({ ...previous, draft: checked ? [...previous.draft, id] : previous.draft.filter(selected => selected !== id), saved: false }));
  }
  function cancel() {
    mutation.reset();
    setForm(previous => ({ ...previous, draft: [...previous.confirmed], saved: false }));
  }
  function save() {
    if (blocked || !dirty || mutation.isPending || !levels) return;
    setForm(previous => ({ ...previous, saved: false }));
    // Send the complete draft. A changed catalogue cannot silently trim an
    // unsaved selection; the server validates IDs and returns canonical order.
    mutation.mutate({ id: batch.id, payload: { assigned_level_ids: [...form.draft] } }, {
      onSuccess: persisted => {
        const saved = persisted.assigned_level_ids;
        if (!Array.isArray(saved) || !saved.every(id => typeof id === "string")) {
          setForm(previous => ({ ...previous, incompatible: true, saved: false }));
          return;
        }
        setForm({ confirmed: [...saved], draft: [...saved], saved: true, incompatible: false });
      },
    });
  }

  return (
    <GlassCard style={{ padding: "var(--s-xl)", marginBottom: "var(--s-xl)" }}>
      <fieldset aria-label="Assigned levels" style={{ padding: 0, margin: 0, border: 0 }}>
        <legend className="t-h2" style={{ color: "var(--fg-bone)", marginBottom: "var(--s-sm)" }}>Assigned levels</legend>
        <p className="t-body-sm" style={{ color: "var(--fg-muted)" }}>Choose the levels shown in this batch&apos;s completion reports.</p>
        {unavailable && <p role="status" style={{ color: "var(--fg-muted)" }}>Assigned-level editing is unavailable with the current server version. Refresh after the server is updated.</p>}
        {!unavailable && catalogue.isPending && <p role="status">Loading levels…</p>}
        {!unavailable && catalogue.isError && <p role="alert" style={{ color: "var(--err)" }}>Failed to load levels. Retry before saving.</p>}
        {!unavailable && missingSaved && <p role="alert" style={{ color: "var(--err)" }}>A saved level is missing from the catalogue. Refresh levels before saving.</p>}
        {!unavailable && (catalogue.isError || missingSaved) && (
          <BoltButton variant="ghost" size="sm" disabled={catalogue.isFetching} onClick={() => { void catalogue.refetch(); }}>RETRY LEVELS</BoltButton>
        )}
        {!unavailable && levels && levels.length === 0 && !catalogue.isError && <p>No levels are available yet. An empty assignment is valid.</p>}
        {!unavailable && levels && (
          <div style={{ display: "grid", gap: "var(--s-sm)", margin: "var(--s-md) 0" }}>
            {levels.map(level => (
              <label key={level.id} style={{ display: "flex", alignItems: "center", gap: "var(--s-sm)", color: "var(--fg-bone)" }}>
                <input type="checkbox" checked={form.draft.includes(level.id)} disabled={blocked || mutation.isPending}
                  onChange={event => change(level.id, event.target.checked)} />
                Level {level.order}: {level.name}
              </label>
            ))}
          </div>
        )}
        {mutation.error && <p role="alert" style={{ color: "var(--err)" }}>{assignmentError(mutation.error)}</p>}
        {form.saved && <p role="status" style={{ color: "var(--ok-50)" }}>Assigned levels saved.</p>}
        <div style={{ display: "flex", gap: "var(--s-sm)", marginTop: "var(--s-md)", flexWrap: "wrap" }}>
          <BoltButton variant="primary" size="sm" disabled={blocked || !dirty || mutation.isPending} onClick={save}>
            {mutation.isPending ? "SAVING…" : "SAVE"}
          </BoltButton>
          <BoltButton variant="ghost" size="sm" disabled={!dirty || mutation.isPending} onClick={cancel}>CANCEL</BoltButton>
        </div>
      </fieldset>
    </GlassCard>
  );
}
