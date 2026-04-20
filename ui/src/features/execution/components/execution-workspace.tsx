import { Link } from "react-router-dom";

import type { ExecutionRowViewModel } from "../use-execution-view-model";
import type { ResourceTaskStatus } from "../../resource-model/types";

interface ExecutionWorkspaceProps {
  rows: ExecutionRowViewModel[];
}

function assertNeverStatus(status: never): never {
  throw new Error(`Execution node tone has no mapping for task status "${String(status)}".`);
}

function getExecutionNodeTone(status: ResourceTaskStatus) {
  switch (status) {
    case "Blocked":
      return "blocked";
    case "Running":
      return "active";
    case "Ready":
    case "Queued":
      return "queued";
    case "Complete":
      return "complete";
    default:
      return assertNeverStatus(status);
  }
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
            {row.tasks.length > 1 ? (
              <p className="execution-board-note">
                Depth {row.depth + 1}: sibling tasks share dependency depth; left-to-right position is not ordered.
              </p>
            ) : null}
            {row.tasks.map((task) => (
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
              </Link>
            ))}
            {rowIndex < rows.length - 1 ? (
              <span aria-hidden="true" className="execution-dag-arrow">
                |
              </span>
            ) : null}
          </div>
        ))}

        <p className="execution-board-note">
          Workflow rows are grouped by dependency depth in the current workflow graph.
        </p>
        <p className="execution-board-note">Click a task node to open that task inside Execution.</p>
      </div>
    </section>
  );
}
