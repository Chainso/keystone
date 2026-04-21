import type { ReactNode } from "react";

import {
  CurrentProjectProvider,
  type CurrentProject
} from "../features/projects/project-context";
import type { ProjectManagementApi } from "../features/projects/project-management-api";

interface AppProvidersProps {
  children: ReactNode;
  projectApi?: ProjectManagementApi;
  project?: CurrentProject;
}

export function AppProviders({ children, project, projectApi }: AppProvidersProps) {
  const providerProps = projectApi ? { api: projectApi } : {};

  if (project === undefined) {
    return <CurrentProjectProvider {...providerProps}>{children}</CurrentProjectProvider>;
  }

  return (
    <CurrentProjectProvider {...providerProps} project={project}>
      {children}
    </CurrentProjectProvider>
  );
}
