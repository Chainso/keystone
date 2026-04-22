import { startTransition } from "react";
import { Link, NavLink, type NavLinkRenderProps } from "react-router-dom";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { buttonVariants } from "@/components/ui/button";
import {
  WorkspacePanel,
  WorkspacePanelEyebrow,
  WorkspacePanelHeader,
  WorkspacePanelHeading,
  WorkspacePanelSummary,
  WorkspacePanelTitle
} from "@/components/workspace/workspace-panel";
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
      size: "sm",
      variant: isActive ? "secondary" : "outline"
    }),
    "shell-action-link",
    isActive && "is-active"
  );
}

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
  const projectSummary =
    state.currentProject?.description ??
    state.currentProject?.projectKey ??
    (meta.status === "loading"
      ? "Keystone is loading the available project list."
      : meta.status === "empty"
        ? "Create a project to begin working in the shared shell."
        : "Project context is unavailable right now.");
  const canSelectProject = meta.status === "ready" && state.projects.length > 0;

  return (
    <aside className="shell-sidebar">
      <div className="shell-sidebar-body">
        <div className="shell-brand">
          <p className="page-eyebrow">Keystone</p>
          <Link className="shell-brand-link" to="/runs">
            Operator workspace
          </Link>
          <p className="shell-brand-copy">One selected project, one stable shell.</p>
        </div>

        <WorkspacePanel className="shell-sidebar-panel" aria-labelledby="project-context-label">
          <WorkspacePanelHeader>
            <WorkspacePanelHeading>
              <WorkspacePanelEyebrow id="project-context-label">Project</WorkspacePanelEyebrow>
              <p className="shell-panel-title shell-project-title">{currentProjectLabel}</p>
            </WorkspacePanelHeading>
          </WorkspacePanelHeader>

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
            <p className="shell-panel-copy">{projectSummary}</p>
          </div>

          <div className="shell-action-row">
            {projectActions.map((action) => (
              <NavLink
                key={action.path}
                to={action.path}
                className={getActionLinkClassName}
              >
                <span className="shell-action-link-symbol" aria-hidden="true">
                  {action.glyph}
                </span>
                <span>{action.label}</span>
              </NavLink>
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel className="shell-sidebar-panel">
          <WorkspacePanelHeader>
            <WorkspacePanelHeading>
              <WorkspacePanelEyebrow>Navigation</WorkspacePanelEyebrow>
              <WorkspacePanelTitle className="shell-panel-title">Destinations</WorkspacePanelTitle>
            </WorkspacePanelHeading>
            <WorkspacePanelSummary className="shell-panel-summary">
              Stay in one project while moving between runs, documentation, and workstreams.
            </WorkspacePanelSummary>
          </WorkspacePanelHeader>

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
                <span className="shell-nav-link-summary" aria-hidden="true">
                  {destination.summary}
                </span>
              </NavLink>
            ))}
          </nav>
        </WorkspacePanel>
      </div>

      <WorkspacePanel className="shell-sidebar-panel shell-theme-panel">
        <WorkspacePanelHeader>
          <WorkspacePanelHeading>
            <WorkspacePanelEyebrow>Theme</WorkspacePanelEyebrow>
            <WorkspacePanelTitle className="shell-panel-title">Appearance</WorkspacePanelTitle>
          </WorkspacePanelHeading>
          <WorkspacePanelSummary className="shell-panel-summary">
            Follow the system by default, or pin a workspace theme.
          </WorkspacePanelSummary>
        </WorkspacePanelHeader>

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
      </WorkspacePanel>
    </aside>
  );
}
