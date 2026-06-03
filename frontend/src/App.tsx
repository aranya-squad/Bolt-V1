import { useCallback, useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { DemoControls } from "./shared/ui/DemoControls";
import type { DemoState } from "./shared/ui/DemoControls";
import { apiClient } from "./shared/api/client";
import { useAuthStore } from "./shared/store/authStore";

const INITIAL_DEMO: DemoState = { focusMode: false, skeleton: false, connection: "good" };
const IS_DEV = import.meta.env.DEV;

export default function App() {
  const [demo, setDemo] = useState<DemoState>(INITIAL_DEMO);

  const updateDemo = useCallback((updater: (prev: DemoState) => DemoState) => {
    setDemo(prev => {
      const next = updater(prev);
      if (IS_DEV) window.__BOLT_DEMO__ = next;
      document.body.classList.toggle("focus-mode", next.focusMode);
      return next;
    });
  }, []);

  // Auto-enable focus mode on low-end devices
  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { effectiveType?: string } };
    const slow =
      navigator.hardwareConcurrency < 4 ||
      (nav.deviceMemory ?? Infinity) < 4 ||
      nav.connection?.effectiveType === "3g";
    if (slow) {
      document.body.classList.add("focus-mode");
      setDemo(prev => {
        const next = { ...prev, focusMode: true };
        if (IS_DEV) window.__BOLT_DEMO__ = next;
        return next;
      });
    }
  }, []);

  // Hydration: verify persisted user is still valid, then clear the isHydrating gate
  useEffect(() => {
    const { user, setUser, setHydrated } = useAuthStore.getState();
    if (!user) {
      setHydrated();
      return;
    }
    apiClient.get("/auth/me/")
      .then(({ data }) => setUser(data))
      .catch(() => { /* interceptor handles logout-and-redirect on auth failure */ })
      .finally(() => setHydrated());
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      {IS_DEV && <DemoControls state={demo} setState={updateDemo} />}
    </>
  );
}
