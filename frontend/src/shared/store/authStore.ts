import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/shared/types";

interface AuthState {
  // Access token lives in memory only (not localStorage) for security
  accessToken: string | null;
  // User identity is persisted so the app knows if logged in across reloads
  user: User | null;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null, // never persisted — see partialize
      user: null,
      setAccessToken: (token) => set({ accessToken: token }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    {
      name: "bolt-auth",
      // Only persist user identity, not the access token
      partialize: (state) => ({ user: state.user }),
    }
  )
);
