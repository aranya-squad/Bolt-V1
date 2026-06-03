import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/shared/store/authStore";
import { PageSkeleton } from "./PageSkeleton";

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  if (isHydrating) return <PageSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
