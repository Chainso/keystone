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
  documentSummary: string;
  composerPlaceholder: string;
  messages: PlanningMessageScaffold[];
  currentState: string[];
  backendCoverage: string[];
  deferredWork: string[];
}

export interface ExecutionTaskScaffold {
  taskId: string;
  displayId: string;
  title: string;
  status: string;
  dependsOn: string[];
  blockedBy: string[];
  note: string;
  detailPath: string;
}

export interface TaskConversationEntryScaffold {
  speaker: string;
  tone: string;
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
  summary: string;
  steeringNotice: string;
  conversation: TaskConversationEntryScaffold[];
  reviewFiles: ReviewFileScaffold[];
  artifactNotes: string[];
}

export interface RunScaffold {
  runId: string;
  displayId: string;
  summary: string;
  status: string;
  updatedLabel: string;
  currentPhase: RunPhaseId;
  statusNote: string;
  detailPath: string;
  planningPhases: Record<RunPlanningPhaseId, PlanningPhaseScaffold>;
  execution: {
    summary: string;
    graphNotes: string[];
    backendCoverage: string[];
    deferredWork: string[];
    stats: {
      totalTasks: number;
      activeTasks: number;
      blockedTasks: number;
      completedTasks: number;
      readyTasks: number;
    };
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
  statusNote: string;
}

const runSeeds: RunSeed[] = [
  {
    runId: "run-104",
    displayId: "Run-104",
    summary: "UI workspace build",
    status: "In progress",
    updatedLabel: "2m ago",
    currentPhase: "execution",
    statusNote: "Phase 2 uses this sample run to prove the nested stepper and execution drill-down shape."
  },
  {
    runId: "run-103",
    displayId: "Run-103",
    summary: "Docs refresh",
    status: "Complete",
    updatedLabel: "1h ago",
    currentPhase: "architecture",
    statusNote: "Completed sample run retained to show that older runs still reopen inside the same stepper shell."
  },
  {
    runId: "run-102",
    displayId: "Run-102",
    summary: "Task steering work",
    status: "Blocked",
    updatedLabel: "3h ago",
    currentPhase: "execution-plan",
    statusNote: "Blocked sample run keeps the status language grounded without implying live task steering is already wired."
  },
  {
    runId: "run-101",
    displayId: "Run-101",
    summary: "Initial operator UI",
    status: "Draft",
    updatedLabel: "1d ago",
    currentPhase: "specification",
    statusNote: "Draft sample run keeps the run index honest about early lifecycle states."
  }
];

const planningCopy = {
  specification: {
    chatTitle: "Specification agent chat",
    documentTitle: "Living product specification",
    documentName: "product-spec.md",
    documentSummary:
      "This scaffold keeps the split between an operator conversation and the current product specification, while project documents stay stub-backed.",
    composerPlaceholder: "Refine operator goals, acceptance criteria, and current scope...",
    messages: [
      {
        speaker: "agent",
        body: "Captured the operator goal as a focused workspace instead of a dashboard shell."
      },
      {
        speaker: "user",
        body: "Add the run index first, then lock the stepper and task detail structure."
      },
      {
        speaker: "agent",
        body: "Revising the current specification so later UI phases inherit the same run flow."
      }
    ]
  },
  architecture: {
    chatTitle: "Architecture agent chat",
    documentTitle: "Living architecture document",
    documentName: "architecture.md",
    documentSummary:
      "The architecture pane stays focused on current boundaries, not historical changelogs, and remains explicit about Worker plus SPA ownership.",
    composerPlaceholder: "Clarify runtime boundaries, route ownership, or future adapters...",
    messages: [
      {
        speaker: "agent",
        body: "Holding the current runtime shape to one Worker deployable with a nested SPA route tree."
      },
      {
        speaker: "user",
        body: "Keep the existing Hono routes and do not introduce a second app frame."
      },
      {
        speaker: "agent",
        body: "Documenting the shared planning layout so feature work can fill it in later without moving routes."
      }
    ]
  },
  "execution-plan": {
    chatTitle: "Execution plan agent chat",
    documentTitle: "Execution plan document",
    documentName: "execution-plan.md",
    documentSummary:
      "The execution-plan pane keeps the plan as a living delivery artifact and stays honest about host-only validation for the final Worker build.",
    composerPlaceholder: "Adjust phases, validation steps, or next-slice constraints...",
    messages: [
      {
        speaker: "agent",
        body: "Sequencing route scaffolding before live adapters so the file ownership stays stable."
      },
      {
        speaker: "user",
        body: "Keep placeholders honest and preserve the current API seams without pretending the DAG is live."
      },
      {
        speaker: "agent",
        body: "Recording the build caveat and the route hierarchy as deliberate plan inputs."
      }
    ]
  }
} as const satisfies Record<
  RunPlanningPhaseId,
  Omit<PlanningPhaseScaffold, "phaseId" | "currentState" | "backendCoverage" | "deferredWork">
>;

function createExecutionTasks(runId: string): ExecutionTaskScaffold[] {
  return [
    {
      taskId: "task-029",
      displayId: "TASK-029",
      title: "Freeze run stepper layout",
      status: "Complete",
      dependsOn: [],
      blockedBy: [],
      note: "The horizontal phase rail now lives at the run-detail boundary.",
      detailPath: buildRunTaskPath(runId, "task-029")
    },
    {
      taskId: "task-030",
      displayId: "TASK-030",
      title: "Shape planning split workspace",
      status: "Complete",
      dependsOn: ["task-029"],
      blockedBy: [],
      note: "Specification, architecture, and plan now share the same two-pane structure.",
      detailPath: buildRunTaskPath(runId, "task-030")
    },
    {
      taskId: "task-031",
      displayId: "TASK-031",
      title: "Map placeholder document contracts",
      status: "Complete",
      dependsOn: ["task-030"],
      blockedBy: [],
      note: "Document panes call out the current stub-backed project surfaces instead of faking content.",
      detailPath: buildRunTaskPath(runId, "task-031")
    },
    {
      taskId: "task-032",
      displayId: "TASK-032",
      title: "Build execution drill-down",
      status: "Running",
      dependsOn: ["task-031"],
      blockedBy: [],
      note: "The graph-to-task route handoff is live as structure only; manual steering remains frozen.",
      detailPath: buildRunTaskPath(runId, "task-032")
    },
    {
      taskId: "task-033",
      displayId: "TASK-033",
      title: "DAG wiring",
      status: "Blocked",
      dependsOn: ["task-032"],
      blockedBy: ["task-032"],
      note: "Task graph visuals are placeholder-backed until the real workflow graph adapter lands.",
      detailPath: buildRunTaskPath(runId, "task-033")
    },
    {
      taskId: "task-034",
      displayId: "TASK-034",
      title: "Documentation alignment",
      status: "Ready",
      dependsOn: ["task-031"],
      blockedBy: [],
      note: "Later phases can reuse this route ownership when Documentation and Workstreams gain structure.",
      detailPath: buildRunTaskPath(runId, "task-034")
    }
  ];
}

function countExecutionStats(tasks: ExecutionTaskScaffold[]) {
  return {
    totalTasks: tasks.length,
    activeTasks: tasks.filter((task) => task.status === "Running").length,
    blockedTasks: tasks.filter((task) => task.status === "Blocked").length,
    completedTasks: tasks.filter((task) => task.status === "Complete").length,
    readyTasks: tasks.filter((task) => task.status === "Ready").length
  };
}

function createPlanningPhases(run: RunSeed): Record<RunPlanningPhaseId, PlanningPhaseScaffold> {
  return {
    specification: {
      phaseId: "specification",
      ...planningCopy.specification,
      currentState: [
        `${run.displayId} keeps the product-spec split visible without implying the spec is loaded from the backend yet.`,
        "The route boundary is now stable enough for later query adapters and editor states."
      ],
      backendCoverage: [
        "`GET /v1/runs/:runId` and `GET /v1/runs/:runId/stream` exist, but this UI still uses fixed view models.",
        "`GET /v1/projects/:projectId/documents` remains stub-backed, so the document pane stays explicitly structural."
      ],
      deferredWork: [
        "No live thread history, composer submission, or persisted draft behavior is implemented.",
        "Document editing, version history, and cross-run comparison stay out of scope for Phase 2."
      ]
    },
    architecture: {
      phaseId: "architecture",
      ...planningCopy.architecture,
      currentState: [
        `${run.displayId} shows how run phases share a stable frame while the global sidebar stays fixed.`,
        "The architecture surface now has a permanent route boundary for future decisions and evidence."
      ],
      backendCoverage: [
        "The current Worker APIs stay authoritative; the scaffold does not add a second runtime or parallel data model.",
        "Project-level architecture documents still come from stubbed project-document seams later."
      ],
      deferredWork: [
        "No live architecture diffing, approvals, or document collaboration states exist yet.",
        "The right pane is a scaffold, not a full document renderer."
      ]
    },
    "execution-plan": {
      phaseId: "execution-plan",
      ...planningCopy["execution-plan"],
      currentState: [
        `${run.displayId} keeps planning in the same split shell while execution stays a distinct route family.`,
        "Validation expectations and placeholder boundaries are fixed before deeper feature work begins."
      ],
      backendCoverage: [
        "The planner surface calls out the current host-only `npm run build` proof instead of masking it.",
        "Decision-package and evidence adapters remain deferred even though their API shapes already exist."
      ],
      deferredWork: [
        "No live planner edits, risk tracking, or approval routing are implemented yet.",
        "Task graph generation still belongs to later execution data work."
      ]
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
    statusNote: seed.statusNote,
    detailPath: buildRunPath(seed.runId),
    planningPhases: createPlanningPhases(seed),
    execution: {
      summary:
        "Execution defaults to the workflow view first, then drills into a task-scoped conversation plus code review sidebar without leaving the run shell.",
      graphNotes: [
        "Task cards are static view models in Phase 2, but they already preserve dependency and blocker wording.",
        "Opening a task keeps the same run context and stepper state instead of navigating to a separate screen."
      ],
      backendCoverage: [
        "`GET /v1/runs/:runId/graph`, `GET /v1/runs/:runId/tasks`, and task conversation/artifact detail routes are implemented backend seams.",
        "`POST /v1/runs/:runId/tasks/:taskId/conversation/messages` still returns a typed not-implemented response, so the steering composer is visual only.",
        "`GET /v1/runs/:runId/evidence`, `/integration`, and `/release` remain typed stubs and should stay visibly unmaterialized."
      ],
      deferredWork: [
        "No live DAG layout, streaming task updates, or persisted operator steering is implemented in this phase.",
        "The code review sidebar shape is present, but it does not load real diffs or artifact bundles yet."
      ],
      stats: countExecutionStats(tasks),
      tasks
    }
  };
}

function createFallbackRunSeed(runId: string): RunSeed {
  return {
    runId,
    displayId: runId.replace(/^run-/, "Run-"),
    summary: "Scaffold-only run placeholder",
    status: "Draft",
    updatedLabel: "Just now",
    currentPhase: "specification",
    statusNote:
      "This run id is not part of the fixed Phase 2 sample set, so the UI falls back to a generic scaffold."
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
