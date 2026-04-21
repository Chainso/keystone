import {
  buildRunPath,
  buildRunTaskPath,
  getRunPhaseDefinition,
  type RunPhaseId
} from "../../shared/navigation/run-phases";

export type RunPlanningPhaseId = Exclude<RunPhaseId, "execution">;

export interface PlanningMessageScaffold {
  speaker: string;
  body: string;
}

export interface PlanningPhaseScaffold {
  phaseId: RunPlanningPhaseId;
  chatTitle: string;
  documentTitle: string;
  documentName: string;
  documentLines: string[];
  composerText: string;
  messages: PlanningMessageScaffold[];
}

export interface ExecutionTaskScaffold {
  taskId: string;
  displayId: string;
  graphLabel: string;
  title: string;
  status: string;
  dependsOn: string[];
  blockedBy: string[];
  detailPath: string;
}

export interface TaskConversationEntryScaffold {
  speaker: string;
  body: string;
}

export interface ReviewFileScaffold {
  path: string;
  summary: string;
  diff: string[];
}

export interface TaskDetailScaffold {
  taskId: string;
  displayId: string;
  title: string;
  status: string;
  composerText: string;
  conversation: TaskConversationEntryScaffold[];
  reviewFiles: ReviewFileScaffold[];
}

export interface RunScaffold {
  runId: string;
  displayId: string;
  summary: string;
  status: string;
  updatedLabel: string;
  currentPhase: RunPhaseId;
  detailPath: string;
  planningPhases: Record<RunPlanningPhaseId, PlanningPhaseScaffold>;
  execution: {
    tasks: ExecutionTaskScaffold[];
  };
}

interface RunSeed {
  runId: string;
  displayId: string;
  summary: string;
  status: string;
  updatedLabel: string;
  currentPhase: RunPhaseId;
}

const runSeeds: RunSeed[] = [
  {
    runId: "run-104",
    displayId: "Run-104",
    summary: "UI workspace build",
    status: "In progress",
    updatedLabel: "2m ago",
    currentPhase: "execution"
  },
  {
    runId: "run-103",
    displayId: "Run-103",
    summary: "Docs refresh",
    status: "Complete",
    updatedLabel: "1h ago",
    currentPhase: "architecture"
  },
  {
    runId: "run-102",
    displayId: "Run-102",
    summary: "Task steering work",
    status: "Blocked",
    updatedLabel: "3h ago",
    currentPhase: "execution"
  },
  {
    runId: "run-101",
    displayId: "Run-101",
    summary: "Initial operator UI",
    status: "Draft",
    updatedLabel: "1d ago",
    currentPhase: "specification"
  }
];

const planningCopy = {
  specification: {
    chatTitle: "Specification agent chat",
    documentTitle: "Living product spec",
    documentName: "product-spec.md",
    documentLines: ["always reflects the", "current intended product state"],
    composerText: "message composer......................",
    messages: [
      {
        speaker: "agent",
        body: "define operator goals"
      },
      {
        speaker: "user",
        body: "add run index + workstreams"
      },
      {
        speaker: "agent",
        body: "revising current spec"
      }
    ]
  },
  architecture: {
    chatTitle: "Architecture agent chat",
    documentTitle: "Living architecture doc",
    documentName: "architecture.md",
    documentLines: ["current technical", "architecture + decisions only"],
    composerText: "message composer......................",
    messages: [
      {
        speaker: "agent",
        body: "refine system boundaries"
      },
      {
        speaker: "user",
        body: "Worker + React + Radix"
      },
      {
        speaker: "agent",
        body: "capture current decisions"
      }
    ]
  },
  "execution-plan": {
    chatTitle: "Execution plan conversation",
    documentTitle: "Execution plan doc",
    documentName: "execution-plan.md",
    documentLines: ["tasks, deliverables,", "validation, risks"],
    composerText: "message composer......................",
    messages: [
      {
        speaker: "agent",
        body: "break the UI rollout into steps"
      },
      {
        speaker: "user",
        body: "include scaffold spike"
      },
      {
        speaker: "user",
        body: "include zellij + localflare"
      }
    ]
  }
} as const satisfies Record<RunPlanningPhaseId, Omit<PlanningPhaseScaffold, "phaseId">>;

