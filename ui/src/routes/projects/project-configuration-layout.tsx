import { Outlet } from "react-router-dom";

import {
  type ProjectConfigurationMode
} from "../../features/projects/project-configuration-scaffold";
import { useProjectConfigurationShellViewModel } from "../../features/projects/use-project-configuration-view-model";
import { ProjectConfigurationScaffold } from "../../shared/layout/project-configuration-scaffold";

interface ProjectConfigurationLayoutProps {
  mode: ProjectConfigurationMode;
}

export function ProjectConfigurationLayout({ mode }: ProjectConfigurationLayoutProps) {
  const model = useProjectConfigurationShellViewModel(mode);

  return (
    <ProjectConfigurationScaffold
      title={model.title}
      summary={model.summary}
      honestyCopy={model.honestyCopy}
      tabs={model.tabs}
      sidebarSections={model.sidebarSections}
    >
      <Outlet />
    </ProjectConfigurationScaffold>
  );
}
