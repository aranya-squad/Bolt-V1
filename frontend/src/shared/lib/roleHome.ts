import type { Role } from "@/shared/types";

// Canonical home route per role. Used by LandingPage, PublicRoute, and any role-aware redirect.
export function roleHome(role: Role): string {
  return role === "TEACHER" ? "/teacher" : "/hub";
}
