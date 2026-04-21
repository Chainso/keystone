import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";

import type { ArtifactResource } from "../../../../src/http/api/v1/artifacts/contracts";
import type {
  DocumentResource,
  DocumentRevisionResource
} from "../../../../src/http/api/v1/documents/contracts";
import type {
  RunResource,
  TaskResource,
  WorkflowGraphResource
} from "../../../../src/http/api/v1/runs/contracts";
import {
  createBrowserRunManagementApi,
  RunManagementApiError,
  type RunManagementApi
} from "./run-management-api";

type RunPlanningPhaseId = "specification" | "architecture" | "execution-plan";

interface RunPlanningDocumentBaseState {
  document: DocumentResource | null;
  phaseId: RunPlanningPhaseId;
}

export interface RunPlanningDocumentReadyState extends RunPlanningDocumentBaseState {
  content: string;
  revision: DocumentRevisionResource;
  status: "ready";
}

export interface RunPlanningDocumentEmptyState extends RunPlanningDocumentBaseState {
  reason: "missing_document" | "missing_revision";
  revision: null;
  status: "empty";
}

export interface RunPlanningDocumentErrorState extends RunPlanningDocumentBaseState {
  errorMessage: string;
  revision: DocumentRevisionResource | null;
  status: "error";
}

export type RunPlanningDocumentState =
  | RunPlanningDocumentReadyState
  | RunPlanningDocumentEmptyState
  | RunPlanningDocumentErrorState;

export interface RunTaskArtifactsState {
  errorMessage: string | null;
  items: ArtifactResource[];
  status: "idle" | "loading" | "ready" | "error";
}

export interface RunDetailState {
  planningDocuments: Record<RunPlanningPhaseId, RunPlanningDocumentState>;
  run: RunResource | null;
  taskArtifacts: Record<string, RunTaskArtifactsState | undefined>;
  tasks: TaskResource[];
  workflow: WorkflowGraphResource | null;
}

export interface RunDetailActions {
  loadTaskArtifacts: (taskId: string, options?: { force?: boolean }) => Promise<void>;
  reload: () => Promise<void>;
}

export interface RunDetailMeta {
  errorMessage: string | null;
  runId: string;
  status: "loading" | "ready" | "not_found" | "error";
}

export interface RunDetailValue {
  actions: RunDetailActions;
  meta: RunDetailMeta;
  state: RunDetailState;
}

const browserRunManagementApi = createBrowserRunManagementApi();
const RunManagementApiContext = createContext<RunManagementApi | null>(null);
const RunDetailContext = createContext<RunDetailValue | null>(null);

const planningPhaseDocumentKind: Record<RunPlanningPhaseId, DocumentResource["kind"]> = {
  specification: "specification",
  architecture: "architecture",
  "execution-plan": "execution_plan"
};

function buildEmptyPlanningDocumentState(
  phaseId: RunPlanningPhaseId
): RunPlanningDocumentEmptyState {
  return {
    document: null,
    phaseId,
    reason: "missing_document",
    revision: null,
    status: "empty"
  };
}

