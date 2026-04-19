import { Link } from "react-router-dom";

import type { ExecutionRowViewModel } from "../use-execution-view-model";

interface ExecutionWorkspaceProps {
  rows: ExecutionRowViewModel[];
}

function getExecutionNodeTone(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("block")) {
    return "blocked";
  }

  if (normalized.includes("running") || normalized.includes("progress")) {
    return "active";
  }

  if (normalized.includes("ready") || normalized.includes("queue") || normalized.includes("draft")) {
    return "queued";
  }

  return "complete";
}

export function ExecutionWorkspace({ rows }: ExecutionWorkspaceProps) {
  return (
    <section className="workspace-panel execution-panel">
      <header className="workspace-panel-header">
        <div>
          <h2 className="workspace-panel-title">Task workflow DAG</h2>
        </div>
      </header>

      <div className="execution-board" aria-label="Execution workflow graph">
        {rows.map((row, rowIndex) => (
          <div
            key={row.rowId}
            className={row.tasks.length > 1 ? "execution-dag-row execution-dag-row-branch" : "execution-dag-row"}
          >
            {row.tasks.map((task, taskIndex) => (
              <Link
                key={task.taskId}
                to={task.detailPath}
                className={`execution-node execution-node-${getExecutionNodeTone(task.status)}`}
              >
                <span className="execution-node-label">{task.graphLabel}</span>
                <span className="execution-node-title">{task.title}</span>
                <span className="document-name">
                  {task.displayId} · {task.status}
                </span>
                {task.dependencyCount > 0 ? (
                  <span className="document-card-summary">
                    Depends on {task.dependencyCount} prior {task.dependencyCount === 1 ? "task" : "tasks"}
                  </span>
                ) : null}
                {task.blockedByCount > 0 ? (
                  <span className="document-card-summary">
                    Blocked by {task.blockedByCount} {task.blockedByCount === 1 ? "task" : "tasks"}
                  </span>
                ) : null}
                {taskIndex < row.tasks.length - 1 ? (
                  <span aria-hidden="true" className="execution-dag-arrow">
                    -&gt;
                  </span>
                ) : null}
              </Link>
            ))}
            {rowIndex < rows.length - 1 ? (
              <span aria-hidden="true" className="execution-dag-arrow">
                |
              </span>
            ) : null}
          </div>
        ))}

        <p className="execution-board-note">Workflow rows are derived from task dependencies in the scaffold graph.</p>
        <p className="execution-board-note">Click a task node to open that task inside Execution.</p>
      </div>
    </section>
  );
}
