import type { NavLinkRenderProps } from "react-router-dom";
import { NavLink } from "react-router-dom";

import { useCurrentProject } from "../../features/projects/project-context";
import { primaryDestinations, projectActions } from "../navigation/destinations";

function getSidebarLinkClassName({ isActive }: NavLinkRenderProps) {
  return isActive ? "sidebar-link is-active" : "sidebar-link";
}

function getActionLinkClassName({ isActive }: NavLinkRenderProps) {
  return isActive ? "action-link is-active" : "action-link";
}

export function ShellSidebar() {
  const project = useCurrentProject();

  return (
    <aside className="shell-sidebar">
      <section className="sidebar-block" aria-labelledby="project-context-label">
        <p id="project-context-label" className="sidebar-label">
          Project
        </p>
        <button type="button" className="project-switcher" disabled>
          <span className="project-switcher-details">
            <span className="project-switcher-name">{project.displayName}</span>
          </span>
          <span className="project-switcher-chevron" aria-hidden="true">
            v
          </span>
        </button>
        <div className="project-actions">
          {projectActions.map((action) => (
            <NavLink
              key={action.path}
              to={action.path}
              aria-label={action.label}
              className={getActionLinkClassName}
              title={action.label}
            >
              <span className="action-link-symbol" aria-hidden="true">
                {action.glyph}
              </span>
              <span className="sr-only">{action.label}</span>
            </NavLink>
          ))}
        </div>
      </section>

      <section className="sidebar-block">
        <p className="sidebar-label">Navigation</p>
        <nav className="sidebar-nav" aria-label="Global navigation">
          {primaryDestinations.map((destination) => (
            <NavLink
              key={destination.path}
              to={destination.path}
              className={getSidebarLinkClassName}
            >
              <span className="sidebar-link-marker" aria-hidden="true">
                {">"}
              </span>
              <span className="sidebar-link-title">{destination.label}</span>
            </NavLink>
          ))}
        </nav>
      </section>
    </aside>
  );
}
