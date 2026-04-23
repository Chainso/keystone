import { startTransition, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type { ProjectTaskFilter } from "../../../../src/http/api/v1/projects/contracts";
import { formatUtcTimestamp } from "../../shared/formatting/date";
import type { StatusTone } from "../../shared/layout/status-pill";
import { buildRunTaskPath } from "../../shared/navigation/run-phases";
import {
  parsePositiveIntegerSearchParam,
  parseSearchParamEnum,
  updateSearchParams
} from "../../shared/navigation/search-param-state";
import {
  useProjectManagement,
  useProjectManagementApi
} from "../projects/project-context";
import type {
  ProjectTaskCollectionRecord,
  ProjectTaskRecord
} from "../projects/project-management-api";
import { getTaskStatusTone } from "../runs/run-status";

export type WorkstreamFilterId = ProjectTaskFilter;

const defaultFilterId: WorkstreamFilterId = "active";
const pageSize = 25;
const pageSearchParamKey = "page";
const filterSearchParamKey = "filter";
const workstreamsTitle = "Workstreams";

const filterDefinitions: Array<{
  description: string;
  filterId: WorkstreamFilterId;
  label: string;
}> = [
  {
    description: "Include completed and terminal work alongside active execution tasks across every run.",
    filterId: "all",
    label: "All"
  },
  {
    description: "Focus on running, queued, and blocked work that still needs operator attention.",
    filterId: "active",
    label: "Active"
  },
  {
    description: "Show only work that is currently executing inside the run workflow.",
    filterId: "running",
    label: "Running"
  },
  {
    description: "Show work that is ready or pending while it waits to enter execution.",
    filterId: "queued",
    label: "Queued"
  },
  {
    description: "Show only work that is waiting on unresolved blockers or prerequisites.",
    filterId: "blocked",
    label: "Blocked"
  }
];
const filterIds = filterDefinitions.map((filter) => filter.filterId);

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
  statusTone: StatusTone;
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
  pageSize: number;
  rangeLabel: string;
}

