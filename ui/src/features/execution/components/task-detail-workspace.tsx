import { useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  DocumentFrameBody,
  DocumentFrameSummary
} from "../../../components/workspace/document-frame";
import {
  ReviewFileCard,
  ReviewFileStack,
  ReviewFileSummary,
  ReviewSection,
  ReviewSectionLabel
} from "../../../components/workspace/review-frame";
import {
  WorkspaceEmptyState,
  WorkspaceEmptyStateActions,
  WorkspaceEmptyStateDescription,
  WorkspaceEmptyStateTitle
} from "../../../components/workspace/workspace-empty-state";
import {
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePageHeading
} from "../../../components/workspace/workspace-page";
import {
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspacePanelHeading,
  WorkspacePanelTitle
} from "../../../components/workspace/workspace-panel";
import {
  WorkspaceSplit,
  WorkspaceSplitPane
} from "../../../components/workspace/workspace-split";
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
    <ReviewSection>
      <ReviewSectionLabel>{label}</ReviewSectionLabel>
      {tasks.length === 0 ? (
        <DocumentFrameSummary>None.</DocumentFrameSummary>
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
    </ReviewSection>
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
    <ReviewFileCard open={open}>
      <ReviewFileSummary>
        <span>{artifact.artifactId}</span>
        <span className="review-file-note">{artifact.kind}</span>
      </ReviewFileSummary>
      <DocumentFrameBody>
        <p className="document-line">Content type: {artifact.contentType}</p>
        <p className="document-line">Size: {artifact.sizeLabel}</p>
        {artifact.sha256 ? <p className="document-line">SHA-256: {artifact.sha256}</p> : null}
        <DocumentFrameSummary>{previewCompatibility.helperMessage}</DocumentFrameSummary>
        <DocumentFrameSummary>
          Direct browser links are not available here yet.
        </DocumentFrameSummary>
        {preview.status === "unsupported" ? null : preview.status === "ready" ? (
          <>
            <DocumentFrameSummary>Loaded through the run API seam.</DocumentFrameSummary>
            <pre className="document-copy">
              <code>{preview.content}</code>
            </pre>
          </>
        ) : preview.status === "empty" ? (
          <DocumentFrameSummary>{preview.message}</DocumentFrameSummary>
        ) : preview.status === "error" ? (
          <>
            <DocumentFrameSummary>{preview.message}</DocumentFrameSummary>
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
      </DocumentFrameBody>
    </ReviewFileCard>
  );
}

export function TaskDetailWorkspace({ model }: { model: TaskDetailViewModel }) {
  return (
    <WorkspacePage>
      <WorkspacePageHeader className="run-detail-header">
        <WorkspacePageHeading>
        <h1 className="run-detail-title">
          {model.runDisplayId} / {model.taskDisplayId}
        </h1>
        </WorkspacePageHeading>
      </WorkspacePageHeader>

      <WorkspaceSplit className="task-detail-split">
        <WorkspaceSplitPane>
          <WorkspacePanel>
            <WorkspacePanelHeader>
              <WorkspacePanelHeading>
                <WorkspacePanelTitle>Task conversation</WorkspacePanelTitle>
              </WorkspacePanelHeading>
            {model.state === "ready" ? (
              <StatusPill label={model.statusLabel} tone={model.statusTone} />
            ) : null}
            </WorkspacePanelHeader>

          {model.state === "ready" ? (
            <>
              <p className="task-detail-title">{model.title}</p>

              <ReviewSection aria-label="Conversation status">
                <ReviewSectionLabel>Conversation status</ReviewSectionLabel>
                {model.conversationLocator ? (
                  <>
                    <p className="message-card-speaker">Conversation attached to this task.</p>
                    <DocumentFrameSummary>
                      Task updates will resolve through the attached conversation when chat transport is added.
                    </DocumentFrameSummary>
                  </>
                ) : (
                  <DocumentFrameSummary>No conversation is attached to this task yet.</DocumentFrameSummary>
                )}
              </ReviewSection>

              <TaskDependencyList label="Depends on" tasks={model.dependsOn} />
              <TaskDependencyList label="Downstream tasks" tasks={model.downstreamTasks} />
            </>
          ) : (
            <WorkspaceEmptyState>
              <WorkspaceEmptyStateTitle as="h3">
                {model.state === "not_found" ? "Task not found" : "Execution unavailable"}
              </WorkspaceEmptyStateTitle>
              <WorkspaceEmptyStateDescription>{model.message}</WorkspaceEmptyStateDescription>
            </WorkspaceEmptyState>
          )}

          <Link to={model.backPath} className="back-link">
            Back to DAG
          </Link>
          </WorkspacePanel>
        </WorkspaceSplitPane>

        <WorkspaceSplitPane>
          <WorkspacePanel className="workspace-panel-review">
            <WorkspacePanelHeader>
              <WorkspacePanelHeading>
                <WorkspacePanelTitle>Artifacts and review</WorkspacePanelTitle>
              </WorkspacePanelHeading>
            </WorkspacePanelHeader>

            <ReviewSectionLabel>Artifacts</ReviewSectionLabel>

          {model.state !== "ready" ? (
            <DocumentFrameSummary>Task artifacts are unavailable for this route.</DocumentFrameSummary>
          ) : model.artifacts.state === "loading" ? (
            <DocumentFrameSummary>{model.artifacts.message}</DocumentFrameSummary>
          ) : model.artifacts.state === "error" ? (
            <WorkspaceEmptyState>
              <WorkspaceEmptyStateTitle as="h3">Unable to load task artifacts</WorkspaceEmptyStateTitle>
              <WorkspaceEmptyStateDescription>{model.artifacts.message}</WorkspaceEmptyStateDescription>
              <WorkspaceEmptyStateActions>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    model.artifacts.retry?.();
                  }}
                >
                  Retry
                </button>
              </WorkspaceEmptyStateActions>
            </WorkspaceEmptyState>
          ) : model.artifacts.state === "empty" ? (
            <DocumentFrameSummary>{model.artifacts.message}</DocumentFrameSummary>
          ) : (
            <ReviewFileStack>
              {model.artifacts.items.map((artifact, index) => (
                <TaskArtifactCard key={artifact.artifactId} artifact={artifact} open={index === 0} />
              ))}
            </ReviewFileStack>
          )}
          </WorkspacePanel>
        </WorkspaceSplitPane>
      </WorkspaceSplit>
    </WorkspacePage>
  );
}
