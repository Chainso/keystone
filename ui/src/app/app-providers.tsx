import type { ReactNode } from "react";

import {
  RunExecutionApiProvider,
  createBrowserRunExecutionApi,
  type RunExecutionApi
} from "../features/execution/execution-api";
import {
  CurrentProjectProvider,
  type CurrentProject
} from "../features/projects/project-context";
import type { ProjectManagementApi } from "../features/projects/project-management-api";

interface AppProvidersProps {
  children: ReactNode;
  executionApi?: RunExecutionApi | null;
  projectApi?: ProjectManagementApi;
  project?: CurrentProject;
}

const browserRunExecutionApi = createBrowserRunExecutionApi();

export function AppProviders({
  children,
  executionApi,
  project,
  projectApi
}: AppProvidersProps) {
  const providerProps = projectApi ? { api: projectApi } : {};
  const effectiveExecutionApi =
    executionApi !== undefined
      ? executionApi
      : project === undefined && projectApi === undefined
        ? browserRunExecutionApi
        : null;

  if (project === undefined) {
    return (
      <RunExecutionApiProvider api={effectiveExecutionApi}>
        <CurrentProjectProvider {...providerProps}>{children}</CurrentProjectProvider>
      </RunExecutionApiProvider>
    );
  }

  return (
    <RunExecutionApiProvider api={effectiveExecutionApi}>
      <CurrentProjectProvider {...providerProps} project={project}>
        {children}
      </CurrentProjectProvider>
    </RunExecutionApiProvider>
  );
}