export interface WorkstreamsViewModel {
  activeFilterDescription: string;
  currentProjectLabel: string;
  contentState?: WorkstreamsContentState;
  filters: WorkstreamFilterViewModel[];
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  pagination: WorkstreamsPaginationViewModel;
  pageSizeLabel: string;
  recordSummaryLabel: string;
  retry: () => void;
  routeGuidance: string;
  rows: WorkstreamRowViewModel[];
  setActiveFilter: (filterId: WorkstreamFilterId) => void;
  summary: string;
  title: string;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load workstreams.";
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

function buildWorkstreamRequestKey(projectId: string, filterId: WorkstreamFilterId, page: number) {
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
  if (!page) {
    return "Showing 0 of 0 tasks";
  }

  if (page.total === 0 || page.items.length === 0) {
    return `Showing 0 of ${page.total} tasks`;
  }

  const rangeStart = (page.page - 1) * page.pageSize + 1;
  const rangeEnd = rangeStart + page.items.length - 1;

  return `Showing ${rangeStart}-${rangeEnd} of ${page.total} tasks`;
}

function isOutOfRangePage(page: ProjectTaskCollectionRecord) {
  return page.total > 0 && page.items.length === 0 && page.page > page.pageCount;
}

function buildWorkstreamsSummary(
  filterId: WorkstreamFilterId,
  projectName: string | null
) {
  if (!projectName) {
    return "Choose a project to inspect task execution across runs.";
  }

  switch (filterId) {
    case "all":
      return `Review every recorded task across every run in ${projectName}.`;
    case "running":
      return `Monitor work that is currently executing across every run in ${projectName}.`;
    case "queued":
      return `Inspect ready and pending work that is waiting to enter execution in ${projectName}.`;
    case "blocked":
      return `Surface blocked work that needs intervention across every run in ${projectName}.`;
    case "active":
    default:
      return `Track running, queued, and blocked work across every run in ${projectName}.`;
  }
}

function buildRecordSummaryLabel(
  page: ProjectTaskCollectionRecord | null,
  status: "loading" | "ready" | "empty" | "error",
  currentProjectName: string | null
) {
  if (!currentProjectName) {
    return "Project selection required";
  }

  if (status === "loading") {
    return "Loading tasks";
  }

  if (status === "error") {
    return "Task list unavailable";
  }

  const total = page?.total ?? 0;

  return `${total} matching ${total === 1 ? "task" : "tasks"}`;
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
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const previousProjectIdRef = useRef<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedFilterId = searchParams.get(filterSearchParamKey);
  const activeFilterId = parseSearchParamEnum(
    requestedFilterId,
    filterIds,
    defaultFilterId
  );
  const requestedPage = parsePositiveIntegerSearchParam(
    searchParams.get(pageSearchParamKey),
    1
  );
  const currentProjectId = currentProject?.projectId ?? null;
  const projectChanged =
    previousProjectIdRef.current !== null &&
    currentProjectId !== null &&
    previousProjectIdRef.current !== currentProjectId;
  const shouldResetPageForProjectChange = projectChanged && requestedPage !== 1;
  const currentPage = projectChanged ? 1 : requestedPage;
  const [snapshot, setSnapshot] = useState<WorkstreamsSnapshot>({
    errorMessage: null,
    page: null,
    requestKey: null,
    status: "loading"
  });
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

  function setWorkstreamsSearchState(
    filterId: WorkstreamFilterId,
    page: number,
    options?: { replace?: boolean }
  ) {
    setSearchParams(
      updateSearchParams(searchParams, {
        [filterSearchParamKey]: filterId === defaultFilterId ? null : filterId,
        [pageSearchParamKey]: page > 1 ? page : null
      }),
      options
    );
  }

  function loadWorkstreams(
    projectId: string,
    options: {
      filter: WorkstreamFilterId;
      page: number;
    }
  ) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const requestKey = buildWorkstreamRequestKey(projectId, options.filter, options.page);

    setSnapshot({
      errorMessage: null,
      page: null,
      requestKey,
      status: "loading"
    });

    void api
      .listProjectTasks(projectId, {
        filter: options.filter,
        page: options.page,
        pageSize
      })
      .then((nextPage) => {
        if (!isMountedRef.current || requestIdRef.current !== requestId) {
          return;
        }

        if (isOutOfRangePage(nextPage)) {
          const resetPage = nextPage.pageCount;

          setWorkstreamsSearchState(options.filter, resetPage, { replace: true });
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
        if (!isMountedRef.current || requestIdRef.current !== requestId) {
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
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    previousProjectIdRef.current = currentProjectId;
  }, [currentProjectId]);

  useEffect(() => {
    if (shouldResetPageForProjectChange) {
      setWorkstreamsSearchState(activeFilterId, 1, { replace: true });
    }
  }, [
    activeFilterId,
    searchParams,
    setSearchParams,
    shouldResetPageForProjectChange
  ]);

  useEffect(() => {
    if (!currentProject || shouldResetPageForProjectChange) {
      return;
    }

    loadWorkstreams(currentProject.projectId, {
      filter: activeFilterId,
      page: currentPage
    });
  }, [
    api,
    currentProject?.projectId,
    activeFilterId,
    currentPage,
    shouldResetPageForProjectChange
  ]);

  const rows = (visiblePage?.items ?? []).map((task) => {
    return {
      detailPath: buildRunTaskPath(task.runId, task.taskId),
      rowId: `${task.runId}-${task.taskId}`,
      runDisplayId: task.runId,
      status: formatTaskStatusLabel(task.status),
      statusTone: getTaskStatusTone(task.status),
      taskDisplayId: resolveTaskDisplayId(task.logicalTaskId, task.taskId),
      title: task.title,
      updatedLabel: formatTaskUpdatedLabel(task)
    };
  });
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
  const activeFilterDefinition =
    filterDefinitions.find((filter) => filter.filterId === activeFilterId) ?? filterDefinitions[1]!;
  const currentProjectName = currentProject?.displayName ?? null;
  const resolvedPageSize = visiblePage?.pageSize ?? pageSize;

  return {
    activeFilterDescription: activeFilterDefinition.description,
    currentProjectLabel: currentProject?.displayName ?? "No project selected",
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
        setWorkstreamsSearchState(activeFilterId, currentPage + 1);
      });
    },
    goToPreviousPage() {
      if (currentPage <= 1) {
        return;
      }

      startTransition(() => {
        setWorkstreamsSearchState(activeFilterId, currentPage - 1);
      });
    },
    pagination: {
      currentPage,
      hasNextPage: visiblePage ? currentPage < visiblePage.pageCount : false,
      hasPreviousPage: currentPage > 1,
      pageSize: resolvedPageSize,
      pageCount: visiblePage?.pageCount ?? 1,
      rangeLabel: buildRangeLabel(visiblePage)
    },
    pageSizeLabel: `${resolvedPageSize} per page`,
    recordSummaryLabel: buildRecordSummaryLabel(
      visiblePage,
      visibleStatus,
      currentProjectName
    ),
    retry() {
      if (currentProject) {
        loadWorkstreams(currentProject.projectId, {
          filter: activeFilterId,
          page: currentPage
        });
        return;
      }

      void projectManagement.actions.reloadProjects();
    },
    routeGuidance:
      "Rows open the matching task inside Runs > Execution without leaving the selected project.",
    rows,
    setActiveFilter(filterId) {
      startTransition(() => {
        setWorkstreamsSearchState(filterId, 1);
      });
    },
    summary: buildWorkstreamsSummary(activeFilterId, currentProjectName),
    title: workstreamsTitle
  };
}