function createExecutionTasks(runId: string): ExecutionTaskScaffold[] {
  const taskIdRemap =
    runId === "run-103"
      ? { "task-032": "task-021" }
      : runId === "run-101"
        ? { "task-033": "task-019" }
        : {};

  const tasks = [
    {
      taskId: "task-029",
      displayId: "TASK-029",
      graphLabel: "Spec",
      title: "Specification outline",
      status: "Complete",
      dependsOn: [],
      blockedBy: [],
      detailPath: buildRunTaskPath(runId, "task-029")
    },
    {
      taskId: "task-030",
      displayId: "TASK-030",
      graphLabel: "Arch",
      title: "Architecture decisions",
      status: "Complete",
      dependsOn: ["task-029"],
      blockedBy: [],
      detailPath: buildRunTaskPath(runId, "task-030")
    },
    {
      taskId: "task-031",
      displayId: "TASK-031",
      graphLabel: "Plan",
      title: "Execution plan",
      status: "Complete",
      dependsOn: ["task-030"],
      blockedBy: [],
      detailPath: buildRunTaskPath(runId, "task-031")
    },
    {
      taskId: "task-032",
      displayId: "TASK-032",
      graphLabel: "Shell",
      title: "Build execution drill-down",
      status: "Running",
      dependsOn: ["task-031"],
      blockedBy: [],
      detailPath: buildRunTaskPath(runId, "task-032")
    },
    {
      taskId: "task-033",
      displayId: "TASK-033",
      graphLabel: "Task View",
      title: "DAG wiring",
      status: "Blocked",
      dependsOn: ["task-032"],
      blockedBy: ["task-032"],
      detailPath: buildRunTaskPath(runId, "task-033")
    },
    {
      taskId: "task-034",
      displayId: "TASK-034",
      graphLabel: "Docs",
      title: "Documentation alignment",
      status: "Ready",
      dependsOn: ["task-031"],
      blockedBy: [],
      detailPath: buildRunTaskPath(runId, "task-034")
    }
  ];

  return tasks
    .map((task) => {
      const taskId = taskIdRemap[task.taskId as keyof typeof taskIdRemap] ?? task.taskId;

      return {
        ...task,
        taskId,
        dependsOn: task.dependsOn.map((dependency) => {
          return taskIdRemap[dependency as keyof typeof taskIdRemap] ?? dependency;
        }),
        blockedBy: task.blockedBy.map((dependency) => {
          return taskIdRemap[dependency as keyof typeof taskIdRemap] ?? dependency;
        }),
        detailPath: buildRunTaskPath(runId, taskId)
      };
    })
    .map((task) => {
      if (task.taskId === "task-021") {
        return {
          ...task,
          displayId: "TASK-021",
          graphLabel: "Docs",
          title: "Docs refresh"
        };
      }

      if (task.taskId === "task-019") {
        return {
          ...task,
          displayId: "TASK-019",
          graphLabel: "Review",
          title: "Review fix"
        };
      }

      return task;
    });
}

function createPlanningPhases(): Record<RunPlanningPhaseId, PlanningPhaseScaffold> {
  return {
    specification: {
      phaseId: "specification",
      ...planningCopy.specification
    },
    architecture: {
      phaseId: "architecture",
      ...planningCopy.architecture
    },
    "execution-plan": {
      phaseId: "execution-plan",
      ...planningCopy["execution-plan"]
    }
  };
}

function createRunScaffold(seed: RunSeed): RunScaffold {
  const tasks = createExecutionTasks(seed.runId);

  return {
    runId: seed.runId,
    displayId: seed.displayId,
    summary: seed.summary,
    status: seed.status,
    updatedLabel: seed.updatedLabel,
    currentPhase: seed.currentPhase,
    detailPath: buildRunPath(seed.runId),
    planningPhases: createPlanningPhases(),
    execution: {
      tasks
    }
  };
}

function createFallbackRunSeed(runId: string): RunSeed {
  return {
    runId,
    displayId: runId.replace(/^run-/, "Run-"),
    summary: "Run placeholder",
    status: "Draft",
    updatedLabel: "Just now",
    currentPhase: "specification"
  };
}

export function listRunScaffolds() {
  return runSeeds.map(createRunScaffold);
}

export function getRunScaffold(runId: string) {
  const seed = runSeeds.find((run) => run.runId === runId) ?? createFallbackRunSeed(runId);

  return createRunScaffold(seed);
}

export function getRunPhaseLabel(phaseId: RunPhaseId) {
  return getRunPhaseDefinition(phaseId).label;
}
