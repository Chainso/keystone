import { startTransition, useEffect, useRef, useState } from "react";

import type { ProjectTaskFilter } from "../../../../src/http/api/v1/projects/contracts";
import { buildRunTaskPath } from "../../shared/navigation/run-phases";
import {
  useProjectManagement,
  useProjectManagementApi
} from "../projects/project-context";
import type {
  ProjectTaskCollectionRecord,
  ProjectTaskRecord
} from "../projects/project-management-api";

export type WorkstreamFilterId = ProjectTaskFilter;

const defaultFilterId: WorkstreamFilterId = "active";
const pageSize = 25;

const filterDefinitions: Array<{
  filterId: WorkstreamFilterId;
  label: string;
}> = [
  {
    filterId: "all",
    label: "All"
  },
  {
    filterId: "active",
    label: "Active"
  },
  {
    filterId: "running",
    label: "Running"
  },
  {
    filterId: "queued",
    label: "Queued"
  },
  {
    filterId: "blocked",
    label: "Blocked"
  }
];

interface WorkstreamsSnapshot {
  errorMessage: string | null;
  page: ProjectTaskCollectionRecord | null;
  requestKey: string | null;
  status: "loading" | "ready" | "empty" | "error";
}

interface WorkstreamsContentState {
  actionLabel?: string;
  heading: string;
  kind: "loading" | "empty" | "error";
  message: string;
}

export interface WorkstreamRowViewModel {
  detailPath: string;
  rowId: string;
  runDisplayId: string;
  status: string;
  taskDisplayId: string;
  title: string;
  updatedLabel: string;
}

export interface WorkstreamFilterViewModel {
  filterId: WorkstreamFilterId;
  isActive: boolean;
  label: string;
}

export interface WorkstreamsPaginationViewModel {
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageCount: number;
  rangeLabel: string;
}

export interface WorkstreamsViewModel {
  contentState?: WorkstreamsContentState;
  filters: WorkstreamFilterViewModel[];
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  pagination: WorkstreamsPaginationViewModel;
  retry: () => void;
  rows: WorkstreamRowViewModel[];
  setActiveFilter: (filterId: WorkstreamFilterId) => void;
  title: string;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load workstreams.";
}

