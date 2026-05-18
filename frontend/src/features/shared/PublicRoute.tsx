import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store/authStore";

interface Props {
  children: React.ReactNode;
}

export function PublicRoute({ children }: Props) {
  const user = useAuthStore((s) => s.user);
  if (user) {
    return <Navigate to="/hub" replace />;
  }
  return <>{children}</>;
}
