import type { ProjectConfigurationTabId } from "../../features/projects/project-configuration-scaffold";
import { ProjectConfigurationTabContent } from "../../features/projects/components/project-configuration-tabs";

interface ProjectConfigurationTabRouteProps {
  tabId: ProjectConfigurationTabId;
}

export function ProjectConfigurationTabRoute({
  tabId
}: ProjectConfigurationTabRouteProps) {
  return <ProjectConfigurationTabContent tabId={tabId} />;
}