function formatUtcTimestamp(value: string) {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.valueOf())) {
    return value;
  }

  return `${timestamp.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function titleCaseToken(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatTaskStatusLabel(value: string) {
  switch (value.toLowerCase()) {
    case "active":
    case "running":
      return "Running";
    case "blocked":
      return "Blocked";
    case "ready":
    case "pending":
    case "queued":
      return "Queued";
    case "completed":
    case "complete":
      return "Complete";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return value
        .split(/[_\s-]+/)
        .filter((segment) => segment.length > 0)
        .map((segment) => titleCaseToken(segment.toLowerCase()))
        .join(" ");
  }
}

function buildWorkstreamSelectionKey(
  projectId: string | null,
  filterId: WorkstreamFilterId
) {
  return projectId ? `${projectId}:${filterId}` : null;
}

function buildWorkstreamRequestKey(
  projectId: string,
  filterId: WorkstreamFilterId,
  page: number
) {
  return `${projectId}:${filterId}:${page}`;
}

export function resolveTaskDisplayId(logicalTaskId: string, taskId: string) {
  return logicalTaskId.trim().length > 0 ? logicalTaskId : taskId;
}

function formatTaskUpdatedLabel(task: ProjectTaskRecord) {
  if (task.source === "api") {
    return formatUtcTimestamp(task.updatedAt);
  }

  return task.updatedLabel;
}

function buildRangeLabel(page: ProjectTaskCollectionRecord | null) {
  if (!page || page.total === 0) {
    return "Showing 0 of 0 tasks";
  }

  const rangeStart = (page.page - 1) * page.pageSize + 1;
  const rangeEnd = rangeStart + page.items.length - 1;

  return `Showing ${rangeStart}-${rangeEnd} of ${page.total} tasks`;
}

export function buildEmptyState(
  filterId: WorkstreamFilterId,
  projectName: string
): WorkstreamsContentState {
  switch (filterId) {
    case "all":
      return {
        heading: "No workstreams yet",
        kind: "empty",
        message: `${projectName} does not have any recorded tasks yet.`
      };
    case "active":
      return {
        heading: "No active workstreams",
        kind: "empty",
        message: `${projectName} does not have any running, queued, or blocked tasks right now.`
      };
    default: {
      const filter = filterDefinitions.find((candidate) => candidate.filterId === filterId);

      return {
        heading: "No workstreams match this filter",
        kind: "empty",
        message: `No workstreams match the ${filter?.label.toLowerCase() ?? "current"} filter right now.`
      };
    }
  }
}

export function useWorkstreamsViewModel(): WorkstreamsViewModel {
  const api = useProjectManagementApi();
  const projectManagement = useProjectManagement();
  const currentProject = projectManagement.state.currentProject;
  const requestIdRef = useRef(0);
  const [activeFilterId, setActiveFilterId] = useState<WorkstreamFilterId>(defaultFilterId);
  const [paginationState, setPaginationState] = useState<{
    page: number;
    selectionKey: string | null;
  }>({
    page: 1,
    selectionKey: null
  });
  const [snapshot, setSnapshot] = useState<WorkstreamsSnapshot>({
    errorMessage: null,
    page: null,
    requestKey: null,
    status: "loading"
  });
  const selectionKey = buildWorkstreamSelectionKey(currentProject?.projectId ?? null, activeFilterId);
  const currentPage = paginationState.selectionKey === selectionKey ? paginationState.page : 1;
  const currentRequestKey = currentProject
    ? buildWorkstreamRequestKey(currentProject.projectId, activeFilterId, currentPage)
    : null;
  const isSnapshotCurrent = currentRequestKey !== null && snapshot.requestKey === currentRequestKey;
  const visiblePage = isSnapshotCurrent ? snapshot.page : null;
  const visibleStatus =
    currentProject === null
      ? projectManagement.meta.status === "error"
        ? "error"
        : projectManagement.meta.status === "empty"
          ? "empty"
          : "loading"
      : isSnapshotCurrent
        ? snapshot.status
        : "loading";

  function loadWorkstreams(projectId: string, page = currentPage, filter = activeFilterId) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const requestKey = buildWorkstreamRequestKey(projectId, filter, page);

    setSnapshot({
      errorMessage: null,
      page: null,
      requestKey,
      status: "loading"
    });

    void api
      .listProjectTasks(projectId, {
        filter,
        page,
        pageSize
      })
      .then((nextPage) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setSnapshot({
          errorMessage: null,
          page: nextPage,
          requestKey,
          status: nextPage.total === 0 ? "empty" : "ready"
        });
      })
      .catch((error) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setSnapshot({
          errorMessage: getErrorMessage(error),
          page: null,
          requestKey,
          status: "error"
        });
      });
  }

  useEffect(() => {
    if (!currentProject) {
      return;
    }

    loadWorkstreams(currentProject.projectId, currentPage, activeFilterId);
  }, [api, currentProject?.projectId, activeFilterId, currentPage]);

  const rows = (visiblePage?.items ?? []).map((task) => ({
    detailPath: buildRunTaskPath(task.runId, task.taskId),
    rowId: `${task.runId}-${task.taskId}`,
    runDisplayId: task.runId,
    status: formatTaskStatusLabel(task.status),
    taskDisplayId: resolveTaskDisplayId(task.logicalTaskId, task.taskId),
    title: task.title,
    updatedLabel: formatTaskUpdatedLabel(task)
  }));
  const contentState =
    visibleStatus === "loading"
      ? ({
          heading: "Loading workstreams",
          kind: "loading",
          message: currentProject
            ? `Keystone is loading project tasks for ${currentProject.displayName}.`
            : "Keystone is loading project tasks."
        } satisfies WorkstreamsContentState)
      : visibleStatus === "error"
        ? ({
            actionLabel: "Retry",
            heading: "Unable to load workstreams",
            kind: "error",
            message:
              snapshot.errorMessage ??
              projectManagement.meta.errorMessage ??
              "Keystone could not load project tasks."
          } satisfies WorkstreamsContentState)
        : visibleStatus === "empty"
          ? currentProject
            ? buildEmptyState(activeFilterId, currentProject.displayName)
            : ({
                heading: "No projects yet",
                kind: "empty",
                message: "Create a project to start tracking workstreams."
              } satisfies WorkstreamsContentState)
          : undefined;

  return {
    ...(contentState ? { contentState } : {}),
    filters: filterDefinitions.map((filter) => ({
      filterId: filter.filterId,
      isActive: filter.filterId === activeFilterId,
      label: filter.label
    })),
    goToNextPage() {
      if (!visiblePage || currentPage >= visiblePage.pageCount) {
        return;
      }

      startTransition(() => {
        setPaginationState({
          page: currentPage + 1,
          selectionKey
        });
      });
    },
    goToPreviousPage() {
      if (currentPage <= 1) {
        return;
      }

      startTransition(() => {
        setPaginationState({
          page: currentPage - 1,
          selectionKey
        });
      });
    },
    pagination: {
      currentPage,
      hasNextPage: visiblePage ? currentPage < visiblePage.pageCount : false,
      hasPreviousPage: currentPage > 1,
      pageCount: visiblePage?.pageCount ?? 1,
      rangeLabel: buildRangeLabel(visiblePage)
    },
    retry() {
      if (currentProject) {
        loadWorkstreams(currentProject.projectId, currentPage, activeFilterId);
        return;
      }

      void projectManagement.actions.reloadProjects();
    },
    rows,
    setActiveFilter(filterId) {
      startTransition(() => {
        setActiveFilterId(filterId);
        setPaginationState({
          page: 1,
          selectionKey: buildWorkstreamSelectionKey(currentProject?.projectId ?? null, filterId)
        });
      });
    },
    title: "Active and queued project work"
  };
}
