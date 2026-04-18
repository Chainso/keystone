import { createContext, useContext, type ReactNode } from "react";

export interface CurrentProject {
  projectId: string;
  projectKey: string;
  displayName: string;
  summary: string;
}

const scaffoldProject: CurrentProject = {
  projectId: "project-keystone-cloudflare",
  projectKey: "keystone-cloudflare",
  displayName: "Keystone Cloudflare",
  summary: "Phase 1 route shell placeholder"
};

const CurrentProjectContext = createContext<CurrentProject | null>(null);

interface CurrentProjectProviderProps {
  children: ReactNode;
}

export function CurrentProjectProvider({ children }: CurrentProjectProviderProps) {
  return (
    <CurrentProjectContext.Provider value={scaffoldProject}>
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
