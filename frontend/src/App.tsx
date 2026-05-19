import { useCallback, useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { DemoControls } from "./shared/ui/DemoControls";
import type { DemoState } from "./shared/ui/DemoControls";

const INITIAL_DEMO: DemoState = { focusMode: false, skeleton: false, connection: "good" };

export default function App() {
  const [demo, setDemo] = useState<DemoState>(INITIAL_DEMO);

  const updateDemo = useCallback((updater: (prev: DemoState) => DemoState) => {
    setDemo(prev => {
      const next = updater(prev);
      window.__BOLT_DEMO__ = next;
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
        window.__BOLT_DEMO__ = next;
        return next;
      });
    }
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <DemoControls state={demo} setState={updateDemo} />
    </>
  );
}
