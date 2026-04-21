import { Outlet } from "react-router-dom";

import {
  type ProjectConfigurationMode
} from "../../features/projects/project-configuration-scaffold";
import { NewProjectConfigurationProvider } from "../../features/projects/new-project-context";
import { ProjectSettingsConfigurationProvider } from "../../features/projects/project-settings-context";
import {
  useNewProjectConfigurationShellViewModel,
  useProjectSettingsConfigurationShellViewModel
} from "../../features/projects/use-project-configuration-view-model";
import { ProjectConfigurationScaffold } from "../../shared/layout/project-configuration-scaffold";

interface ProjectConfigurationLayoutProps {
  mode: ProjectConfigurationMode;
}

function NewProjectConfigurationLayout() {
  const model = useNewProjectConfigurationShellViewModel();

  return (
    <NewProjectConfigurationProvider>
      <ProjectConfigurationScaffold title={model.title} tabs={model.tabs}>
        <Outlet />
      </ProjectConfigurationScaffold>
    </NewProjectConfigurationProvider>
  );
}

function ProjectSettingsConfigurationLayout() {
  return (
    <ProjectSettingsConfigurationProvider>
      <ProjectSettingsConfigurationShell />
    </ProjectSettingsConfigurationProvider>
  );
}

function ProjectSettingsConfigurationShell() {
  const model = useProjectSettingsConfigurationShellViewModel();

  return (
    <ProjectConfigurationScaffold title={model.title} tabs={model.tabs}>
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
    </ProjectConfigurationScaffold>
  );
}

export function ProjectConfigurationLayout({ mode }: ProjectConfigurationLayoutProps) {
  return mode === "new" ? <NewProjectConfigurationLayout /> : <ProjectSettingsConfigurationLayout />;
}
