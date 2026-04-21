import { useEffect, useRef, useState } from "react";

import { buildRunPath } from "../../shared/navigation/run-phases";
import {
  useProjectManagement,
  useProjectManagementApi
} from "../projects/project-context";
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
  status: string;
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
  runs: ProjectRunRecord[];
  status: "loading" | "ready" | "empty" | "error";
}

export interface RunsIndexViewModel {
  compatibilityState?: RunsCompatibilityState;
  liveRuns: LiveRunRowViewModel[];
  retry: () => void;
  scaffoldRuns: ScaffoldRunRowViewModel[];
  title: string;
}

function formatRunTimestamp(value: string) {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.valueOf())) {
    return value;
  }

  return `${timestamp.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function buildLiveRunActivityLabel(run: ApiProjectRunRecord) {
  if (run.endedAt) {
    return `Ended ${formatRunTimestamp(run.endedAt)}`;
  }

  if (run.startedAt) {
    return `Started ${formatRunTimestamp(run.startedAt)}`;
  }

  if (run.compiledFrom) {
    return `Compiled ${formatRunTimestamp(run.compiledFrom.compiledAt)}`;
  }

  return "No recorded activity yet";
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
    latestActivityLabel: buildLiveRunActivityLabel(run),
    runId: run.runId,
    status: run.status,
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

export function useRunsIndexViewModel(): RunsIndexViewModel {
  const api = useProjectManagementApi();
  const { state } = useProjectManagement();
  const currentProject = state.currentProject;
  const requestIdRef = useRef(0);
  const [snapshot, setSnapshot] = useState<RunsSnapshot>({
    errorMessage: null,
    presentation: "live",
    runs: [],
    status: currentProject ? "loading" : "empty"
  });

  async function loadRuns(projectId: string) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setSnapshot({
      errorMessage: null,
      presentation: "live",
      runs: [],
      status: "loading"
    });

    try {
      const runs = await api.listProjectRuns(projectId);

      if (requestIdRef.current !== requestId) {
        return;
      }

      const firstRun = runs[0];

      setSnapshot({
        errorMessage: null,
        presentation: firstRun?.source === "scaffold" ? "scaffold" : "live",
        runs,
        status: runs.length > 0 ? "ready" : "empty"
      });
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setSnapshot({
        errorMessage: getRunsErrorMessage(error),
        presentation: "live",
        runs: [],
        status: "error"
      });
    }
  }

  useEffect(() => {
    if (!currentProject) {
      setSnapshot({
        errorMessage: null,
        presentation: "live",
        runs: [],
        status: "empty"
      });
      return;
    }

    void loadRuns(currentProject.projectId);
  }, [api, currentProject?.projectId]);

  if (!currentProject) {
    return {
      compatibilityState: {
        heading: "No project selected",
        message: "Choose a project before opening Runs."
      },
      liveRuns: [],
      retry() {},
      scaffoldRuns: [],
      title: "Runs"
    };
  }

  if (snapshot.status === "loading") {
    return {
      compatibilityState: {
        heading: "Loading runs",
        message: `Keystone is loading runs for ${currentProject.displayName}.`
      },
      liveRuns: [],
      retry() {
        void loadRuns(currentProject.projectId);
      },
      scaffoldRuns: [],
      title: "Runs"
    };
  }

  if (snapshot.status === "error") {
    return {
      compatibilityState: {
        heading: "Unable to load runs",
        message: snapshot.errorMessage ?? "Keystone could not load project runs."
      },
      liveRuns: [],
      retry() {
        void loadRuns(currentProject.projectId);
      },
      scaffoldRuns: [],
      title: "Runs"
    };
  }

  if (snapshot.status === "empty") {
    return {
      compatibilityState: {
        heading: "No runs yet",
        message: `${currentProject.displayName} does not have any recorded runs yet.`
      },
      liveRuns: [],
      retry() {
        void loadRuns(currentProject.projectId);
      },
      scaffoldRuns: [],
      title: "Runs"
    };
  }

  return {
    liveRuns:
      snapshot.presentation === "live"
        ? normalizeLiveRuns(snapshot.runs as ApiProjectRunRecord[])
        : [],
    retry() {
      void loadRuns(currentProject.projectId);
    },
    scaffoldRuns:
      snapshot.presentation === "scaffold"
        ? normalizeScaffoldRuns(snapshot.runs as ScaffoldProjectRunRecord[])
        : [],
    title: "Runs"
  };
}
