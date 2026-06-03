import { Link, useLocation } from "react-router-dom";
import { Icon } from "./Icon";
import { Avatar } from "./Avatar";
import { useMe } from "@/shared/api/queries/useMe";

const NAV_ITEMS = [
  { path: "/hub",      icon: "home",      label: "HUB"     },
  { path: "/learn",    icon: "book-open", label: "LEARN"   },
  { path: "/practice", icon: "gamepad-2", label: "ARENA"   },
  { path: "/profile",  icon: "user",      label: "PROFILE" },
] as const;

export function Sidebar() {
  const location = useLocation();
  const { data: user } = useMe();

  const displayName = user?.profile?.display_name ?? "…";
  const level = user?.stats?.current_level ?? 1;

  return (
    <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
      <div className="sidebar-logo">BOLT</div>

      <div className="sidebar-items">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item${isActive ? " sidebar-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="sidebar-user">
        <Avatar src={user?.profile?.avatar_url} size={24} />
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{displayName}</span>
          <span className="sidebar-user-level">LVL {level}</span>
        </div>
      </div>
    </nav>
  );
}
