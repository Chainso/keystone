import { Link } from "react-router-dom";

import type { RunExecutionViewModel } from "../use-execution-view-model";

interface ExecutionWorkspaceProps {
  model: RunExecutionViewModel;
}

export function ExecutionWorkspace({ model }: ExecutionWorkspaceProps) {
  return (
    <section className="workspace-panel execution-panel">
      <header className="workspace-panel-header">
        <div>
          <h2 className="workspace-panel-title">Task workflow DAG</h2>
        </div>
      </header>

      {model.compatibilityState ? (
        <section className="empty-state-card">
          <h3 className="document-card-title">{model.compatibilityState.heading}</h3>
          <p className="document-card-summary">{model.compatibilityState.message}</p>
          {model.compatibilityState.actionLabel ? (
            <button type="button" className="secondary-button" onClick={model.retry}>
              {model.compatibilityState.actionLabel}
            </button>
          ) : null}
        </section>
      ) : (
        <div className="execution-board" aria-label="Execution workflow graph">
          {model.rows.map((row, rowIndex) => (
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
                  className={`execution-node execution-node-${task.statusTone}`}
                >
                  <span className="execution-node-label">{task.graphLabel}</span>
                  <span className="execution-node-title">{task.title}</span>
                  <span className="document-name">
                    {task.displayId} · {task.statusLabel}
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
              {rowIndex < model.rows.length - 1 ? (
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
      )}
    </section>
  );
}
