import { startTransition } from "react";
import type { NavLinkRenderProps } from "react-router-dom";
import { NavLink } from "react-router-dom";

import { useProjectManagement } from "../../features/projects/project-context";
import { primaryDestinations, projectActions } from "../navigation/destinations";

function getSidebarLinkClassName({ isActive }: NavLinkRenderProps) {
  return isActive ? "sidebar-link is-active" : "sidebar-link";
}

function getActionLinkClassName({ isActive }: NavLinkRenderProps) {
  return isActive ? "action-link is-active" : "action-link";
}

export function ShellSidebar() {
  const { actions, meta, state } = useProjectManagement();
  const currentProjectLabel =
    state.currentProject?.displayName ??
    (meta.status === "loading"
      ? "Loading projects"
      : meta.status === "empty"
        ? "No projects yet"
        : "Unable to load projects");
  const canSelectProject = meta.status === "ready" && state.projects.length > 0;

  return (
    <aside className="shell-sidebar">
      <section className="sidebar-block" aria-labelledby="project-context-label">
        <p id="project-context-label" className="sidebar-label">
          Project
        </p>
        <div className="project-switcher-field">
          <select
            id="sidebar-project-switcher"
            className="project-switcher"
            aria-labelledby="project-context-label"
            disabled={!canSelectProject}
            value={canSelectProject ? (state.currentProjectId ?? state.projects[0]?.projectId ?? "") : ""}
            onChange={(event) => {
              const projectId = event.currentTarget.value;

              if (!projectId) {
                return;
              }

              startTransition(() => {
                actions.selectProject(projectId);
              });
            }}
          >
            {canSelectProject ? (
              state.projects.map((project) => (
                <option key={project.projectId} value={project.projectId}>
                  {project.displayName}
                </option>
              ))
            ) : (
              <option value="">{currentProjectLabel}</option>
            )}
          </select>
          {state.currentProject ? (
            <p className="project-switcher-summary">{state.currentProject.projectKey}</p>
          ) : null}
        </div>
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
