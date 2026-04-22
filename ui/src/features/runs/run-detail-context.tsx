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
  compileRun: () => Promise<RunCompileResult>;
  createPlanningDocument: (phaseId: RunPlanningPhaseId) => Promise<DocumentResource>;
  loadTaskArtifacts: (taskId: string, options?: { force?: boolean }) => Promise<void>;
  reload: () => Promise<void>;
  savePlanningDocument: (
    phaseId: RunPlanningPhaseId,
    input: {
      body: string;
      title: string;
    }
  ) => Promise<DocumentRevisionResource>;
}

export interface RunDetailMeta {
  errorMessage: string | null;
  runId: string;
  status: "loading" | "ready" | "not_found" | "error";
}

export interface RunCompileResult {
  cancelled?: boolean;
  executionAvailable: boolean;
  workflowPending?: boolean;
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

const planningPhaseDocumentPath: Record<RunPlanningPhaseId, string> = {
  specification: "specification",
  architecture: "architecture",
  "execution-plan": "execution-plan"
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

function buildEmptyWorkflowGraph(): WorkflowGraphResource {
  return {
    edges: [],
    nodes: [],
    summary: {
      activeTasks: 0,
      cancelledTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      pendingTasks: 0,
      readyTasks: 0,
      totalTasks: 0
    }
  };
}

interface LoadedRunDetailSnapshot {
  planningDocuments: Record<RunPlanningPhaseId, RunPlanningDocumentState>;
  run: RunResource;
  tasks: TaskResource[];
  workflow: WorkflowGraphResource;
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

function hasCompiledWorkflowData(input: {
  run: RunResource;
  workflow: WorkflowGraphResource;
}) {
  return input.run.compiledFrom !== null && input.workflow.summary.totalTasks > 0;
}

async function fetchRunDetailSnapshot(api: RunManagementApi, runId: string): Promise<LoadedRunDetailSnapshot> {
  const [run, documents, workflow, tasks] = await Promise.all([
    api.getRun(runId),
    api.listRunDocuments(runId),
    api.getRunWorkflow(runId),
    api.listRunTasks(runId)
  ]);
  const planningDocuments = await loadPlanningDocumentStates(api, runId, documents);

  return {
    planningDocuments,
    run,
    tasks,
    workflow
  };
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
      async compileRun() {
        throw new Error("Run detail is still loading.");
      },
      async createPlanningDocument() {
        throw new Error("Run detail is still loading.");
      },
      async loadTaskArtifacts() {},
      async reload() {},
      async savePlanningDocument() {
        throw new Error("Run detail is still loading.");
      }
    },
    meta: {
      errorMessage: null,
      runId,
      status: "loading"
    },
    state: buildEmptyRunDetailState()
  }));
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const taskArtifactRequestIdsRef = useRef(new Map<string, number>());
  const createPlanningDocumentRequestsRef = useRef(
    new Map<RunPlanningPhaseId, Promise<DocumentResource>>()
  );
  const compileRunRequestRef = useRef<Promise<RunCompileResult> | null>(null);
  const refreshRunDetailRequestRef = useRef<Promise<RunCompileResult> | null>(null);
  const savePlanningDocumentRequestsRef = useRef(
    new Map<RunPlanningPhaseId, Promise<DocumentRevisionResource>>()
  );
  const valueRef = useRef(value);
  valueRef.current = value;

  function setPlanningDocumentState(
    phaseId: RunPlanningPhaseId,
    planningDocumentState: RunPlanningDocumentState
  ) {
    setValue((current) => {
      if (current.meta.status !== "ready") {
        return current;
      }

      return {
        ...current,
        state: {
          ...current.state,
          planningDocuments: {
            ...current.state.planningDocuments,
            [phaseId]: planningDocumentState
          }
        }
      };
    });
  }

  async function reloadPlanningDocumentState(phaseId: RunPlanningPhaseId) {
    const documents = await api.listRunDocuments(runId);
    const planningDocumentState = await loadPlanningDocumentState(api, runId, phaseId, documents);

    setPlanningDocumentState(phaseId, planningDocumentState);

    return planningDocumentState;
  }

  function setRunDetailSnapshot(
    snapshot: LoadedRunDetailSnapshot,
    options: {
      requestId: number;
    }
  ) {
    if (requestIdRef.current !== options.requestId) {
      return false;
    }

    setValue((current) => ({
      ...current,
      meta: {
        errorMessage: null,
        runId,
        status: "ready"
      },
      state: {
        planningDocuments: snapshot.planningDocuments,
        run: snapshot.run,
        taskArtifacts: {},
        tasks: snapshot.tasks,
        workflow: snapshot.workflow
      }
    }));

    return true;
  }

  function isCurrentRunDetailRequest(requestId: number) {
    return isMountedRef.current && requestIdRef.current === requestId;
  }

  function seedAcceptedCompileState(run: RunResource) {
    setValue((current) => {
      if (current.meta.status !== "ready") {
        return current;
      }

      return {
        ...current,
        state: {
          ...current.state,
          run,
          taskArtifacts: {},
          tasks: [],
          workflow: buildEmptyWorkflowGraph()
        }
      };
    });
  }

  async function refreshRunDetail(): Promise<RunCompileResult> {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    taskArtifactRequestIdsRef.current.clear();

    if (!isCurrentRunDetailRequest(requestId)) {
      return {
        cancelled: true,
        executionAvailable: false
      };
    }

    const latestSnapshot = await fetchRunDetailSnapshot(api, runId);

    if (!isCurrentRunDetailRequest(requestId)) {
      return {
        cancelled: true,
        executionAvailable: false
      };
    }

    const executionAvailable = hasCompiledWorkflowData({
      run: latestSnapshot.run,
      workflow: latestSnapshot.workflow
    });
    const applied = setRunDetailSnapshot(latestSnapshot, {
      requestId
    });

    return {
      cancelled: !applied,
      executionAvailable
    };
  }

  async function reloadRunDetail() {
    if (valueRef.current.meta.status !== "ready") {
      await loadRunDetail();
      return;
    }

    const existingRequest = refreshRunDetailRequestRef.current;

    if (existingRequest) {
      await existingRequest;
      return;
    }

    const refreshRequest = refreshRunDetail();
    refreshRunDetailRequestRef.current = refreshRequest;

    try {
      await refreshRequest;
    } finally {
      if (refreshRunDetailRequestRef.current === refreshRequest) {
        refreshRunDetailRequestRef.current = null;
      }
    }
  }

  async function loadRunDetail() {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    taskArtifactRequestIdsRef.current.clear();
    createPlanningDocumentRequestsRef.current.clear();
    compileRunRequestRef.current = null;
    savePlanningDocumentRequestsRef.current.clear();

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
      const snapshot = await fetchRunDetailSnapshot(api, runId);

      setRunDetailSnapshot(snapshot, {
        requestId
      });
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

  async function compileRun() {
    const existingRequest = compileRunRequestRef.current;

    if (existingRequest) {
      return existingRequest;
    }

    const compileRequest = (async () => {
      if (valueRef.current.meta.status !== "ready") {
        throw new Error("Run detail is still loading.");
      }

      const compileAction = await api.compileRun(runId);
      seedAcceptedCompileState(compileAction.run);
      const refreshed = await refreshRunDetail();

      return {
        ...refreshed,
        workflowPending: compileAction.run.compiledFrom !== null && !refreshed.executionAvailable
      };
    })();

    compileRunRequestRef.current = compileRequest;

    try {
      return await compileRequest;
    } finally {
      if (compileRunRequestRef.current === compileRequest) {
        compileRunRequestRef.current = null;
      }
    }
  }

  async function createPlanningDocument(phaseId: RunPlanningPhaseId) {
    const existingRequest = createPlanningDocumentRequestsRef.current.get(phaseId);

    if (existingRequest) {
      return existingRequest;
    }

    const existingDocument = valueRef.current.state.planningDocuments[phaseId].document;

    if (existingDocument) {
      return existingDocument;
    }

    const createRequest = (async () => {
      try {
        const createdDocument = await api.createRunDocument(runId, {
          kind: planningPhaseDocumentKind[phaseId],
          path: planningPhaseDocumentPath[phaseId]
        });

        setPlanningDocumentState(phaseId, {
          document: createdDocument,
          phaseId,
          reason: "missing_revision",
          revision: null,
          status: "empty"
        });

        return createdDocument;
      } catch (error) {
        if (
          error instanceof RunManagementApiError &&
          error.code === "document_path_conflict"
        ) {
          const planningDocumentState = await reloadPlanningDocumentState(phaseId);

          if (planningDocumentState.document) {
            return planningDocumentState.document;
          }
        }

        throw error;
      }
    })();

    createPlanningDocumentRequestsRef.current.set(phaseId, createRequest);

    try {
      return await createRequest;
    } finally {
      if (createPlanningDocumentRequestsRef.current.get(phaseId) === createRequest) {
        createPlanningDocumentRequestsRef.current.delete(phaseId);
      }
    }
  }

  async function savePlanningDocument(
    phaseId: RunPlanningPhaseId,
    input: {
      body: string;
      title: string;
    }
  ) {
    const existingRequest = savePlanningDocumentRequestsRef.current.get(phaseId);

    if (existingRequest) {
      return existingRequest;
    }

    const saveRequest = (async () => {
      const planningDocument = valueRef.current.state.planningDocuments[phaseId].document;

      if (!planningDocument) {
        throw new Error("Create the document before saving a revision.");
      }

      const revision = await api.createRunDocumentRevision(runId, planningDocument.documentId, {
        body: input.body,
        contentType: "text/markdown; charset=utf-8",
        title: input.title
      });

      setPlanningDocumentState(phaseId, {
        content: input.body,
        document: {
          ...planningDocument,
          currentRevisionId: revision.documentRevisionId
        },
        phaseId,
        revision,
        status: "ready"
      });

      return revision;
    })();

    savePlanningDocumentRequestsRef.current.set(phaseId, saveRequest);

    try {
      return await saveRequest;
    } finally {
      if (savePlanningDocumentRequestsRef.current.get(phaseId) === saveRequest) {
        savePlanningDocumentRequestsRef.current.delete(phaseId);
      }
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
    isMountedRef.current = true;

    void loadRunDetail();

    return () => {
      isMountedRef.current = false;
      requestIdRef.current += 1;
      taskArtifactRequestIdsRef.current.clear();
      refreshRunDetailRequestRef.current = null;
    };
  }, [api, runId]);

  const providedValue: RunDetailValue = {
    actions: {
      compileRun,
      createPlanningDocument,
      loadTaskArtifacts,
      reload: reloadRunDetail,
      savePlanningDocument
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
