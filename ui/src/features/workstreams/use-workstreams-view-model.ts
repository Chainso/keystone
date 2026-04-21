import { useState } from "react";

import { useResourceModel } from "../resource-model/context";
import {
  getProject,
  listProjectWorkstreamTasks,
  type WorkstreamTaskSummary
} from "../resource-model/selectors";
import { useCurrentProject } from "../projects/project-context";

export type WorkstreamFilterId = "all" | "running" | "queued" | "blocked";

const pageSize = 25;

const filterDefinitions: Array<{
  filterId: WorkstreamFilterId;
  label: string;
  matches: (row: WorkstreamTaskSummary) => boolean;
}> = [
  {
    filterId: "all",
    label: "All",
    matches: () => true
  },
  {
    filterId: "running",
    label: "Running",
    matches: (row) => row.status === "Running"
  },
  {
    filterId: "queued",
    label: "Queued",
    matches: (row) => row.status === "Queued"
  },
  {
    filterId: "blocked",
    label: "Blocked",
    matches: (row) => row.status === "Blocked"
  }
];

export interface WorkstreamRowViewModel {
  rowId: string;
  taskDisplayId: string;
  title: string;
  runDisplayId: string;
  status: string;
  updatedLabel: string;
  detailPath: string;
}

export interface WorkstreamFilterViewModel {
  filterId: WorkstreamFilterId;
  label: string;
  isActive: boolean;
}

export interface WorkstreamsPaginationViewModel {
  currentPage: number;
  pageCount: number;
  rangeLabel: string;
}

export interface WorkstreamsViewModel {
  compatibilityState?: {
    heading: string;
    message: string;
  };
  title: string;
  filters: WorkstreamFilterViewModel[];
  rows: WorkstreamRowViewModel[];
  pagination: WorkstreamsPaginationViewModel;
  setActiveFilter: (filterId: WorkstreamFilterId) => void;
}

function isVisibleWorkstream(row: WorkstreamTaskSummary) {
  return row.status === "Running" || row.status === "Queued" || row.status === "Blocked";
}

export function useWorkstreamsViewModel(): WorkstreamsViewModel {
  const currentProject = useCurrentProject();
  const { state } = useResourceModel();
  const [activeFilterId, setActiveFilterId] = useState<WorkstreamFilterId>("all");
  const scaffoldProject = getProject(currentProject.projectId, state.dataset);

  const activeFilter =
    filterDefinitions.find((filter) => filter.filterId === activeFilterId) ?? filterDefinitions[0]!;

  if (!scaffoldProject) {
    return {
      compatibilityState: {
        heading: "Workstreams are not available for this project yet",
        message:
          "Project workstreams still depend on scaffold-backed task data. Switch to a scaffold-backed project to use this screen."
      },
      title: "Active and queued project work",
      filters: [],
      rows: [],
      pagination: {
        currentPage: 1,
        pageCount: 1,
        rangeLabel: "Showing 0 of 0 tasks"
      },
      setActiveFilter() {}
    };
  }

  const projectRows = listProjectWorkstreamTasks(currentProject.projectId, state.dataset).filter(
    isVisibleWorkstream
  );
  const filteredRows = projectRows.filter(activeFilter.matches);
  const visibleRows = filteredRows.slice(0, pageSize);
  const rangeEnd = visibleRows.length === 0 ? 0 : visibleRows.length;

  return {
    title: "Active and queued project work",
    filters: filterDefinitions.map((filter) => ({
      filterId: filter.filterId,
      label: filter.label,
      isActive: filter.filterId === activeFilterId
    })),
    rows: visibleRows.map((row) => ({
      rowId: row.rowId,
      taskDisplayId: row.taskDisplayId,
      title: row.title,
      runDisplayId: row.runDisplayId,
      status: row.status,
      updatedLabel: row.updatedLabel,
      detailPath: row.detailPath
    })),
    pagination: {
      currentPage: 1,
      pageCount: Math.max(1, Math.ceil(filteredRows.length / pageSize)),
      rangeLabel: filteredRows.length === 0 ? "Showing 0 of 0 tasks" : `Showing 1-${rangeEnd} of ${filteredRows.length} tasks`
    },
    setActiveFilter(filterId) {
      setActiveFilterId(filterId);
    }
  };
}
