import { Link } from "react-router-dom";

import type { ExecutionTaskScaffold } from "../../features/runs/run-scaffold";
import { PageSection } from "./page-section";
import { StatusPill } from "./status-pill";

interface ExecutionWorkspaceProps {
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
}

export function ExecutionWorkspace({
  summary,
  graphNotes,
  backendCoverage,
  deferredWork,
  stats,
  tasks
}: ExecutionWorkspaceProps) {
  const taskLookup = new Map(tasks.map((task) => [task.taskId, task.displayId]));

  return (
    <div className="execution-grid">
      <section className="workspace-panel execution-panel">
        <header className="workspace-panel-header">
          <div>
            <p className="workspace-panel-eyebrow">Execution default</p>
            <h2 className="workspace-panel-title">Task workflow DAG</h2>
          </div>
          <p className="workspace-panel-summary">{summary}</p>
        </header>

        <div className="execution-stats" aria-label="Execution summary">
          <div className="execution-stat-card">
            <span className="execution-stat-label">Total</span>
            <strong className="execution-stat-value">{stats.totalTasks}</strong>
          </div>
          <div className="execution-stat-card">
            <span className="execution-stat-label">Running</span>
            <strong className="execution-stat-value">{stats.activeTasks}</strong>
          </div>
          <div className="execution-stat-card">
            <span className="execution-stat-label">Blocked</span>
            <strong className="execution-stat-value">{stats.blockedTasks}</strong>
          </div>
          <div className="execution-stat-card">
            <span className="execution-stat-label">Complete</span>
            <strong className="execution-stat-value">{stats.completedTasks}</strong>
          </div>
          <div className="execution-stat-card">
            <span className="execution-stat-label">Ready</span>
            <strong className="execution-stat-value">{stats.readyTasks}</strong>
          </div>
        </div>

        <div className="execution-flow">
          {tasks.map((task) => (
            <Link key={task.taskId} to={task.detailPath} className="task-node-card">
              <div className="task-node-header">
                <div>
                  <p className="task-node-id">{task.displayId}</p>
                  <h3 className="task-node-title">{task.title}</h3>
                </div>
                <StatusPill label={task.status} />
              </div>
              <p className="task-node-note">{task.note}</p>
              {task.blockedBy.length > 0 ? (
                <p className="task-node-meta">
                  Blocked by {task.blockedBy.map((item) => taskLookup.get(item) ?? item).join(", ")}
                </p>
              ) : task.dependsOn.length > 0 ? (
                <p className="task-node-meta">
                  Depends on {task.dependsOn.map((item) => taskLookup.get(item) ?? item).join(", ")}
                </p>
              ) : (
                <p className="task-node-meta">No blockers in the fixed Phase 2 scaffold.</p>
              )}
            </Link>
          ))}
        </div>
      </section>

      <div className="execution-sidebar">
        <PageSection eyebrow="Locked now" title="Execution shell decisions">
          <ul className="page-list compact-list">
            {graphNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </PageSection>

        <PageSection eyebrow="Coverage" title="Current API fit">
          <ul className="page-list compact-list">
            {backendCoverage.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </PageSection>

        <PageSection eyebrow="Deferred" title="Still intentionally stubbed">
          <ul className="page-list compact-list">
            {deferredWork.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </PageSection>
      </div>
    </div>
  );
}
