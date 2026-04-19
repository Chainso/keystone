import { Link } from "react-router-dom";

import type {
  ReviewFileScaffold,
  TaskConversationEntryScaffold
} from "../../runs/run-scaffold";
import { StatusPill } from "../../../shared/layout/status-pill";

interface TaskDetailWorkspaceProps {
  runDisplayId: string;
  taskDisplayId: string;
  title: string;
  status: string;
  composerText: string;
  conversation: TaskConversationEntryScaffold[];
  reviewFiles: ReviewFileScaffold[];
}

export function TaskDetailWorkspace({
  runDisplayId,
  taskDisplayId,
  title,
  status,
  composerText,
  conversation,
  reviewFiles
}: TaskDetailWorkspaceProps) {
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

          <div className="message-stack">
            {conversation.map((message) => (
              <article
                key={`${message.speaker}-${message.body}`}
                className="message-card task-message-card"
              >
                <p className="message-card-speaker">{message.speaker}</p>
                <p className="message-card-body">{message.body}</p>
              </article>
            ))}
          </div>

          <textarea
            aria-label="Steer this task"
            className="composer-field"
            readOnly
            value={composerText}
          />

          <Link to=".." relative="route" className="back-link">
            Back to DAG
          </Link>
        </section>

        <section className="workspace-panel workspace-panel-review">
          <header className="workspace-panel-header">
            <div>
              <h2 className="workspace-panel-title">Code review sidebar</h2>
            </div>
          </header>

          <p className="review-sidebar-label">Changed files</p>

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
        </section>
      </div>
    </div>
  );
}
