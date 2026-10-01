import { useEffect } from "react";
import { CancelledError, useMutation, useQueryClient } from "@tanstack/react-query";
import type { MutateOptions, MutationFunctionContext, QueryKey } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";

export interface TeacherIdentity { id: string; epoch: number }
function eligibleTeacher(state: ReturnType<typeof useAuthStore.getState>) {
  return !state.isHydrating && state.accessToken && state.user?.role === "TEACHER" ? state.user.id : null;
}

// This derived, in-memory request identity never writes authentication state.
// A new sign-in receives a new epoch, including logout followed by the same teacher.
let epoch = 0;
const initialId = eligibleTeacher(useAuthStore.getState());
let currentIdentity: TeacherIdentity | null = initialId ? { id: initialId, epoch } : null;
useAuthStore.subscribe(state => {
  const id = eligibleTeacher(state);
  if (id !== (currentIdentity?.id ?? null)) {
    epoch += 1;
    currentIdentity = id ? { id, epoch } : null;
  }
});

export function useTeacherIdentity() {
  return useAuthStore(() => currentIdentity);
}
export function isCurrentTeacher(identity: TeacherIdentity | null): identity is TeacherIdentity {
  return identity !== null && identity === currentIdentity && eligibleTeacher(useAuthStore.getState()) === identity.id;
}
function assertCurrentTeacher(identity: TeacherIdentity | null): asserts identity is TeacherIdentity {
  if (!isCurrentTeacher(identity)) throw new CancelledError({ silent: true, revert: true });
}

export const teacherKeys = {
  root: (identity: TeacherIdentity | null) => ["teacher", identity?.id ?? null, identity?.epoch ?? null] as const,
  batches: (identity: TeacherIdentity | null) => [...teacherKeys.root(identity), "batches"] as const,
  rosters: (identity: TeacherIdentity | null) => [...teacherKeys.root(identity), "roster"] as const,
  roster: (identity: TeacherIdentity | null, id: string | undefined) => [...teacherKeys.rosters(identity), id] as const,
  matrices: (identity: TeacherIdentity | null) => [...teacherKeys.root(identity), "level-dashboard"] as const,
  matrix: (identity: TeacherIdentity | null, id: string) => [...teacherKeys.matrices(identity), id] as const,
};
export const teacherQueryDefaults = {
  staleTime: 1000 * 60 * 2,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: true,
  refetchInterval: false as const,
};

export async function teacherRequest<T>(
  identity: TeacherIdentity | null,
  request: (signal: AbortSignal) => Promise<T>,
  querySignal?: AbortSignal,
): Promise<T> {
  assertCurrentTeacher(identity);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (querySignal?.aborted) abort();
  querySignal?.addEventListener("abort", abort, { once: true });
  // Synchronous subscription also protects queued Axios request interceptors:
  // A's request cannot be issued using B's newly installed credentials.
  const unsubscribe = useAuthStore.subscribe(() => { if (!isCurrentTeacher(identity)) abort(); });
  try {
    if (controller.signal.aborted) throw new CancelledError({ silent: true, revert: true });
    const data = await request(controller.signal);
    assertCurrentTeacher(identity);
    if (controller.signal.aborted) throw new CancelledError({ silent: true, revert: true });
    return data;
  } catch (error) {
    if (!isCurrentTeacher(identity) || controller.signal.aborted) throw new CancelledError({ silent: true, revert: true });
    throw error;
  } finally {
    unsubscribe();
    querySignal?.removeEventListener("abort", abort);
  }
}

interface Issued<T> { identity: TeacherIdentity | null; variables: T }
export function useTeacherMutation<TData, TVariables>(
  request: (variables: TVariables, signal: AbortSignal) => Promise<TData>,
  invalidations: (identity: TeacherIdentity) => readonly QueryKey[],
) {
  const identity = useTeacherIdentity();
  const client = useQueryClient();
  const mutation = useMutation<TData, Error, Issued<TVariables>>({
    mutationFn: issued => teacherRequest(issued.identity, signal => request(issued.variables, signal)),
    onSuccess: async (_data, issued) => {
      if (isCurrentTeacher(issued.identity)) {
        await Promise.all(invalidations(issued.identity).map(queryKey => client.invalidateQueries({ queryKey })));
      }
    },
  });
  const { reset } = mutation;
  useEffect(() => { reset(); }, [identity, reset]);

  function guardedOptions(issued: Issued<TVariables>, options?: MutateOptions<TData, Error, TVariables, unknown>) {
    return {
      onSuccess: (data: TData, _variables: Issued<TVariables>, result: unknown, context: MutationFunctionContext) => {
        if (isCurrentTeacher(issued.identity)) options?.onSuccess?.(data, issued.variables, result, context);
      },
      onError: (error: Error, _variables: Issued<TVariables>, result: unknown, context: MutationFunctionContext) => {
        if (isCurrentTeacher(issued.identity)) options?.onError?.(error, issued.variables, result, context);
      },
      onSettled: (data: TData | undefined, error: Error | null, _variables: Issued<TVariables>, result: unknown, context: MutationFunctionContext) => {
        if (isCurrentTeacher(issued.identity)) options?.onSettled?.(data, error, issued.variables, result, context);
      },
    };
  }
  const belongs = mutation.variables?.identity === identity;
  return {
    data: belongs ? mutation.data : undefined,
    error: belongs ? mutation.error : null,
    isPending: belongs && mutation.isPending,
    isError: belongs && mutation.isError,
    isSuccess: belongs && mutation.isSuccess,
    isIdle: !belongs || mutation.isIdle,
    reset,
    mutate: (variables: TVariables, options?: MutateOptions<TData, Error, TVariables, unknown>) => {
      // Capture the rendered issuing identity before React Query queues mutationFn.
      const issued = { identity, variables };
      mutation.mutate(issued, guardedOptions(issued, options));
    },
    mutateAsync: async (variables: TVariables, options?: MutateOptions<TData, Error, TVariables, unknown>) => {
      const issued = { identity, variables };
      try {
        const data = await mutation.mutateAsync(issued, guardedOptions(issued, options));
        // onSuccess may await refetches after the HTTP response. Contain the
        // promise result as well as callbacks if the identity changed meanwhile.
        assertCurrentTeacher(issued.identity);
        return data;
      } catch (error) {
        assertCurrentTeacher(issued.identity);
        throw error;
      }
    },
  };
}
