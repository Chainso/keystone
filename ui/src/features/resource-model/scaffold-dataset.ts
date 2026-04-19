import type {
  ResourceArtifact,
  ResourceDocument,
  ResourceDocumentRevision,
  ResourceModelDataset,
  ResourceProject,
  ResourceRun,
  ResourceTask,
  ResourceWorkflowGraph
} from "./types";

const projects: ResourceProject[] = [
  {
    projectId: "project-keystone-cloudflare",
    projectKey: "keystone-cloudflare",
    displayName: "Keystone Cloudflare",
    description: "Internal operator workspace for the Keystone Cloudflare project."
  }
];

const runs: ResourceRun[] = [
  {
    runId: "run-104",
    projectId: "project-keystone-cloudflare",
    displayId: "Run-104",
    summary: "UI workspace build",
    status: "In progress",
    updatedLabel: "2m ago"
  },
  {
    runId: "run-103",
    projectId: "project-keystone-cloudflare",
    displayId: "Run-103",
    summary: "Docs refresh",
    status: "Complete",
    updatedLabel: "1h ago"
  },
  {
    runId: "run-102",
    projectId: "project-keystone-cloudflare",
    displayId: "Run-102",
    summary: "Task steering work",
    status: "Blocked",
    updatedLabel: "3h ago"
  },
  {
    runId: "run-101",
    projectId: "project-keystone-cloudflare",
    displayId: "Run-101",
    summary: "Initial operator UI",
    status: "Draft",
    updatedLabel: "1d ago"
  }
];

const documents: ResourceDocument[] = [
  {
    documentId: "project-spec-current",
    projectId: "project-keystone-cloudflare",
    scopeType: "project",
    kind: "product-specification",
    label: "Current",
    title: "Current product specification",
    path: "docs/product/current.md",
    currentRevisionId: "project-spec-current-rev-1"
  },
  {
    documentId: "project-architecture-current",
    projectId: "project-keystone-cloudflare",
    scopeType: "project",
    kind: "technical-architecture",
    label: "Current",
    title: "Current technical architecture",
    path: "docs/architecture/current.md",
    currentRevisionId: "project-architecture-current-rev-1"
  },
  {
    documentId: "project-research-notes",
    projectId: "project-keystone-cloudflare",
    scopeType: "project",
    kind: "miscellaneous-note",
    label: "Research notes",
    title: "Research notes",
    path: "docs/notes/research.md",
    currentRevisionId: "project-research-notes-rev-1"
  },
  {
    documentId: "project-open-questions",
    projectId: "project-keystone-cloudflare",
    scopeType: "project",
    kind: "miscellaneous-note",
    label: "Open questions",
    title: "Open questions",
    path: "docs/notes/open-questions.md",
    currentRevisionId: "project-open-questions-rev-1"
  },
  {
    documentId: "run-104-specification",
    projectId: "project-keystone-cloudflare",
    runId: "run-104",
    scopeType: "run",
    kind: "product-specification",
    label: "Specification",
    title: "Living product spec",
    path: "runs/run-104/specification/product-spec.md",
    currentRevisionId: "run-104-specification-rev-1",
    conversationLocator: {
      agentClass: "planner",
      agentName: "Specification agent"
    }
  },
  {
    documentId: "run-104-architecture",
    projectId: "project-keystone-cloudflare",
    runId: "run-104",
    scopeType: "run",
    kind: "technical-architecture",
    label: "Architecture",
    title: "Living architecture doc",
    path: "runs/run-104/architecture/architecture.md",
    currentRevisionId: "run-104-architecture-rev-1",
    conversationLocator: {
      agentClass: "planner",
      agentName: "Architecture agent"
    }
  },
  {
    documentId: "run-104-execution-plan",
    projectId: "project-keystone-cloudflare",
    runId: "run-104",
    scopeType: "run",
    kind: "execution-plan",
    label: "Execution plan",
    title: "Execution plan doc",
    path: "runs/run-104/execution-plan/execution-plan.md",
    currentRevisionId: "run-104-execution-plan-rev-1",
    conversationLocator: {
      agentClass: "planner",
      agentName: "Execution plan agent"
    }
  },
  {
    documentId: "run-103-specification",
    projectId: "project-keystone-cloudflare",
    runId: "run-103",
    scopeType: "run",
    kind: "product-specification",
    label: "Specification",
    title: "Living product spec",
    path: "runs/run-103/specification/product-spec.md",
    currentRevisionId: "run-103-specification-rev-1"
  },
  {
    documentId: "run-103-architecture",
    projectId: "project-keystone-cloudflare",
    runId: "run-103",
    scopeType: "run",
    kind: "technical-architecture",
    label: "Architecture",
    title: "Living architecture doc",
    path: "runs/run-103/architecture/architecture.md",
    currentRevisionId: "run-103-architecture-rev-1"
  },
  {
    documentId: "run-102-specification",
    projectId: "project-keystone-cloudflare",
    runId: "run-102",
    scopeType: "run",
    kind: "product-specification",
    label: "Specification",
    title: "Living product spec",
    path: "runs/run-102/specification/product-spec.md",
    currentRevisionId: "run-102-specification-rev-1"
  },
  {
    documentId: "run-102-architecture",
    projectId: "project-keystone-cloudflare",
    runId: "run-102",
    scopeType: "run",
    kind: "technical-architecture",
    label: "Architecture",
    title: "Living architecture doc",
    path: "runs/run-102/architecture/architecture.md",
    currentRevisionId: "run-102-architecture-rev-1"
  },
  {
    documentId: "run-102-execution-plan",
    projectId: "project-keystone-cloudflare",
    runId: "run-102",
    scopeType: "run",
    kind: "execution-plan",
    label: "Execution plan",
    title: "Execution plan doc",
    path: "runs/run-102/execution-plan/execution-plan.md",
    currentRevisionId: "run-102-execution-plan-rev-1"
  },
  {
    documentId: "run-101-specification",
    projectId: "project-keystone-cloudflare",
    runId: "run-101",
    scopeType: "run",
    kind: "product-specification",
    label: "Specification",
    title: "Living product spec",
    path: "runs/run-101/specification/product-spec.md",
    currentRevisionId: "run-101-specification-rev-1"
  }
];

