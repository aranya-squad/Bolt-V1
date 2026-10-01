import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { Level } from "@/shared/types";
import { teacherKeys, teacherQueryDefaults, teacherRequest, useTeacherIdentity } from "./teacherIdentity";

export type TeacherCatalogueLevel = Pick<Level, "id" | "order" | "name">;

export function useTeacherCatalogue() {
  const identity = useTeacherIdentity();
  return useQuery({
    queryKey: teacherKeys.catalogue(identity),
    queryFn: ({ signal }) => teacherRequest(identity, async requestSignal => {
      const { data } = await apiClient.get<{ results: Level[] }>("/levels/", { signal: requestSignal });
      // User-specific completion/unlock flags do not govern report assignment.
      return data.results.map(({ id, order, name }): TeacherCatalogueLevel => ({ id, order, name }))
        .sort((first, second) => first.order - second.order);
    }, signal),
    enabled: !!identity,
    ...teacherQueryDefaults,
  });
}
