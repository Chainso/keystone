import { startTransition, useEffect, useRef, useState } from "react";

import type { ProjectTaskFilter } from "../../../../src/http/api/v1/projects/contracts";
import { buildRunTaskPath } from "../../shared/navigation/run-phases";
import { useCurrentProject, useProjectManagementApi } from "../projects/project-context";
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

function resolveTaskDisplayId(logicalTaskId: string, taskId: string) {
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

function buildEmptyState(
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
  const currentProject = useCurrentProject();
  const requestIdRef = useRef(0);
  const [activeFilterId, setActiveFilterId] = useState<WorkstreamFilterId>(defaultFilterId);
  const [currentPage, setCurrentPage] = useState(1);
  const [snapshot, setSnapshot] = useState<WorkstreamsSnapshot>({
    errorMessage: null,
    page: null,
    status: "loading"
  });

  function loadWorkstreams(page = currentPage, filter = activeFilterId) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setSnapshot({
      errorMessage: null,
      page: null,
      status: "loading"
    });

    void api
      .listProjectTasks(currentProject.projectId, {
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
          status: "error"
        });
      });
  }

  useEffect(() => {
    loadWorkstreams();
  }, [api, currentProject.projectId, activeFilterId, currentPage]);

  useEffect(() => {
    startTransition(() => {
      setCurrentPage(1);
    });
  }, [currentProject.projectId]);

  const currentFilter =
    filterDefinitions.find((filter) => filter.filterId === activeFilterId) ?? filterDefinitions[0]!;
  const rows = (snapshot.page?.items ?? []).map((task) => ({
    detailPath: buildRunTaskPath(task.runId, task.taskId),
    rowId: `${task.runId}-${task.taskId}`,
    runDisplayId: task.runId,
    status: formatTaskStatusLabel(task.status),
    taskDisplayId: resolveTaskDisplayId(task.logicalTaskId, task.taskId),
    title: task.title,
    updatedLabel: formatTaskUpdatedLabel(task)
  }));
  const contentState =
    snapshot.status === "loading"
      ? ({
          heading: "Loading workstreams",
          kind: "loading",
          message: `Keystone is loading project tasks for ${currentProject.displayName}.`
        } satisfies WorkstreamsContentState)
      : snapshot.status === "error"
        ? ({
            actionLabel: "Retry",
            heading: "Unable to load workstreams",
            kind: "error",
            message: snapshot.errorMessage ?? "Keystone could not load project tasks."
          } satisfies WorkstreamsContentState)
        : snapshot.status === "empty"
          ? buildEmptyState(activeFilterId, currentProject.displayName)
          : undefined;

  return {
    ...(contentState ? { contentState } : {}),
    filters: filterDefinitions.map((filter) => ({
      filterId: filter.filterId,
      isActive: filter.filterId === activeFilterId,
      label: filter.label
    })),
    goToNextPage() {
      if (!snapshot.page || currentPage >= snapshot.page.pageCount) {
        return;
      }

      startTransition(() => {
        setCurrentPage((page) => page + 1);
      });
    },
    goToPreviousPage() {
      if (currentPage <= 1) {
        return;
      }

      startTransition(() => {
        setCurrentPage((page) => page - 1);
      });
    },
    pagination: {
      currentPage,
      hasNextPage: snapshot.page ? currentPage < snapshot.page.pageCount : false,
      hasPreviousPage: currentPage > 1,
      pageCount: snapshot.page?.pageCount ?? 1,
      rangeLabel: buildRangeLabel(snapshot.page)
    },
    retry() {
      loadWorkstreams();
    },
    rows,
    setActiveFilter(filterId) {
      startTransition(() => {
        setActiveFilterId(filterId);
        setCurrentPage(1);
      });
    },
    title: "Active and queued project work"
  };
}
