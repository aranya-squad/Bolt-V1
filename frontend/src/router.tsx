import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { PageSkeleton } from "@/features/shared/PageSkeleton";
import { ProtectedRoute } from "@/features/shared/ProtectedRoute";
import { PublicRoute } from "@/features/shared/PublicRoute";
import { NotFoundPage } from "@/features/shared/NotFoundPage";
import { ShellLayout } from "@/features/shared/ShellLayout";

// Lazy-load all feature pages (see ARCHITECTURE.md §6.4)
const LoginPage = lazy(() => import("@/features/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/RegisterPage"));
const HubPage = lazy(() => import("@/features/hub/HubPage"));
const LevelSelectionPage = lazy(() => import("@/features/learn/LevelSelectionPage"));
const PathOfConquestPage = lazy(() => import("@/features/learn/PathOfConquestPage"));
const ClassworkPage = lazy(() => import("@/features/learn/ClassworkPage"));
const MissionReportPage = lazy(() => import("@/features/learn/MissionReportPage"));
const TrainingArenaPage = lazy(() => import("@/features/practice/TrainingArenaPage"));
const InArenaPage = lazy(() => import("@/features/practice/InArenaPage"));
const VictoryPage = lazy(() => import("@/features/practice/VictoryPage"));
const ProfilePage = lazy(() => import("@/features/profile/ProfilePage"));

const wrap = (element: React.ReactNode) => (
  <Suspense fallback={<PageSkeleton />}>{element}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <PublicRoute>{wrap(<LoginPage />)}</PublicRoute>,
  },
  {
    path: "/register",
    element: <PublicRoute>{wrap(<RegisterPage />)}</PublicRoute>,
  },
  {
    element: <ProtectedRoute />,
    children: [
      // NAV-SHELL group: Sidebar + BottomNav rendered on all these routes
      {
        element: <ShellLayout />,
        children: [
          { path: "/", element: <Navigate to="/hub" replace /> },
          { path: "/hub", element: wrap(<HubPage />) },
          { path: "/learn", element: wrap(<LevelSelectionPage />) },
          { path: "/learn/level/:levelId", element: wrap(<PathOfConquestPage />) },
          // Legacy classwork route — kept during Wave 2–3 transition
          { path: "/learn/level/:levelId/classwork", element: wrap(<ClassworkPage />) },
          {
            path: "/learn/level/:levelId/report/:sessionId",
            element: wrap(<MissionReportPage />),
          },
          { path: "/practice", element: wrap(<TrainingArenaPage />) },
          { path: "/practice/setup/:mode", element: <Navigate to="/practice" replace /> },
          { path: "/practice/victory/:sessionId", element: wrap(<VictoryPage />) },
          { path: "/profile", element: wrap(<ProfilePage />) },
        ],
      },
      // FOCUS group: no nav (active session screens must be distraction-free)
      {
        path: "/learn/level/:levelId/lesson/:lessonId/classwork",
        element: wrap(<ClassworkPage />),
      },
      { path: "/practice/session/:sessionId", element: wrap(<InArenaPage />) },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
