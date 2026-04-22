import { useRef, useState } from "react";
import { Link } from "react-router-dom";

import { StatusPill } from "../../../shared/layout/status-pill";
import type {
  TaskArtifactViewModel,
  TaskDetailViewModel,
  TaskDependencyViewModel
} from "../use-execution-view-model";
import { useRunManagementApi } from "../../runs/run-detail-context";

type ArtifactPreviewState =
  | { status: "idle" | "loading" }
  | { content: string; status: "ready" }
  | { message: string; status: "empty" | "error" | "unsupported" };

function getArtifactPreviewCompatibility(contentType: string) {
  const normalized = contentType.toLowerCase();
  const supportedTextIndicators = [
    "json",
    "xml",
    "yaml",
    "yml",
    "javascript",
    "typescript",
    "sql",
    "markdown",
    "csv",
    "toml",
    "x-sh"
  ];

  const previewSupported =
    normalized.startsWith("text/") ||
    supportedTextIndicators.some((indicator) => normalized.includes(indicator));

  if (previewSupported) {
    return {
      helperMessage: "Text preview is available for this artifact and loads on demand through the run API seam.",
      previewSupported
    };
  }

  return {
    helperMessage: `Preview unavailable in this view because ${contentType} is not text-compatible.`,
    previewSupported
  };
}

function getArtifactPreviewErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load artifact content.";
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
              <p className="message-card-speaker">{task.taskId}</p>
              <p className="message-card-body">{task.title}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskArtifactCard({ artifact, open }: { artifact: TaskArtifactViewModel; open: boolean }) {
  const api = useRunManagementApi();
  const previewCompatibility = getArtifactPreviewCompatibility(artifact.contentType);
  const requestIdRef = useRef(0);
  const [preview, setPreview] = useState<ArtifactPreviewState>(() =>
    previewCompatibility.previewSupported
      ? { status: "idle" }
      : {
          message: previewCompatibility.helperMessage,
          status: "unsupported"
        }
  );

  async function loadPreview() {
    if (!previewCompatibility.previewSupported) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setPreview({ status: "loading" });

    try {
      const content = await api.getArtifactContent(artifact.contentUrl);

      if (requestIdRef.current !== requestId) {
        return;
      }

      if (!content.trim()) {
        setPreview({
          message: "Artifact content is empty.",
          status: "empty"
        });

        return;
      }

      setPreview({
        content,
        status: "ready"
      });
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setPreview({
        message: getArtifactPreviewErrorMessage(error),
        status: "error"
      });
    }
  }

  return (
    <details className="review-file-card" open={open}>
      <summary className="review-file-summary">
        <span>{artifact.artifactId}</span>
        <span className="review-file-note">{artifact.kind}</span>
      </summary>
      <div className="document-copy">
        <p className="document-line">Content type: {artifact.contentType}</p>
        <p className="document-line">Size: {artifact.sizeLabel}</p>
        {artifact.sha256 ? <p className="document-line">SHA-256: {artifact.sha256}</p> : null}
        <p className="document-card-summary">{previewCompatibility.helperMessage}</p>
        <p className="document-card-summary">
          Direct browser links are not available here yet.
        </p>
        {preview.status === "unsupported" ? null : preview.status === "ready" ? (
          <>
            <p className="document-card-summary">Loaded through the run API seam.</p>
            <pre className="document-copy">
              <code>{preview.content}</code>
            </pre>
          </>
        ) : preview.status === "empty" ? (
          <p className="document-card-summary">{preview.message}</p>
        ) : preview.status === "error" ? (
          <>
            <p className="document-card-summary">{preview.message}</p>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                void loadPreview();
              }}
            >
              Retry preview
            </button>
          </>
        ) : (
          <button
            type="button"
            className="ghost-button"
            disabled={preview.status === "loading"}
            onClick={() => {
              void loadPreview();
            }}
          >
            {preview.status === "loading" ? "Loading text preview..." : "Load text preview"}
          </button>
        )}
      </div>
    </details>
  );
}

export function TaskDetailWorkspace({ model }: { model: TaskDetailViewModel }) {
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
            {model.state === "ready" ? <StatusPill label={model.status} /> : null}
          </header>

          {model.state === "ready" ? (
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
              <TaskDependencyList label="Downstream tasks" tasks={model.downstreamTasks} />
            </>
          ) : (
            <section className="empty-state-card">
              <h3 className="document-card-title">
                {model.state === "not_found" ? "Task not found" : "Execution unavailable"}
              </h3>
              <p className="document-card-summary">{model.message}</p>
            </section>
          )}

          <Link to={model.backPath} className="back-link">
            Back to DAG
          </Link>
        </section>

        <section className="workspace-panel workspace-panel-review">
          <header className="workspace-panel-header">
            <div>
              <h2 className="workspace-panel-title">Artifacts and review</h2>
            </div>
          </header>

          <p className="review-sidebar-label">Artifacts</p>

          {model.state !== "ready" ? (
            <p className="document-card-summary">Task artifacts are unavailable for this route.</p>
          ) : model.artifacts.state === "loading" ? (
            <p className="document-card-summary">{model.artifacts.message}</p>
          ) : model.artifacts.state === "error" ? (
            <section className="empty-state-card">
              <h3 className="document-card-title">Unable to load task artifacts</h3>
              <p className="document-card-summary">{model.artifacts.message}</p>
              <div className="shell-state-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    model.artifacts.retry?.();
                  }}
                >
                  Retry
                </button>
              </div>
            </section>
          ) : model.artifacts.state === "empty" ? (
            <p className="document-card-summary">{model.artifacts.message}</p>
          ) : (
            <div className="review-file-stack">
              {model.artifacts.items.map((artifact, index) => (
                <TaskArtifactCard key={artifact.artifactId} artifact={artifact} open={index === 0} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
