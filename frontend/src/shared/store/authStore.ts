import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null, // never persisted — see partialize
      user: null,
      isHydrating: true,
      setAccessToken: (token) => set({ accessToken: token }),
      setUser: (user) => set({ user }),
      setHydrated: () => set({ isHydrating: false }),
      logout: () => set({ accessToken: null, user: null, isHydrating: false }),
    }),
    {
      name: "bolt-auth",
      // Only persist user identity, not the access token or hydration flag
      partialize: (state) => ({ user: state.user }),
    }
  )
);
