import type { ReactNode } from "react";

import {
  CurrentProjectProvider,
  type CurrentProject
} from "../features/projects/project-context";
import type { ProjectManagementApi } from "../features/projects/project-management-api";
import {
  RunManagementApiProvider
} from "../features/runs/run-detail-context";
import type { RunManagementApi } from "../features/runs/run-management-api";
import { ThemeProvider } from "./theme-provider";

interface AppProvidersProps {
  children: ReactNode;
  projectApi?: ProjectManagementApi;
  project?: CurrentProject;
  runApi?: RunManagementApi;
}

export function AppProviders({
  children,
  project,
  projectApi,
  runApi
}: AppProvidersProps) {
  const providerProps = projectApi ? { api: projectApi } : {};
  const currentProjectProvider =
    project === undefined ? (
      <CurrentProjectProvider {...providerProps}>{children}</CurrentProjectProvider>
    ) : (
      <CurrentProjectProvider {...providerProps} project={project}>
        {children}
      </CurrentProjectProvider>
    );

  return (
    <ThemeProvider>
      <RunManagementApiProvider {...(runApi ? { api: runApi } : {})}>
        {currentProjectProvider}
      </RunManagementApiProvider>
    </ThemeProvider>
  );
}
