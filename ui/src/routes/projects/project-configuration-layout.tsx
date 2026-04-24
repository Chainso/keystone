import { Outlet } from "react-router-dom";

import type { ProjectConfigurationMode } from "../../features/projects/project-configuration-scaffold";
import { NewProjectConfigurationProvider } from "../../features/projects/new-project-context";
import { ProjectSettingsConfigurationProvider } from "../../features/projects/project-settings-context";
import { ProjectConfigurationShell } from "../../features/projects/components/project-configuration-shell";
import { useProjectConfigurationShellViewModel } from "../../features/projects/use-project-configuration-view-model";
import { Button } from "../../components/ui/button";
import {
  WorkspaceEmptyState,
  WorkspaceEmptyStateActions,
  WorkspaceEmptyStateDescription,
  WorkspaceEmptyStateTitle
} from "../../components/workspace/workspace-empty-state";

interface ProjectConfigurationLayoutProps {
  mode: ProjectConfigurationMode;
}

function ProjectConfigurationRouteShell() {
  const model = useProjectConfigurationShellViewModel();

  return (
    <ProjectConfigurationShell title={model.title} tabs={model.tabs}>
      {model.shellState ? (
        <WorkspaceEmptyState className="project-config-shell-state">
          <WorkspaceEmptyStateTitle as="h2">
            {model.shellState.heading}
          </WorkspaceEmptyStateTitle>
          <WorkspaceEmptyStateDescription>
            {model.shellState.message}
          </WorkspaceEmptyStateDescription>
          {model.shellState.actionLabel && model.shellState.onAction ? (
            <WorkspaceEmptyStateActions>
              <Button
                type="button"
                variant="outline"
                onClick={model.shellState.onAction}
              >
                {model.shellState.actionLabel}
              </Button>
            </WorkspaceEmptyStateActions>
          ) : null}
        </WorkspaceEmptyState>
      ) : (
        <Outlet />
      )}
    </ProjectConfigurationShell>
  );
}

export function ProjectConfigurationLayout({ mode }: ProjectConfigurationLayoutProps) {
  const Provider =
    mode === "new"
      ? NewProjectConfigurationProvider
      : ProjectSettingsConfigurationProvider;

  return (
    <Provider>
      <ProjectConfigurationRouteShell />
    </Provider>
  );
}
