import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { uiScaffoldDataset } from "./scaffold-dataset";
import { selectCurrentProjectSummary } from "./selectors";
import type { ResourceModelDataset } from "./types";

export interface ResourceModelState {
  dataset: ResourceModelDataset;
  currentProjectId: string;
}

export interface ResourceModelActions {
  setCurrentProjectId: (projectId: string) => void;
}

export interface ResourceModelMeta {
  source: "scaffold";
}

export interface ResourceModelValue {
  state: ResourceModelState;
  actions: ResourceModelActions;
  meta: ResourceModelMeta;
}

const ResourceModelContext = createContext<ResourceModelValue | null>(null);

interface ResourceModelProviderProps {
  children: ReactNode;
  dataset?: ResourceModelDataset;
  initialProjectId?: string;
}

export function ResourceModelProvider({
  children,
  dataset = uiScaffoldDataset,
  initialProjectId
}: ResourceModelProviderProps) {
  const resolvedProjectId = initialProjectId ?? dataset.meta.defaultProjectId;
  const [currentProjectId, setCurrentProjectId] = useState(resolvedProjectId);
  const effectiveProjectId = initialProjectId
    ? initialProjectId
    : dataset.projects.some((project) => project.projectId === currentProjectId)
      ? currentProjectId
      : resolvedProjectId;

  useEffect(() => {
    if (currentProjectId !== effectiveProjectId) {
      setCurrentProjectId(effectiveProjectId);
    }
  }, [currentProjectId, effectiveProjectId]);

  return (
    <ResourceModelContext.Provider
      value={{
        state: {
          dataset,
          currentProjectId: effectiveProjectId
        },
        actions: {
          setCurrentProjectId
        },
        meta: {
          source: dataset.meta.source
        }
      }}
    >
      {children}
    </ResourceModelContext.Provider>
  );
}

export function useResourceModel() {
  const value = useContext(ResourceModelContext);

  if (!value) {
    throw new Error("useResourceModel must be used within ResourceModelProvider.");
  }

  return value;
}

export function useCurrentResourceProject() {
  const { state } = useResourceModel();

  return selectCurrentProjectSummary(state.dataset, state.currentProjectId);
}
