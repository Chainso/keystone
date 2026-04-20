import { Link } from "react-router-dom";

import { StatusPill } from "../../../shared/layout/status-pill";
import type {
  TaskArtifactViewModel,
  TaskDependencyViewModel,
  TaskDetailViewModel
} from "../use-execution-view-model";

function TaskDependencyList({
  label,
  tasks
}: {
  label: string;
  tasks: TaskDependencyViewModel[];
}) {
  return (
    <section className="document-card">
      <p className="review-sidebar-label">{label}</p>
      {tasks.length === 0 ? (
        <p className="document-card-summary">None.</p>
      ) : (
        <ul className="message-stack" aria-label={label}>
          {tasks.map((task) => (
            <li key={task.taskId} className="message-card">
              <p className="message-card-speaker">{task.displayId}</p>
              <p className="message-card-body">{task.title}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskArtifactCard({ artifact, open }: { artifact: TaskArtifactViewModel; open: boolean }) {
  return (
    <details className="review-file-card" open={open}>
      <summary className="review-file-summary">
        <span>{artifact.path}</span>
        <span className="review-file-note">{artifact.summary}</span>
      </summary>
      <pre className="review-file-diff">{artifact.diff.join("\n")}</pre>
    </details>
  );
}

export function TaskDetailWorkspace({
  runDisplayId,
  taskDisplayId,
  title,
  status,
  backPath,
  conversationLocator,
  dependsOn,
  blockedBy,
  artifacts
}: TaskDetailViewModel) {
  return (
    <div className="page-stage">
      <header className="run-detail-header">
        <h1 className="run-detail-title">
          {runDisplayId} / {taskDisplayId}
        </h1>
      </header>

      <div className="workspace-split task-detail-split">
        <section className="workspace-panel">
          <header className="workspace-panel-header">
            <div>
              <h2 className="workspace-panel-title">Task conversation</h2>
            </div>
            <StatusPill label={status} />
          </header>

          <p className="task-detail-title">{title}</p>

          <section className="document-card" aria-label="Conversation status">
            <p className="review-sidebar-label">Conversation status</p>
            {conversationLocator ? (
              <>
                <p className="message-card-speaker">Conversation attached to this task.</p>
                <p className="document-card-summary">
                  Task updates will resolve through the attached conversation when chat transport is added.
                </p>
              </>
            ) : (
              <p className="document-card-summary">No conversation is attached to this task yet.</p>
            )}
          </section>

          <TaskDependencyList label="Depends on" tasks={dependsOn} />
          <TaskDependencyList label="Blocked by" tasks={blockedBy} />

          <Link to={backPath} className="back-link">
            Back to DAG
          </Link>
        </section>

        <section className="workspace-panel workspace-panel-review">
          <header className="workspace-panel-header">
            <div>
              <h2 className="workspace-panel-title">Artifacts and review</h2>
            </div>
          </header>

          <p className="review-sidebar-label">Changed files</p>

          {artifacts.length === 0 ? (
            <p className="document-card-summary">No artifacts recorded for this task yet.</p>
          ) : (
            <div className="review-file-stack">
              {artifacts.map((artifact, index) => (
                <TaskArtifactCard key={artifact.artifactId} artifact={artifact} open={index === 0} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
