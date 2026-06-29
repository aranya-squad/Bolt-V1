import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/shared/store/authStore";
import type { Role } from "@/shared/types";

// Where a role lands when it hits a route it isn't allowed on.
function homeFor(role: Role): string {
  return role === "TEACHER" ? "/teacher" : "/hub";
}

/**
 * Role gate (plan §1f / §5.2). Assumes ProtectedRoute already ran upstream, so the
 * user is authenticated and non-guardian. Redirects mismatched roles to their own home.
 */
export function RoleRoute({ allow }: { allow: Role[] }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
