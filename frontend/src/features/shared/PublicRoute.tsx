import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store/authStore";
import { roleHome } from "@/shared/lib/roleHome";
import { PageSkeleton } from "./PageSkeleton";

interface Props {
  children: React.ReactNode;
}

export function PublicRoute({ children }: Props) {
  const user = useAuthStore((s) => s.user);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  // Wait for hydration: logged-in users shouldn't briefly see the login form
  if (isHydrating) return <PageSkeleton />;
  if (user) return <Navigate to={roleHome(user.role)} replace />;
  return <>{children}</>;
}
