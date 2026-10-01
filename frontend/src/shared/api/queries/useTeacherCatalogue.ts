import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { Level } from "@/shared/types";
import { teacherKeys, teacherQueryDefaults, teacherRequest, useTeacherIdentity } from "./teacherIdentity";

export type TeacherCatalogueLevel = Pick<Level, "id" | "order" | "name">;
interface CataloguePage { results: Level[]; next?: string | null }

export function useTeacherCatalogue() {
  const identity = useTeacherIdentity();
  return useQuery({
    queryKey: teacherKeys.catalogue(identity),
    queryFn: ({ signal }) => teacherRequest(identity, async requestSignal => {
      const endpoint = new URL(`${apiClient.defaults.baseURL?.replace(/\/$/, "") || "/api/v1"}/levels/`, window.location.origin);
      const seen = new Set<string>();
      const levels = new Map<string, TeacherCatalogueLevel>();
      let next: string | null = "/levels/";
      while (next) {
        if (requestSignal.aborted) throw new Error("Teacher catalogue request was canceled.");
        const current: string = next === "/levels/" ? endpoint.href : next;
        if (seen.has(current)) throw new Error("Level catalogue pagination repeated a page.");
        seen.add(current);
        const data: CataloguePage | Level[] = (await apiClient.get<CataloguePage | Level[]>(next, { signal: requestSignal })).data;
        const rows: Level[] = Array.isArray(data) ? data : data.results;
        if (!Array.isArray(rows)) throw new Error("Level catalogue is unavailable.");
        // User-specific completion/unlock flags do not govern report assignment.
        for (const { id, order, name } of rows) levels.set(id, { id, order, name });
        const following: string | null | undefined = Array.isArray(data) ? null : data.next;
        if (following == null) { next = null; continue; }
        if (typeof following !== "string") throw new Error("Invalid level catalogue page.");
        const url: URL = new URL(following, current);
        if (url.origin !== endpoint.origin || url.pathname !== endpoint.pathname || url.username || url.password || url.hash) {
          throw new Error("Level catalogue next page must stay on the configured levels API.");
        }
        next = url.href;
      }
      return [...levels.values()].sort((first, second) => first.order - second.order);
    }, signal),
    enabled: !!identity,
    ...teacherQueryDefaults,
  });
}
