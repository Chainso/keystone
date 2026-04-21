import { getRunScaffold, type ExecutionTaskScaffold, type ReviewFileScaffold } from "../runs/run-scaffold";

function createGenericReviewFiles(task: ExecutionTaskScaffold): ReviewFileScaffold[] {
  return [
    {
      path: "ui/src/routes/router.tsx",
      summary: `Route handoff for ${task.title.toLowerCase()}.`,
      diff: [
        "+ keep the task route nested under /runs/:runId/execution",
        "+ preserve the same run shell while opening review"
      ]
    },
    {
      path: "ui/src/features/execution/components/task-detail-workspace.tsx",
      summary: "Conversation and review split for task execution.",
      diff: [
        "+ render task conversation beside the code review sidebar",
        "+ keep the changed-files list in the same run-scoped frame"
      ]
    }
  ];
}

export function useRunExecutionViewModel(runId: string) {
  const run = getRunScaffold(runId);

  return {
    tasks: run.execution.tasks
  };
}

export function useTaskDetailViewModel(runId: string, taskId: string) {
  const run = getRunScaffold(runId);
  const task = run.execution.tasks.find((candidate) => candidate.taskId === taskId);

  if (!task) {
    throw new Error(
      `Task route "/runs/${runId}/execution/tasks/${taskId}" does not match any known execution task.`
    );
  }

  return {
    runDisplayId: run.displayId,
    taskDisplayId: task.displayId,
    title: task.title,
    status: task.status,
    composerText: "steer this task.......................",
    conversation: [
      {
        speaker: "agent",
        body: "inspected implementation"
      },
      {
        speaker: "user",
        body: "steer toward simpler flow"
      },
      {
        speaker: "reviewer",
        body: "flagged issue"
      },
      {
        speaker: "agent",
        body: "applying task fix"
      }
    ],
    reviewFiles:
      task.taskId === "task-032"
        ? [
            {
              path: "ui/src/routes/runs/task-detail-route.tsx",
              summary: "Task detail route shell.",
              diff: [
                "+ keep task detail scoped to the selected run",
                "+ preserve the Back to DAG link"
              ]
            },
            {
              path: "ui/src/features/execution/components/execution-workspace.tsx",
              summary: "Workflow DAG surface.",
              diff: [
                "+ render graph-first task nodes",
                "+ link each node into the task-detail route"
              ]
            },
            {
              path: "ui/src/features/execution/components/task-detail-workspace.tsx",
              summary: "Conversation and review split.",
              diff: [
                "+ render the task conversation beside the code review sidebar",
                "+ show one-pane diffs in collapsible file sections"
              ]
            }
          ]
        : createGenericReviewFiles(task)
  };
}