function buildEmptyRunDetailState(): RunDetailState {
  return {
    planningDocuments: {
      specification: buildEmptyPlanningDocumentState("specification"),
      architecture: buildEmptyPlanningDocumentState("architecture"),
      "execution-plan": buildEmptyPlanningDocumentState("execution-plan")
    },
    run: null,
    taskArtifacts: {},
    tasks: [],
    workflow: null
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function isNotFoundError(error: unknown) {
  return error instanceof RunManagementApiError && error.status === 404;
}

function findPlanningDocument(
  phaseId: RunPlanningPhaseId,
  documents: DocumentResource[]
) {
  const kind = planningPhaseDocumentKind[phaseId];

  return documents.find((document) => document.kind === kind) ?? null;
}

async function loadPlanningDocumentState(
  api: RunManagementApi,
  runId: string,
  phaseId: RunPlanningPhaseId,
  documents: DocumentResource[]
): Promise<RunPlanningDocumentState> {
  const document = findPlanningDocument(phaseId, documents);

  if (!document) {
    return buildEmptyPlanningDocumentState(phaseId);
  }

  if (!document.currentRevisionId) {
    return {
      document,
      phaseId,
      reason: "missing_revision",
      revision: null,
      status: "empty"
    };
  }

  try {
    const revision = await api.getRunDocumentRevision(
      runId,
      document.documentId,
      document.currentRevisionId
    );
    const content = await api.getDocumentContent(revision.contentUrl);

    return {
      content,
      document,
      phaseId,
      revision,
      status: "ready"
    };
  } catch (error) {
    return {
      document,
      errorMessage: getErrorMessage(error, "Unable to load the current document revision."),
      phaseId,
      revision: null,
      status: "error"
    };
  }
}

async function loadPlanningDocumentStates(
  api: RunManagementApi,
  runId: string,
  documents: DocumentResource[]
) {
  const phases: RunPlanningPhaseId[] = ["specification", "architecture", "execution-plan"];
  const states = await Promise.all(
    phases.map(async (phaseId) => [
      phaseId,
      await loadPlanningDocumentState(api, runId, phaseId, documents)
    ] as const)
  );

  return Object.fromEntries(states) as Record<RunPlanningPhaseId, RunPlanningDocumentState>;
}

export function RunManagementApiProvider({
  api = browserRunManagementApi,
  children
}: {
  api?: RunManagementApi;
  children: ReactNode;
}) {
  return (
    <RunManagementApiContext.Provider value={api}>{children}</RunManagementApiContext.Provider>
  );
}

export function RunDetailProvider({
  children,
  runId
}: {
  children: ReactNode;
  runId: string;
}) {
  const api = useRunManagementApi();
  const [value, setValue] = useState<RunDetailValue>(() => ({
    actions: {
      async loadTaskArtifacts() {},
      async reload() {}
    },
    meta: {
      errorMessage: null,
      runId,
      status: "loading"
    },
    state: buildEmptyRunDetailState()
  }));
  const requestIdRef = useRef(0);
  const taskArtifactRequestIdsRef = useRef(new Map<string, number>());

  async function loadRunDetail() {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    taskArtifactRequestIdsRef.current.clear();

    setValue((current) => ({
      ...current,
      meta: {
        errorMessage: null,
        runId,
        status: "loading"
      },
      state: buildEmptyRunDetailState()
    }));

    try {
      const [run, documents, workflow, tasks] = await Promise.all([
        api.getRun(runId),
        api.listRunDocuments(runId),
        api.getRunWorkflow(runId),
        api.listRunTasks(runId)
      ]);
      const planningDocuments = await loadPlanningDocumentStates(api, runId, documents);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setValue((current) => ({
        ...current,
        meta: {
          errorMessage: null,
          runId,
          status: "ready"
        },
        state: {
          planningDocuments,
          run,
          taskArtifacts: {},
          tasks,
          workflow
        }
      }));
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setValue((current) => ({
        ...current,
        meta: {
          errorMessage: getErrorMessage(error, "Unable to load this run."),
          runId,
          status: isNotFoundError(error) ? "not_found" : "error"
        },
        state: buildEmptyRunDetailState()
      }));
    }
  }

  async function loadTaskArtifacts(taskId: string, options: { force?: boolean } = {}) {
    let shouldRequest = true;
    const requestId = (taskArtifactRequestIdsRef.current.get(taskId) ?? 0) + 1;
    taskArtifactRequestIdsRef.current.set(taskId, requestId);

    setValue((current) => {
      if (current.meta.status !== "ready" || !current.state.run) {
        shouldRequest = false;
        return current;
      }

      const existing = current.state.taskArtifacts[taskId];

      if (
        !options.force &&
        (existing?.status === "loading" || existing?.status === "ready")
      ) {
        shouldRequest = false;
        return current;
      }

      return {
        ...current,
        state: {
          ...current.state,
          taskArtifacts: {
            ...current.state.taskArtifacts,
            [taskId]: {
              errorMessage: null,
              items: existing?.items ?? [],
              status: "loading"
            }
          }
        }
      };
    });

    if (!shouldRequest) {
      return;
    }

    try {
      const artifacts = await api.listTaskArtifacts(runId, taskId);

      if (taskArtifactRequestIdsRef.current.get(taskId) !== requestId) {
        return;
      }

      setValue((current) => {
        if (current.meta.status !== "ready") {
          return current;
        }

        return {
          ...current,
          state: {
            ...current.state,
            taskArtifacts: {
              ...current.state.taskArtifacts,
              [taskId]: {
                errorMessage: null,
                items: artifacts,
                status: "ready"
              }
            }
          }
        };
      });
    } catch (error) {
      if (taskArtifactRequestIdsRef.current.get(taskId) !== requestId) {
        return;
      }

      setValue((current) => {
        if (current.meta.status !== "ready") {
          return current;
        }

        return {
          ...current,
          state: {
            ...current.state,
            taskArtifacts: {
              ...current.state.taskArtifacts,
              [taskId]: {
                errorMessage: getErrorMessage(error, "Unable to load task artifacts."),
                items: [],
                status: "error"
              }
            }
          }
        };
      });
    }
  }

  useEffect(() => {
    void loadRunDetail();
  }, [api, runId]);

  const providedValue: RunDetailValue = {
    actions: {
      loadTaskArtifacts,
      reload: loadRunDetail
    },
    meta: value.meta,
    state: value.state
  };

  return <RunDetailContext.Provider value={providedValue}>{children}</RunDetailContext.Provider>;
}

export function useRunManagementApi() {
  const value = useContext(RunManagementApiContext);

  if (!value) {
    throw new Error("useRunManagementApi must be used within RunManagementApiProvider.");
  }

  return value;
}

export function useRunDetail() {
  const value = useContext(RunDetailContext);

  if (!value) {
    throw new Error("useRunDetail must be used within RunDetailProvider.");
  }

  return value;
}
