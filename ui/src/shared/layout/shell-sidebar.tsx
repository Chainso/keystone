import { startTransition, useState } from "react";
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
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const currentProjectLabel =
    state.currentProject?.displayName ??
    (meta.status === "loading"
      ? "Loading projects"
      : meta.status === "empty"
        ? "No projects yet"
        : "Unable to load projects");
  const canOpenSwitcher = meta.status === "ready" && state.projects.length > 0;

  return (
    <aside className="shell-sidebar">
      <section className="sidebar-block" aria-labelledby="project-context-label">
        <p id="project-context-label" className="sidebar-label">
          Project
        </p>
        <button
          type="button"
          className="project-switcher"
          aria-controls="sidebar-project-switcher-list"
          aria-expanded={canOpenSwitcher ? isSwitcherOpen : false}
          onClick={() => {
            if (canOpenSwitcher) {
              setIsSwitcherOpen((currentValue) => !currentValue);
            }
          }}
          disabled={!canOpenSwitcher}
        >
          <span className="project-switcher-details">
            <span className="project-switcher-name">{currentProjectLabel}</span>
            {state.currentProject ? (
              <span className="project-switcher-summary">{state.currentProject.projectKey}</span>
            ) : null}
          </span>
          <span className="project-switcher-chevron" aria-hidden="true">
            v
          </span>
        </button>
        {isSwitcherOpen ? (
          <div
            id="sidebar-project-switcher-list"
            className="project-switcher-panel"
            role="listbox"
            aria-label="Projects"
          >
            {state.projects.map((project) => {
              const isSelected = project.projectId === state.currentProjectId;

              return (
                <button
                  key={project.projectId}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={isSelected ? "project-switcher-option is-selected" : "project-switcher-option"}
                  onClick={() => {
                    startTransition(() => {
                      actions.selectProject(project.projectId);
                    });
                    setIsSwitcherOpen(false);
                  }}
                >
                  <span className="project-switcher-option-title">{project.displayName}</span>
                  <span className="project-switcher-option-meta">{project.projectKey}</span>
                </button>
              );
            })}
          </div>
        ) : null}
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
