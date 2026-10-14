import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import { primaryNavigation, routes } from "../shared/routes";

export function AppShell() {
  const session = useSession();
  const location = useLocation();
  const title = primaryNavigation.find((item) => item.to === location.pathname)?.label ?? "Study workspace";
  return <div className="app-shell">
    <header className="topbar">
      <NavLink className="brand" to={routes.home}><span className="brand-mark">A</span><span>Artilearn</span></NavLink>
      <span className="topbar-context"><span className="context-dot" />{title}</span>
      <NavLink className="avatar-link" to={routes.settings} aria-label="Open settings">{session.user?.displayName.slice(0, 1).toUpperCase()}</NavLink>
    </header>
    <div className="app-layout">
      <nav className="main-nav" aria-label="Primary navigation">
        {primaryNavigation.map((item) => <NavLink key={item.to} to={item.to} end={item.to === routes.home}>{item.label}</NavLink>)}
        <NavLink to={routes.tutor}>Tutor</NavLink>
      </nav>
      <main id="main-content" className="page-content"><Outlet /></main>
    </div>
  </div>;
}
