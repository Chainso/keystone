import { Outlet } from "react-router-dom";

import type { ProjectConfigurationMode } from "../../features/projects/project-configuration-scaffold";
import { NewProjectConfigurationProvider } from "../../features/projects/new-project-context";
import { ProjectSettingsConfigurationProvider } from "../../features/projects/project-settings-context";
import { ProjectConfigurationShell } from "../../features/projects/components/project-configuration-shell";
import { useProjectConfigurationShellViewModel } from "../../features/projects/use-project-configuration-view-model";

interface ProjectConfigurationLayoutProps {
  mode: ProjectConfigurationMode;
}

function ProjectConfigurationRouteShell() {
  const model = useProjectConfigurationShellViewModel();

  return (
    <ProjectConfigurationShell title={model.title} tabs={model.tabs}>
      {model.shellState ? (
        <section className="empty-state-card">
          <h2 className="document-card-title">{model.shellState.heading}</h2>
          <p className="document-card-summary">{model.shellState.message}</p>
          {model.shellState.actionLabel && model.shellState.onAction ? (
            <button
              type="button"
              className="ghost-button"
              onClick={model.shellState.onAction}
            >
              {model.shellState.actionLabel}
            </button>
          ) : null}
        </section>
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
