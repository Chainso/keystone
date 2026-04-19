import type { ReactNode } from "react";

import { ResourceModelProvider, useCurrentResourceProject } from "../resource-model/context";
import {
  createProjectOverrideDataset,
  selectCurrentProjectSummary,
  type CurrentProjectSummary
} from "../resource-model/selectors";

export type CurrentProject = CurrentProjectSummary;

export const scaffoldProject = selectCurrentProjectSummary();

interface CurrentProjectProviderProps {
  children: ReactNode;
  project?: CurrentProject;
}

export function CurrentProjectProvider({
  children,
  project = scaffoldProject
}: CurrentProjectProviderProps) {
  if (
    project.projectId === scaffoldProject.projectId &&
    project.projectKey === scaffoldProject.projectKey &&
    project.displayName === scaffoldProject.displayName
  ) {
    return <ResourceModelProvider>{children}</ResourceModelProvider>;
  }

  return (
    <ResourceModelProvider dataset={createProjectOverrideDataset(project)}>
      {children}
    </ResourceModelProvider>
  );
}

export function useCurrentProject() {
  return useCurrentResourceProject();
}
