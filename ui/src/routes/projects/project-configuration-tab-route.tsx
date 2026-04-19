import type {
  ProjectConfigurationMode,
  ProjectConfigurationTabId
} from "../../features/projects/project-configuration-scaffold";
import {
  NewProjectConfigurationTabContent,
  ProjectSettingsConfigurationTabContent
} from "../../features/projects/components/project-configuration-tabs";

interface ProjectConfigurationTabRouteProps {
  mode: ProjectConfigurationMode;
  tabId: ProjectConfigurationTabId;
}

export function ProjectConfigurationTabRoute({
  mode,
  tabId
}: ProjectConfigurationTabRouteProps) {
  return mode === "new" ? (
    <NewProjectConfigurationTabContent tabId={tabId} />
  ) : (
    <ProjectSettingsConfigurationTabContent tabId={tabId} />
  );
}
