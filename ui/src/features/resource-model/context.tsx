import { createContext, useContext, useState, type ReactNode } from "react";

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
  currentProjectId?: string;
  dataset?: ResourceModelDataset;
  initialProjectId?: string;
}

function resolveProjectId(dataset: ResourceModelDataset, requestedProjectId?: string) {
  if (requestedProjectId && dataset.projects.some((project) => project.projectId === requestedProjectId)) {
    return requestedProjectId;
  }

  return dataset.meta.defaultProjectId;
}

export function ResourceModelProvider({
  children,
  currentProjectId: controlledProjectId,
  dataset = uiScaffoldDataset,
  initialProjectId
}: ResourceModelProviderProps) {
  const [uncontrolledProjectId, setUncontrolledProjectId] = useState(() =>
    resolveProjectId(dataset, initialProjectId)
  );
  const effectiveProjectId = resolveProjectId(
    dataset,
    controlledProjectId ?? uncontrolledProjectId
  );
  const setCurrentProjectId =
    controlledProjectId === undefined
      ? setUncontrolledProjectId
      : () => {
          // Live project selection is owned by the project-management provider.
        };

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
