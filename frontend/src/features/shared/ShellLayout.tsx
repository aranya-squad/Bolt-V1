import { Outlet } from "react-router-dom";
import { Sidebar } from "@/shared/ui/Sidebar";
import { BottomNav } from "@/shared/ui/BottomNav";

export function ShellLayout() {
  return (
    <div className="shell-layout">
      <Sidebar />
      <main className="shell-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
