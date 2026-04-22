import { Link } from "react-router-dom";

import {
  WorkspaceEmptyState,
  WorkspaceEmptyStateActions,
  WorkspaceEmptyStateDescription,
  WorkspaceEmptyStateTitle
} from "../../../components/workspace/workspace-empty-state";
import {
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspacePanelHeading,
  WorkspacePanelTitle
} from "../../../components/workspace/workspace-panel";
import type { RunExecutionViewModel } from "../use-execution-view-model";

interface ExecutionWorkspaceProps {
  model: RunExecutionViewModel;
}

export function ExecutionWorkspace({ model }: ExecutionWorkspaceProps) {
  return (
    <WorkspacePanel className="execution-panel">
      <WorkspacePanelHeader>
        <WorkspacePanelHeading>
          <WorkspacePanelTitle>Task workflow DAG</WorkspacePanelTitle>
        </WorkspacePanelHeading>
      </WorkspacePanelHeader>

      {model.state === "empty" || model.state === "pending" ? (
        <WorkspaceEmptyState>
          <WorkspaceEmptyStateTitle as="h3">
            {model.state === "pending" ? "Execution is materializing" : "Execution is read-only"}
          </WorkspaceEmptyStateTitle>
          <WorkspaceEmptyStateDescription>{model.message}</WorkspaceEmptyStateDescription>
          {model.state === "pending" ? (
            <WorkspaceEmptyStateActions>
              <button
                type="button"
                className="ghost-button"
                onClick={model.refresh}
              >
                {model.refreshLabel}
              </button>
            </WorkspaceEmptyStateActions>
          ) : null}
        </WorkspaceEmptyState>
      ) : (
        <div className="execution-board" aria-label="Execution workflow graph">
          <p className="document-card-summary" aria-label="Execution summary">
            {model.summary}
          </p>

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
                  <span className="execution-node-label">{task.taskId}</span>
                  <span className="execution-node-title">{task.title}</span>
                  <span className="document-name">{task.statusLabel}</span>
                  {task.dependencyCount > 0 ? (
                    <span className="document-card-summary">
                      Depends on {task.dependencyCount} prior {task.dependencyCount === 1 ? "task" : "tasks"}
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
    </WorkspacePanel>
  );
}
