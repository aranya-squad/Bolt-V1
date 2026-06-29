import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/shared/store/authStore";
import { PageSkeleton } from "./PageSkeleton";

// Guardian accounts are deprecated (plan §1e). Clear any stale persisted session
// and send them to login — they can no longer authenticate against the backend.
function GuardianGone() {
  const logout = useAuthStore((s) => s.logout);
  useEffect(() => {
    logout();
  }, [logout]);
  return <Navigate to="/login" replace />;
}

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  if (isHydrating) return <PageSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "GUARDIAN") return <GuardianGone />;
  return <Outlet />;
}
