import { useRef, useState } from "react";
import { Page } from "@/shared/ui/Page";
import { BoltButton } from "@/shared/ui/BoltButton";
import { GlassCard } from "@/shared/ui/GlassCard";
import { apiClient } from "@/shared/api/client";

interface SheetResult {
  sheet: string;
  level: number;
  class: number;
  imported: number;
  replaced: number;
  skipped: string[];
}

interface ImportResult {
  sheets: SheetResult[];
  total_sheets: number;
}

export default function AdminImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await apiClient.post<ImportResult>("/admin/import-questions/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Import failed. Check the file format and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <h1 className="t-h1" style={{ color: "var(--y-bolt)", marginBottom: "var(--s-xl)" }}>
        QUESTION IMPORT
      </h1>

      <GlassCard style={{ maxWidth: 600, padding: "var(--s-xl)" }}>
        <p className="t-body-sm" style={{ color: "var(--fg-sand)", marginBottom: "var(--s-lg)" }}>
          Upload the BOLT ALL LEVELS DATASET (.xlsx). Each sheet named "L{"{n}"} C{"{m}"}" is
          imported as Level n, Class m. Existing questions for those classes are replaced.
        </p>

        <div style={{ display: "flex", gap: "var(--s-md)", alignItems: "center", marginBottom: "var(--s-lg)" }}>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ flex: 1, color: "var(--fg-bone)" }}
          />
          <BoltButton
            variant="primary"
            size="md"
            onClick={handleImport}
            disabled={loading}
          >
            {loading ? "IMPORTING…" : "IMPORT"}
          </BoltButton>
        </div>

        {error && (
          <p style={{ color: "var(--err)", fontSize: "0.9rem" }}>{error}</p>
        )}

        {result && (
          <div>
            <p
              className="t-label"
              style={{ color: "var(--ok-50)", marginBottom: "var(--s-md)" }}
            >
              {result.total_sheets} sheets imported
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-sm)" }}>
              {result.sheets.map((s) => (
                <div
                  key={s.sheet}
                  style={{
                    padding: "var(--s-sm) var(--s-md)",
                    borderRadius: "var(--r-md)",
                    background: "var(--glass-05)",
                    border: "1px solid var(--glass-10)",
                  }}
                >
                  <span className="t-label" style={{ color: "var(--fg-bone)" }}>
                    {s.sheet}
                  </span>
                  <span
                    className="t-body-sm"
                    style={{ color: "var(--fg-sand)", marginLeft: 12 }}
                  >
                    {s.imported} imported, {s.replaced} replaced
                    {s.skipped.length > 0 && `, ${s.skipped.length} skipped`}
                  </span>
                  {s.skipped.length > 0 && (
                    <ul style={{ margin: "4px 0 0 16px", fontSize: "0.75rem", color: "var(--err)" }}>
                      {s.skipped.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassCard>
    </Page>
  );
}
