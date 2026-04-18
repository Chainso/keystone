import { getRunScaffold, type ExecutionTaskScaffold, type ReviewFileScaffold } from "../runs/run-scaffold";

function createGenericReviewFiles(task: ExecutionTaskScaffold): ReviewFileScaffold[] {
  return [
    {
      path: "ui/src/routes/router.tsx",
      summary: `Route hierarchy placeholder for ${task.title.toLowerCase()}.`,
      diff: [
        "+ add nested run-detail routes under /runs/:runId",
        "+ preserve the current shell while task detail stays under Execution"
      ]
    },
    {
      path: "ui/src/shared/layout/task-detail-workspace.tsx",
      summary: "Chat-plus-review split scaffold for task execution.",
      diff: [
        "+ render task conversation and code review sidebar in one run-scoped frame",
        "+ keep review data fixed until real artifacts and diffs are wired"
      ]
    }
  ];
}

export function useRunExecutionViewModel(runId: string) {
  const run = getRunScaffold(runId);

  return {
    runDisplayId: run.displayId,
    summary: run.execution.summary,
    graphNotes: run.execution.graphNotes,
    backendCoverage: run.execution.backendCoverage,
    deferredWork: run.execution.deferredWork,
    stats: run.execution.stats,
    tasks: run.execution.tasks
  };
}

export function useTaskDetailViewModel(runId: string, taskId: string) {
  const run = getRunScaffold(runId);
  const task = run.execution.tasks.find((candidate) => candidate.taskId === taskId);

  if (!task) {
    throw new Error(
      `Task route "/runs/${runId}/execution/tasks/${taskId}" does not match any scaffolded execution task.`
    );
  }

  return {
    runDisplayId: run.displayId,
    taskDisplayId: task.displayId,
    title: task.title,
    status: task.status,
    summary:
      "Task detail keeps the execution context visible while shifting into a conversation-plus-review split. The content remains scaffold-backed in Phase 2.",
    steeringNotice:
      "`POST /v1/runs/:runId/tasks/:taskId/conversation/messages` stays frozen as a typed not-implemented contract, so the steering composer is visual only here.",
    conversation: [
      {
        speaker: "agent",
        tone: "Implementer",
        body: `Inspected ${task.title.toLowerCase()} and mapped the route boundary without implying live operator steering.`
      },
      {
        speaker: "user",
        tone: "Operator",
        body: "Keep the task route in the same run shell and preserve the stepper context while moving into review."
      },
      {
        speaker: "reviewer",
        tone: "Review",
        body: "Flagged that the task detail needs an obvious path back to the DAG and honest placeholder review content."
      },
      {
        speaker: "agent",
        tone: "Implementer",
        body: "Applying the scaffold split now; real diffs, artifacts, and task chat persistence stay deferred."
      }
    ],
    reviewFiles:
      task.taskId === "task-032"
        ? [
            {
              path: "ui/src/routes/runs/task-detail-route.tsx",
              summary: "Task detail route shell for conversation plus review.",
              diff: [
                "+ add Back to DAG affordance inside the execution route family",
                "+ keep task detail scoped to the selected run"
              ]
            },
            {
              path: "ui/src/shared/layout/execution-workspace.tsx",
              summary: "Graph scaffold keeps node-to-task drill-down explicit.",
              diff: [
                "+ render task cards with dependency and blocker copy",
                "+ link each placeholder node into the task-detail route"
              ]
            },
            {
              path: "src/http/api/v1/runs/handlers.ts",
              summary: "Frozen manual steering contract remains visible from the UI.",
              diff: [
                "  Phase 2 keeps manual operator steering as a frozen contract",
                "  without adding new message persistence or delivery behavior yet."
              ]
            }
          ]
        : createGenericReviewFiles(task),
    artifactNotes: [
      "`GET /v1/runs/:runId/tasks/:taskId/artifacts` is implemented and will eventually back this sidebar.",
      "`GET /v1/runs/:runId/tasks/:taskId/conversation` exists today, but the Phase 2 UI does not fetch it yet.",
      "Evidence, integration, and release surfaces remain typed stubs, so this sidebar stays honest about its placeholder status."
    ]
  };
}
