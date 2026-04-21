import { Outlet } from "react-router-dom";

import {
  type ProjectConfigurationMode
} from "../../features/projects/project-configuration-scaffold";
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
    <ProjectConfigurationScaffold title={model.title} tabs={model.tabs}>
      <Outlet />
    </ProjectConfigurationScaffold>
  );
}

function ProjectSettingsConfigurationLayout() {
  const model = useProjectSettingsConfigurationShellViewModel();

  return (
    <ProjectConfigurationScaffold title={model.title} tabs={model.tabs}>
      {model.compatibilityState ? (
        <section className="empty-state-card">
          <h2 className="document-card-title">{model.compatibilityState.heading}</h2>
          <p className="document-card-summary">{model.compatibilityState.message}</p>
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
