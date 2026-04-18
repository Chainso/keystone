import { Link } from "react-router-dom";

import type {
  ReviewFileScaffold,
  TaskConversationEntryScaffold
} from "../../features/runs/run-scaffold";
import { StatusPill } from "./status-pill";

interface TaskDetailWorkspaceProps {
  runDisplayId: string;
  taskDisplayId: string;
  title: string;
  status: string;
  summary: string;
  steeringNotice: string;
  conversation: TaskConversationEntryScaffold[];
  reviewFiles: ReviewFileScaffold[];
  artifactNotes: string[];
}

export function TaskDetailWorkspace({
  runDisplayId,
  taskDisplayId,
  title,
  status,
  summary,
  steeringNotice,
  conversation,
  reviewFiles,
  artifactNotes
}: TaskDetailWorkspaceProps) {
  return (
    <div className="workspace-split task-detail-split">
      <section className="workspace-panel">
        <header className="workspace-panel-header">
          <div>
            <p className="workspace-panel-eyebrow">Task detail</p>
            <h2 className="workspace-panel-title">
              {runDisplayId} / {taskDisplayId}
            </h2>
          </div>
          <div className="task-detail-heading">
            <StatusPill label={status} />
            <p className="workspace-panel-summary">{title}</p>
          </div>
        </header>

        <p className="task-detail-summary">{summary}</p>

        <div className="message-stack">
          {conversation.map((message) => (
            <article
              key={`${message.speaker}-${message.body}`}
              className="message-card task-message-card"
            >
              <p className="message-card-speaker">
                {message.speaker} <span className="message-card-tone">{message.tone}</span>
              </p>
              <p className="message-card-body">{message.body}</p>
            </article>
          ))}
        </div>

        <div className="composer-placeholder">
          <p className="composer-placeholder-label">Steer this task</p>
          <p className="composer-placeholder-copy">{steeringNotice}</p>
        </div>

        <Link to=".." relative="route" className="back-link">
          Back to DAG
        </Link>
      </section>

      <section className="workspace-panel workspace-panel-review">
        <header className="workspace-panel-header">
          <div>
            <p className="workspace-panel-eyebrow">Review sidebar</p>
            <h2 className="workspace-panel-title">Changed files</h2>
          </div>
          <p className="workspace-panel-summary">
            One-pane placeholder diffs and artifact notes stay local to this route.
          </p>
        </header>

        <div className="review-file-stack">
          {reviewFiles.map((file, index) => (
            <details key={file.path} className="review-file-card" open={index === 0}>
              <summary className="review-file-summary">
                <span>{file.path}</span>
                <span className="review-file-note">{file.summary}</span>
              </summary>
              <pre className="review-file-diff">{file.diff.join("\n")}</pre>
            </details>
          ))}
        </div>

        <div className="document-section">
          <p className="document-section-label">Artifact and evidence notes</p>
          <ul className="page-list compact-list">
            {artifactNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
