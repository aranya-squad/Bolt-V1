/// <reference types="vite/client" />

declare global {
  interface Window {
    __BOLT_DEMO__?: { focusMode?: boolean; skeleton?: boolean; connection?: string };
  }
}

export {};