const documentRevisions: ResourceDocumentRevision[] = [
  {
    revisionId: "project-spec-current-rev-1",
    documentId: "project-spec-current",
    viewerTitle: "current living product specification",
    contentLines: [
      "Operator work stays organized around Runs, Documentation, Workstreams, and project settings inside one workspace.",
      "This document captures the current product state instead of preserving run-by-run chat history as the source of truth.",
      "The current direction keeps Documentation project-scoped and Workstreams focused on active task handoff into execution."
    ]
  },
  {
    revisionId: "project-architecture-current-rev-1",
    documentId: "project-architecture-current",
    viewerTitle: "current living architecture + decisions",
    contentLines: [
      "The product runs as a Cloudflare-served SPA with route-owned destinations and feature-owned rendering surfaces.",
      "Run detail owns planning and execution views, while Documentation and Workstreams stay project-level destinations.",
      "The shared shell provides navigation and layout primitives without turning every destination into one large route module."
    ]
  },
  {
    revisionId: "project-research-notes-rev-1",
    documentId: "project-research-notes",
    viewerTitle: "research notes",
    contentLines: [
      "Navigation, table structure, and document ownership were all simplified to match the canonical workspace boards.",
      "Documentation stays focused on current project knowledge rather than execution-only artifacts.",
      "Workstreams keeps the operational task list visible without adding another frame or side rail."
    ]
  },
  {
    revisionId: "project-open-questions-rev-1",
    documentId: "project-open-questions",
    viewerTitle: "open questions",
    contentLines: [
      "How should current project documents evolve once editing and persistence are added?",
      "What navigation affordances belong in the execution task view versus the project-level workstreams table?",
      "Which document relationships should stay project-scoped when richer run artifacts arrive?"
    ]
  },
  {
    revisionId: "run-104-specification-rev-1",
    documentId: "run-104-specification",
    viewerTitle: "Living product spec",
    contentLines: ["always reflects the", "current intended product state"]
  },
  {
    revisionId: "run-104-architecture-rev-1",
    documentId: "run-104-architecture",
    viewerTitle: "Living architecture doc",
    contentLines: ["current technical", "architecture + decisions only"]
  },
  {
    revisionId: "run-104-execution-plan-rev-1",
    documentId: "run-104-execution-plan",
    viewerTitle: "Execution plan doc",
    contentLines: ["phases, deliverables,", "validation, risks"]
  },
  {
    revisionId: "run-103-specification-rev-1",
    documentId: "run-103-specification",
    viewerTitle: "Living product spec",
    contentLines: ["docs refresh keeps", "spec language current"]
  },
  {
    revisionId: "run-103-architecture-rev-1",
    documentId: "run-103-architecture",
    viewerTitle: "Living architecture doc",
    contentLines: ["current technical", "architecture remains documented"]
  },
  {
    revisionId: "run-102-specification-rev-1",
    documentId: "run-102-specification",
    viewerTitle: "Living product spec",
    contentLines: ["task steering updates", "product expectations"]
  },
  {
    revisionId: "run-102-architecture-rev-1",
    documentId: "run-102-architecture",
    viewerTitle: "Living architecture doc",
    contentLines: ["execution flows", "stay route-owned and explicit"]
  },
  {
    revisionId: "run-102-execution-plan-rev-1",
    documentId: "run-102-execution-plan",
    viewerTitle: "Execution plan doc",
    contentLines: ["phased rollout", "keeps scaffold work manageable"]
  },
  {
    revisionId: "run-101-specification-rev-1",
    documentId: "run-101-specification",
    viewerTitle: "Living product spec",
    contentLines: ["initial operator UI", "starts from the run scaffold"]
  }
];

