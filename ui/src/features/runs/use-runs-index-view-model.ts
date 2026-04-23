import { useEffect, useRef, useState } from "react";

import { buildRunPath } from "../../shared/navigation/run-phases";
import {
  useProjectManagement,
  useProjectManagementApi
} from "../projects/project-context";
import { useRunManagementApi } from "./run-detail-context";
import { buildRunActivityLabel, getRunStatusPresentation } from "./run-status";
import type { StatusTone } from "../../shared/layout/status-pill";
import type {
  ApiProjectRunRecord,
  ProjectRunRecord,
  ScaffoldProjectRunRecord
} from "../projects/project-management-api";

interface RunsCompatibilityState {
  heading: string;
  message: string;
}

interface LiveRunRowViewModel {
  detailPath: string;
  executionEngine: string;
  latestActivityLabel: string;
  runId: string;
  statusLabel: string;
  statusTone: StatusTone;
  workflowInstanceId: string;
}

interface ScaffoldRunRowViewModel {
  detailPath: string;
  displayId: string;
  runId: string;
  stageLabel: string;
  status: string;
  summary: string;
  updatedLabel: string;
}

interface RunsSnapshot {
  errorMessage: string | null;
  presentation: "live" | "scaffold";
  projectId: string | null;
  runs: ProjectRunRecord[];
  status: "loading" | "ready" | "empty" | "error";
}

export interface RunsIndexViewModel {
  canCreateRun: boolean;
  compatibilityState?: RunsCompatibilityState;
  createRun: () => Promise<string | null>;
  createRunErrorMessage: string | null;
  isCreatingRun: boolean;
  liveRuns: LiveRunRowViewModel[];
  retry: () => void;
  scaffoldRuns: ScaffoldRunRowViewModel[];
  title: string;
}

function getRunsErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load runs.";
}

function normalizeLiveRuns(runs: ApiProjectRunRecord[]): LiveRunRowViewModel[] {
  return runs.map((run) => ({
    detailPath: buildRunPath(run.runId),
    executionEngine: run.executionEngine,
    latestActivityLabel: buildRunActivityLabel({
      compiledAt: run.compiledFrom?.compiledAt ?? null,
      endedAt: run.endedAt,
      startedAt: run.startedAt
    }),
    runId: run.runId,
    ...getRunStatusPresentation(run.status),
    workflowInstanceId: run.workflowInstanceId
  }));
}

function normalizeScaffoldRuns(runs: ScaffoldProjectRunRecord[]): ScaffoldRunRowViewModel[] {
  return runs.map((run) => ({
    detailPath: run.detailPath,
    displayId: run.displayId,
    runId: run.runId,
    stageLabel: run.stageLabel,
    status: run.status,
    summary: run.summary,
    updatedLabel: run.updatedLabel
  }));
}

export function resolveRunsSnapshotForProject(
  snapshot: RunsSnapshot,
  projectId: string | null
): RunsSnapshot {
  if (!projectId || snapshot.projectId === projectId) {
    return snapshot;
  }

  return {
    errorMessage: null,
    presentation: "live",
    projectId,
    runs: [],
    status: "loading"
  };
}

