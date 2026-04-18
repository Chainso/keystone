import { createContext, useContext, type ReactNode } from "react";

export interface CurrentProject {
  projectId: string;
  projectKey: string;
  displayName: string;
  summary: string;
}

export const scaffoldProject: CurrentProject = {
  projectId: "project-keystone-cloudflare",
  projectKey: "keystone-cloudflare",
  displayName: "Keystone Cloudflare",
  summary: "Phase 1 route shell placeholder"
};

const CurrentProjectContext = createContext<CurrentProject | null>(null);

interface CurrentProjectProviderProps {
  children: ReactNode;
  project?: CurrentProject;
}

export function CurrentProjectProvider({
  children,
  project = scaffoldProject
}: CurrentProjectProviderProps) {
  return (
    <CurrentProjectContext.Provider value={project}>
      {children}
    </CurrentProjectContext.Provider>
  );
}

export function useCurrentProject() {
  const project = useContext(CurrentProjectContext);

  if (project === null) {
    throw new Error("useCurrentProject must be used within CurrentProjectProvider.");
  }

  return project;
}
