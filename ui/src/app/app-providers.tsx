import type { ReactNode } from "react";

import {
  CurrentProjectProvider,
  type CurrentProject
} from "../features/projects/project-context";

interface AppProvidersProps {
  children: ReactNode;
  project?: CurrentProject;
}

export function AppProviders({ children, project }: AppProvidersProps) {
  if (project === undefined) {
    return <CurrentProjectProvider>{children}</CurrentProjectProvider>;
  }

  return <CurrentProjectProvider project={project}>{children}</CurrentProjectProvider>;
}
