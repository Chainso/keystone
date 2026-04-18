import { useState } from "react";

import { buildRunTaskPath } from "../../shared/navigation/run-phases";
import { useCurrentProject } from "../projects/project-context";

type WorkstreamFilterId = "all" | "running" | "queued" | "blocked";

interface WorkstreamRowScaffold {
  rowId: string;
  taskDisplayId: string;
  title: string;
  runDisplayId: string;
  status: string;
  updatedLabel: string;
  detailPath: string;
  note: string;
}

const workstreamRows: WorkstreamRowScaffold[] = [
  {
    rowId: "run-104-task-032",
    taskDisplayId: "TASK-032",
    title: "Build execution drill-down",
    runDisplayId: "Run-104",
    status: "Running",
    updatedLabel: "2m ago",
    detailPath: buildRunTaskPath("run-104", "task-032"),
    note: "Execution drill-down remains a structural route handoff in the scaffold."
  },
  {
    rowId: "run-104-task-034",
    taskDisplayId: "TASK-034",
    title: "Documentation alignment",
    runDisplayId: "Run-104",
    status: "Queued",
    updatedLabel: "4m ago",
    detailPath: buildRunTaskPath("run-104", "task-034"),
    note: "Queued follow-on work can still route back into the run execution shell."
  },
  {
    rowId: "run-103-task-032",
    taskDisplayId: "TASK-032",
    title: "Build execution drill-down",
    runDisplayId: "Run-103",
    status: "Running",
    updatedLabel: "9m ago",
    detailPath: buildRunTaskPath("run-103", "task-032"),
    note: "The workstreams list spans multiple runs without changing the top-level shell."
  },
  {
    rowId: "run-102-task-033",
    taskDisplayId: "TASK-033",
    title: "DAG wiring",
    runDisplayId: "Run-102",
    status: "Blocked",
    updatedLabel: "1h ago",
    detailPath: buildRunTaskPath("run-102", "task-033"),
    note: "Blocked work keeps the route target intact while real workstream adapters remain deferred."
  }
];

const filterDefinitions: Array<{
  filterId: WorkstreamFilterId;
  label: string;
  matches: (row: WorkstreamRowScaffold) => boolean;
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

export function useWorkstreamsViewModel() {
  const project = useCurrentProject();
  const [activeFilterId, setActiveFilterId] = useState<WorkstreamFilterId>("all");

  const activeFilter =
    filterDefinitions.find((filter) => filter.filterId === activeFilterId) ?? filterDefinitions[0]!;
  const visibleRows = workstreamRows.filter(activeFilter.matches);

  return {
    title: "Active and queued project work",
    summary: `${project.displayName} now has a project-wide workstreams surface that can route operators back into run execution without changing the global shell.`,
    filters: filterDefinitions.map((filter) => ({
      filterId: filter.filterId,
      label: filter.label,
      count: workstreamRows.filter(filter.matches).length,
      isActive: filter.filterId === activeFilterId
    })),
    rows: visibleRows,
    coverageNotes: [
      "Workstream rows already point at real run-task route shapes under `Runs > Execution`.",
      "The current list is a fixed placeholder model and does not fetch or sort against live task data yet.",
      "Filter chips only reshape scaffold rows locally in Phase 3."
    ],
    deferredWork: [
      "There is no backend-driven filtering, streaming updates, or queue prioritization yet.",
      "Row selection still depends on the fixed Phase 2 task scaffolds instead of project-backed workstream records."
    ],
    setActiveFilter(filterId: WorkstreamFilterId) {
      setActiveFilterId(filterId);
    }
  };
}