export function useRunsIndexViewModel(): RunsIndexViewModel {
  const api = useProjectManagementApi();
  const runApi = useRunManagementApi();
  const { state } = useProjectManagement();
  const currentProject = state.currentProject;
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const createRunRequestIdRef = useRef(0);
  const createRunRequestRef = useRef<Promise<string | null> | null>(null);
  const [snapshot, setSnapshot] = useState<RunsSnapshot>({
    errorMessage: null,
    presentation: "live",
    projectId: currentProject?.projectId ?? null,
    runs: [],
    status: currentProject ? "loading" : "empty"
  });
  const [createRunState, setCreateRunState] = useState<{
    errorMessage: string | null;
    status: "idle" | "submitting";
  }>({
    errorMessage: null,
    status: "idle"
  });

  async function loadRuns(projectId: string) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setSnapshot({
      errorMessage: null,
      presentation: "live",
      projectId,
      runs: [],
      status: "loading"
    });

    try {
      const runs = await api.listProjectRuns(projectId);

      if (!isMountedRef.current || requestIdRef.current !== requestId) {
        return;
      }

      const firstRun = runs[0];

      setSnapshot({
        errorMessage: null,
        presentation: firstRun?.source === "scaffold" ? "scaffold" : "live",
        projectId,
        runs,
        status: runs.length > 0 ? "ready" : "empty"
      });
    } catch (error) {
      if (!isMountedRef.current || requestIdRef.current !== requestId) {
        return;
      }

      setSnapshot({
        errorMessage: getRunsErrorMessage(error),
        presentation: "live",
        projectId,
        runs: [],
        status: "error"
      });
    }
  }

  async function createRun() {
    if (!currentProject) {
      throw new Error("Choose a project before creating a run.");
    }

    const existingRequest = createRunRequestRef.current;

    if (existingRequest) {
      return existingRequest;
    }

    const requestId = createRunRequestIdRef.current + 1;
    createRunRequestIdRef.current = requestId;

    const createRequest = (async () => {
      setCreateRunState({
        errorMessage: null,
        status: "submitting"
      });

      try {
        const run = await runApi.createRun(currentProject.projectId);

        if (isMountedRef.current && createRunRequestIdRef.current === requestId) {
          setCreateRunState({
            errorMessage: null,
            status: "idle"
          });

          return run.runId;
        }

        return null;
      } catch (error) {
        if (isMountedRef.current && createRunRequestIdRef.current === requestId) {
          setCreateRunState({
            errorMessage: getRunsErrorMessage(error),
            status: "idle"
          });
        }

        throw error;
      }
    })();

    createRunRequestRef.current = createRequest;

    try {
      return await createRequest;
    } finally {
      if (createRunRequestRef.current === createRequest) {
        createRunRequestRef.current = null;
      }
    }
  }

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      requestIdRef.current += 1;
      createRunRequestIdRef.current += 1;
      createRunRequestRef.current = null;
    };
  }, []);

  useEffect(() => {
    createRunRequestIdRef.current += 1;
    createRunRequestRef.current = null;
    setCreateRunState({
      errorMessage: null,
      status: "idle"
    });

    if (!currentProject) {
      setSnapshot({
        errorMessage: null,
        presentation: "live",
        projectId: null,
        runs: [],
        status: "empty"
      });
      return;
    }

    void loadRuns(currentProject.projectId);
  }, [api, currentProject?.projectId]);

  if (!currentProject) {
    return {
      canCreateRun: false,
      compatibilityState: {
        heading: "No project selected",
        message: "Choose a project before opening Runs."
      },
      async createRun() {
        throw new Error("Choose a project before creating a run.");
      },
      createRunErrorMessage: null,
      isCreatingRun: false,
      liveRuns: [],
      retry() {},
      scaffoldRuns: [],
      title: "Runs"
    };
  }

  const currentSnapshot = resolveRunsSnapshotForProject(snapshot, currentProject.projectId);

  if (currentSnapshot.status === "loading") {
    return {
      canCreateRun: createRunState.status !== "submitting",
      compatibilityState: {
        heading: "Loading runs",
        message: `Keystone is loading runs for ${currentProject.displayName}.`
      },
      createRun,
      createRunErrorMessage: createRunState.errorMessage,
      isCreatingRun: createRunState.status === "submitting",
      liveRuns: [],
      retry() {
        void loadRuns(currentProject.projectId);
      },
      scaffoldRuns: [],
      title: "Runs"
    };
  }

  if (currentSnapshot.status === "error") {
    return {
      canCreateRun: createRunState.status !== "submitting",
      compatibilityState: {
        heading: "Unable to load runs",
        message: currentSnapshot.errorMessage ?? "Keystone could not load project runs."
      },
      createRun,
      createRunErrorMessage: createRunState.errorMessage,
      isCreatingRun: createRunState.status === "submitting",
      liveRuns: [],
      retry() {
        void loadRuns(currentProject.projectId);
      },
      scaffoldRuns: [],
      title: "Runs"
    };
  }

  if (currentSnapshot.status === "empty") {
    return {
      canCreateRun: createRunState.status !== "submitting",
      compatibilityState: {
        heading: "No runs yet",
        message: `${currentProject.displayName} does not have any recorded runs yet.`
      },
      createRun,
      createRunErrorMessage: createRunState.errorMessage,
      isCreatingRun: createRunState.status === "submitting",
      liveRuns: [],
      retry() {
        void loadRuns(currentProject.projectId);
      },
      scaffoldRuns: [],
      title: "Runs"
    };
  }

  return {
    canCreateRun: createRunState.status !== "submitting",
    createRun,
    createRunErrorMessage: createRunState.errorMessage,
    isCreatingRun: createRunState.status === "submitting",
    liveRuns:
      currentSnapshot.presentation === "live"
        ? normalizeLiveRuns(currentSnapshot.runs as ApiProjectRunRecord[])
        : [],
    retry() {
      void loadRuns(currentProject.projectId);
    },
    scaffoldRuns:
      currentSnapshot.presentation === "scaffold"
        ? normalizeScaffoldRuns(currentSnapshot.runs as ScaffoldProjectRunRecord[])
        : [],
    title: "Runs"
  };
}
