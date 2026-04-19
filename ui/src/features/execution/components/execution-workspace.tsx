import { Fragment } from "react";
import { Link } from "react-router-dom";

import type { ExecutionTaskScaffold } from "../../runs/run-scaffold";

interface ExecutionWorkspaceProps {
  tasks: ExecutionTaskScaffold[];
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

export function ExecutionWorkspace({ tasks }: ExecutionWorkspaceProps) {
  const primaryTasks = tasks.filter((task) => task.taskId !== "task-034");
  const branchTask = tasks.find((task) => task.taskId === "task-034");

  return (
    <section className="workspace-panel execution-panel">
      <header className="workspace-panel-header">
        <div>
          <h2 className="workspace-panel-title">Task workflow DAG</h2>
        </div>
      </header>

      <div className="execution-board">
        <div className="execution-dag-row">
          {primaryTasks.map((task, index) => (
            <Fragment key={task.taskId}>
              {index > 0 ? (
                <span aria-hidden="true" className="execution-dag-arrow">
                  -&gt;
                </span>
              ) : null}
              <Link
                to={task.detailPath}
                className={`execution-node execution-node-${getExecutionNodeTone(task.status)}`}
              >
                <span className="execution-node-label">{task.graphLabel}</span>
                <span className="execution-node-title">{task.title}</span>
              </Link>
            </Fragment>
          ))}
        </div>

        {branchTask ? (
          <div className="execution-dag-row execution-dag-row-branch">
            <span aria-hidden="true" className="execution-dag-branch-arrow">
              \-&gt;
            </span>
            <Link
              to={branchTask.detailPath}
              className={`execution-node execution-node-${getExecutionNodeTone(branchTask.status)}`}
            >
              <span className="execution-node-label">{branchTask.graphLabel}</span>
              <span className="execution-node-title">{branchTask.title}</span>
            </Link>
          </div>
        ) : null}

        <p className="execution-board-note">running = highlighted   queued = dim   done = solid</p>
        <p className="execution-board-note">Click a task node to open that task inside Execution.</p>
      </div>
    </section>
  );
}