const tasks: ResourceTask[] = [
  {
    taskId: "task-029",
    projectId: "project-keystone-cloudflare",
    runId: "run-104",
    displayId: "TASK-029",
    graphLabel: "Spec",
    title: "Specification outline",
    status: "Complete",
    updatedLabel: "16m ago",
    dependsOn: [],
    blockedBy: [],
    artifactIds: [],
    conversationLocator: {
      agentClass: "executor",
      agentName: "Specification drafter"
    }
  },
  {
    taskId: "task-030",
    projectId: "project-keystone-cloudflare",
    runId: "run-104",
    displayId: "TASK-030",
    graphLabel: "Arch",
    title: "Architecture decisions",
    status: "Complete",
    updatedLabel: "14m ago",
    dependsOn: ["task-029"],
    blockedBy: [],
    artifactIds: [],
    conversationLocator: {
      agentClass: "executor",
      agentName: "Architecture drafter"
    }
  },
  {
    taskId: "task-031",
    projectId: "project-keystone-cloudflare",
    runId: "run-104",
    displayId: "TASK-031",
    graphLabel: "Plan",
    title: "Execution plan",
    status: "Complete",
    updatedLabel: "12m ago",
    dependsOn: ["task-030"],
    blockedBy: [],
    artifactIds: [],
    conversationLocator: {
      agentClass: "executor",
      agentName: "Planner"
    }
  },
  {
    taskId: "task-032",
    projectId: "project-keystone-cloudflare",
    runId: "run-104",
    displayId: "TASK-032",
    graphLabel: "Shell",
    title: "Build shell",
    status: "Running",
    updatedLabel: "2m ago",
    dependsOn: ["task-031"],
    blockedBy: [],
    artifactIds: ["artifact-task-032-router", "artifact-task-032-workspace"],
    conversationLocator: {
      agentClass: "executor",
      agentName: "UI shell builder"
    }
  },
  {
    taskId: "task-033",
    projectId: "project-keystone-cloudflare",
    runId: "run-104",
    displayId: "TASK-033",
    graphLabel: "Task View",
    title: "DAG wiring",
    status: "Queued",
    updatedLabel: "4m ago",
    dependsOn: ["task-032"],
    blockedBy: ["task-032"],
    artifactIds: ["artifact-task-033-task-detail"],
    conversationLocator: {
      agentClass: "executor",
      agentName: "Execution router"
    }
  },
  {
    taskId: "task-034",
    projectId: "project-keystone-cloudflare",
    runId: "run-104",
    displayId: "TASK-034",
    graphLabel: "Docs",
    title: "Documentation alignment",
    status: "Ready",
    updatedLabel: "8m ago",
    dependsOn: ["task-031"],
    blockedBy: [],
    artifactIds: [],
    conversationLocator: {
      agentClass: "executor",
      agentName: "Documentation aligner"
    }
  },
  {
    taskId: "task-021",
    projectId: "project-keystone-cloudflare",
    runId: "run-103",
    displayId: "TASK-021",
    graphLabel: "Docs",
    title: "Docs refresh",
    status: "Running",
    updatedLabel: "9m ago",
    dependsOn: [],
    blockedBy: [],
    artifactIds: [],
    conversationLocator: {
      agentClass: "executor",
      agentName: "Documentation refresh"
    }
  },
  {
    taskId: "task-019",
    projectId: "project-keystone-cloudflare",
    runId: "run-101",
    displayId: "TASK-019",
    graphLabel: "Review",
    title: "Review fix",
    status: "Blocked",
    updatedLabel: "1h ago",
    dependsOn: [],
    blockedBy: [],
    artifactIds: [],
    conversationLocator: {
      agentClass: "executor",
      agentName: "Review fixer"
    }
  }
];

