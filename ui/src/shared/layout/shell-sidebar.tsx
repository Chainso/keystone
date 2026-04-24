import { startTransition } from "react";
import { PlusIcon, SettingsIcon } from "lucide-react";
import { Link, NavLink, type NavLinkRenderProps } from "react-router-dom";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useTheme } from "../../app/theme-provider";
import { useProjectManagement } from "../../features/projects/project-context";
import { primaryDestinations, projectActions } from "../navigation/destinations";

function getSidebarLinkClassName({ isActive }: NavLinkRenderProps) {
  return isActive ? "shell-nav-link is-active" : "shell-nav-link";
}

function getActionLinkClassName({ isActive }: NavLinkRenderProps) {
  return cn(
    buttonVariants({
      size: "icon-sm",
      variant: isActive ? "secondary" : "outline"
    }),
    "shell-action-link",
    isActive && "is-active"
  );
}

const projectActionIcons = {
  plus: PlusIcon,
  settings: SettingsIcon
} as const;

export function ShellSidebar() {
  const { actions, meta, state } = useProjectManagement();
  const { actions: themeActions, state: themeState } = useTheme();
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
      <div className="shell-sidebar-body">
        <div className="shell-brand">
          <p className="page-eyebrow">Keystone</p>
          <Link className="shell-brand-link" to="/runs">
            Operator workspace
          </Link>
        </div>

        <section className="shell-sidebar-section" aria-labelledby="project-context-label">
          <div className="shell-sidebar-section-header shell-project-header">
            <p id="project-context-label" className="page-eyebrow">
              Project
            </p>
            <div className="shell-action-row">
              {projectActions.map((action) => {
                const ActionIcon = projectActionIcons[action.icon];

                return (
                  <NavLink
                    key={action.path}
                    to={action.path}
                    className={getActionLinkClassName}
                    aria-label={action.label}
                    title={action.label}
                  >
                    <ActionIcon aria-hidden="true" />
                    <span className="sr-only">{action.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>

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
          </div>
        </section>

        <section className="shell-sidebar-section" aria-labelledby="global-navigation-label">
          <p id="global-navigation-label" className="page-eyebrow">
            Navigation
          </p>

          <nav className="shell-nav" aria-label="Global navigation">
            {primaryDestinations.map((destination) => (
              <NavLink
                key={destination.path}
                to={destination.path}
                className={getSidebarLinkClassName}
              >
                <span className="shell-nav-link-title-row">
                  <span className="shell-nav-link-marker" aria-hidden="true">
                    {">"}
                  </span>
                  <span className="shell-nav-link-title">{destination.label}</span>
                </span>
              </NavLink>
            ))}
          </nav>
        </section>
      </div>

      <div className="shell-theme-panel" aria-label="Theme controls">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          className="shell-theme-toggle"
          aria-label="Theme preference"
          value={themeState.preference}
          onValueChange={(value) => {
            if (value === "system" || value === "light" || value === "dark") {
              themeActions.setThemePreference(value);
            }
          }}
        >
          <ToggleGroupItem value="system">System</ToggleGroupItem>
          <ToggleGroupItem value="light">Light</ToggleGroupItem>
          <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </aside>
  );
}
