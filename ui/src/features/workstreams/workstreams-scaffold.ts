import { buildRunTaskPath } from "../../shared/navigation/run-phases";

export type WorkstreamFilterId = "all" | "running" | "queued" | "blocked";

export interface WorkstreamRowScaffold {
  rowId: string;
  taskDisplayId: string;
  title: string;
  runDisplayId: string;
  status: string;
  updatedLabel: string;
  detailPath: string;
}

export const workstreamRows: WorkstreamRowScaffold[] = [
  {
    rowId: "run-104-task-032",
    taskDisplayId: "TASK-032",
    title: "Build execution drill-down",
    runDisplayId: "Run-104",
    status: "Running",
    updatedLabel: "2m ago",
    detailPath: buildRunTaskPath("run-104", "task-032")
  },
  {
    rowId: "run-104-task-034",
    taskDisplayId: "TASK-034",
    title: "Documentation alignment",
    runDisplayId: "Run-104",
    status: "Queued",
    updatedLabel: "4m ago",
    detailPath: buildRunTaskPath("run-104", "task-034")
  },
  {
    rowId: "run-103-task-032",
    taskDisplayId: "TASK-032",
    title: "Build execution drill-down",
    runDisplayId: "Run-103",
    status: "Running",
    updatedLabel: "9m ago",
    detailPath: buildRunTaskPath("run-103", "task-032")
  },
  {
    rowId: "run-102-task-033",
    taskDisplayId: "TASK-033",
    title: "DAG wiring",
    runDisplayId: "Run-102",
    status: "Blocked",
    updatedLabel: "1h ago",
    detailPath: buildRunTaskPath("run-102", "task-033")
  }
];

export const filterDefinitions: Array<{
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