const workflowGraphs: ResourceWorkflowGraph[] = [
  {
    runId: "run-104",
    nodes: tasks
      .filter((task) => task.runId === "run-104")
      .map((task) => ({
        taskId: task.taskId,
        graphLabel: task.graphLabel
      }))
  },
  {
    runId: "run-103",
    nodes: [
      {
        taskId: "task-021",
        graphLabel: "Docs"
      }
    ]
  },
  {
    runId: "run-101",
    nodes: [
      {
        taskId: "task-019",
        graphLabel: "Review"
      }
    ]
  }
];

const artifacts: ResourceArtifact[] = [
  {
    artifactId: "artifact-task-032-router",
    runId: "run-104",
    taskId: "task-032",
    path: "ui/src/routes/runs/task-detail-route.tsx",
    summary: "Task detail route shell.",
    diff: [
      "+ keep task detail scoped to the selected run",
      "+ preserve the Back to DAG handoff"
    ]
  },
  {
    artifactId: "artifact-task-032-workspace",
    runId: "run-104",
    taskId: "task-032",
    path: "ui/src/features/execution/components/execution-workspace.tsx",
    summary: "Workflow DAG surface.",
    diff: ["+ render graph-first task nodes", "+ link each node into the task-detail route"]
  },
  {
    artifactId: "artifact-task-033-task-detail",
    runId: "run-104",
    taskId: "task-033",
    path: "ui/src/features/execution/components/task-detail-workspace.tsx",
    summary: "Conversation and review split.",
    diff: [
      "+ render the task conversation beside the code review sidebar",
      "+ show one-pane diffs in collapsible file sections"
    ]
  }
];

export const uiScaffoldDataset: ResourceModelDataset = {
  meta: {
    defaultProjectId: "project-keystone-cloudflare",
    source: "scaffold"
  },
  projects,
  runs,
  documents,
  documentRevisions,
  tasks,
  workflowGraphs,
  artifacts
};

export interface ResourceModelIndexes {
  projectsById: Map<string, ResourceProject>;
  runsById: Map<string, ResourceRun>;
  documentsById: Map<string, ResourceDocument>;
  documentsByRunId: Map<string, ResourceDocument[]>;
  projectDocumentsByProjectId: Map<string, ResourceDocument[]>;
  documentRevisionsById: Map<string, ResourceDocumentRevision>;
  tasksById: Map<string, ResourceTask>;
  tasksByProjectId: Map<string, ResourceTask[]>;
  tasksByRunId: Map<string, ResourceTask[]>;
  workflowGraphsByRunId: Map<string, ResourceWorkflowGraph>;
  artifactsById: Map<string, ResourceArtifact>;
  artifactsByTaskId: Map<string, ResourceArtifact[]>;
}

const indexCache = new WeakMap<ResourceModelDataset, ResourceModelIndexes>();

function groupByKey<Value>(values: Value[], getKey: (value: Value) => string) {
  return values.reduce<Map<string, Value[]>>((groups, value) => {
    const key = getKey(value);
    const existing = groups.get(key);

    if (existing) {
      existing.push(value);
      return groups;
    }

    groups.set(key, [value]);
    return groups;
  }, new Map());
}

export function getResourceModelIndexes(dataset: ResourceModelDataset = uiScaffoldDataset) {
  const cached = indexCache.get(dataset);

  if (cached) {
    return cached;
  }

  const indexes: ResourceModelIndexes = {
    projectsById: new Map(dataset.projects.map((project) => [project.projectId, project])),
    runsById: new Map(dataset.runs.map((run) => [run.runId, run])),
    documentsById: new Map(dataset.documents.map((document) => [document.documentId, document])),
    documentsByRunId: groupByKey(
      dataset.documents.filter((document) => document.runId !== undefined),
      (document) => document.runId!
    ),
    projectDocumentsByProjectId: groupByKey(
      dataset.documents.filter((document) => document.scopeType === "project"),
      (document) => document.projectId
    ),
    documentRevisionsById: new Map(
      dataset.documentRevisions.map((revision) => [revision.revisionId, revision])
    ),
    tasksById: new Map(dataset.tasks.map((task) => [task.taskId, task])),
    tasksByProjectId: groupByKey(dataset.tasks, (task) => task.projectId),
    tasksByRunId: groupByKey(dataset.tasks, (task) => task.runId),
    workflowGraphsByRunId: new Map(
      dataset.workflowGraphs.map((graph) => [graph.runId, graph])
    ),
    artifactsById: new Map(dataset.artifacts.map((artifact) => [artifact.artifactId, artifact])),
    artifactsByTaskId: groupByKey(dataset.artifacts, (artifact) => artifact.taskId)
  };

  indexCache.set(dataset, indexes);
  return indexes;
}
