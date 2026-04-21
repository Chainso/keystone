import { Link } from "react-router-dom";

import { StatusPill } from "../../../shared/layout/status-pill";
import type {
  TaskArtifactViewModel,
  TaskDependencyViewModel,
  TaskDetailViewModel
} from "../use-execution-view-model";

interface TaskDetailWorkspaceProps {
  model: TaskDetailViewModel;
}

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
        <span>{artifact.title}</span>
        <span className="review-file-note">{artifact.summary}</span>
      </summary>
      {artifact.details.length > 0 ? (
        <pre className="review-file-diff">{artifact.details.join("\n")}</pre>
      ) : null}
      {artifact.href ? (
        <p className="document-card-summary">
          <a href={artifact.href}>Open raw artifact</a>
        </p>
      ) : null}
    </details>
  );
}

export function TaskDetailWorkspace({ model }: TaskDetailWorkspaceProps) {
  return (
    <div className="page-stage">
      <header className="run-detail-header">
        <h1 className="run-detail-title">
          {model.runDisplayId} / {model.taskDisplayId}
        </h1>
      </header>

      <div className="workspace-split task-detail-split">
        <section className="workspace-panel">
          <header className="workspace-panel-header">
            <div>
              <h2 className="workspace-panel-title">Task conversation</h2>
            </div>
            <StatusPill label={model.status} />
          </header>

          {model.compatibilityState ? (
            <>
              <section className="empty-state-card">
                <h3 className="document-card-title">{model.compatibilityState.heading}</h3>
                <p className="document-card-summary">{model.compatibilityState.message}</p>
                {model.compatibilityState.actionLabel ? (
                  <button type="button" className="secondary-button" onClick={model.retry}>
                    {model.compatibilityState.actionLabel}
                  </button>
                ) : null}
              </section>

              <Link to={model.backPath} className="back-link">
                Back to DAG
              </Link>
            </>
          ) : (
            <>
              <p className="task-detail-title">{model.title}</p>

              <section className="document-card" aria-label="Conversation status">
                <p className="review-sidebar-label">Conversation status</p>
                {model.conversationLocator ? (
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

              <TaskDependencyList label="Depends on" tasks={model.dependsOn} />
              <TaskDependencyList label="Blocked by" tasks={model.blockedBy} />

              <Link to={model.backPath} className="back-link">
                Back to DAG
              </Link>
            </>
          )}
        </section>

        <section className="workspace-panel workspace-panel-review">
          <header className="workspace-panel-header">
            <div>
              <h2 className="workspace-panel-title">Artifacts and review</h2>
            </div>
          </header>

          <p className="review-sidebar-label">{model.artifactSectionLabel}</p>
          {model.artifactNotice ? <p className="document-card-summary">{model.artifactNotice}</p> : null}

          {model.artifacts.length === 0 ? (
            <p className="document-card-summary">{model.artifactEmptyMessage}</p>
          ) : (
            <div className="review-file-stack">
              {model.artifacts.map((artifact, index) => (
                <TaskArtifactCard key={artifact.artifactId} artifact={artifact} open={index === 0} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
