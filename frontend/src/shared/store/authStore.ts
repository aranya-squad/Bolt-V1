import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearRecoveryStorage, hasStoredPending } from "./answerRecovery";
import { useSessionStore } from "./sessionStore";
import type { User } from "@/shared/types";

interface AuthState {
  // Access token lives in memory only (not localStorage) for security
  accessToken: string | null;
  // User identity is persisted so the app knows if logged in across reloads
  user: User | null;
  // True until the first refresh attempt completes — prevents ProtectedRoute flash
  isHydrating: boolean;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  setHydrated: () => void;
  logout: (discardConfirmed?: boolean) => boolean;
  expire: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null, // never persisted — see partialize
      user: null,
      isHydrating: true,
      setAccessToken: (token) => set({ accessToken: token }),
      setUser: (user) => {
        const previousId = useAuthStore.getState().user?.id ?? useSessionStore.getState().recovery?.userId;
        if (previousId && previousId !== user.id) {
          clearRecoveryStorage();
          useSessionStore.getState().clearSession();
        }
        clearRecoveryStorage(user.id);
        set({ user });
      },
      setHydrated: () => set({ isHydrating: false }),
      expire: () => {
        useSessionStore.getState().suspend();
        set({ accessToken: null, user: null, isHydrating: false });
      },
      logout: (discardConfirmed = false) => {
        const pending = useSessionStore.getState().recovery;
        if (!discardConfirmed && (pending?.pending.length || pending?.manifest || hasStoredPending()) && !window.confirm("Unsaved answers will be discarded if you sign out. Sign out anyway?")) return false;
        clearRecoveryStorage();
        useSessionStore.getState().clearSession();
        set({ accessToken: null, user: null, isHydrating: false });
        return true;
      },
    }),
    {
      name: "bolt-auth",
      // Only persist user identity, not the access token or hydration flag
      partialize: (state) => ({ user: state.user }),
    }
  )
);
