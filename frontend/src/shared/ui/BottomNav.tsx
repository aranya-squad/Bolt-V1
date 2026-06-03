import { Link, useLocation } from "react-router-dom";
import { Icon } from "./Icon";

const NAV_ITEMS = [
  { path: "/hub",      icon: "home",      label: "HUB"     },
  { path: "/learn",    icon: "book-open", label: "LEARN"   },
  { path: "/practice", icon: "gamepad-2", label: "ARENA"   },
  { path: "/profile",  icon: "user",      label: "PROFILE" },
] as const;

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`bottom-nav-item${isActive ? " bottom-nav-active" : ""}`}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon name={item.icon} size={22} />
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
