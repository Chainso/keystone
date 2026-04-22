import { Link } from "react-router-dom";

import { DocumentFrameSummary } from "../../../components/workspace/document-frame";
import {
  ReviewSection,
  ReviewSectionLabel
} from "../../../components/workspace/review-frame";
import {
  WorkspaceEmptyState,
  WorkspaceEmptyStateDescription,
  WorkspaceEmptyStateTitle
} from "../../../components/workspace/workspace-empty-state";
import {
  WorkspacePage,
  WorkspacePageActions,
  WorkspacePageHeader,
  WorkspacePageHeading
} from "../../../components/workspace/workspace-page";
import {
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspacePanelHeading,
  WorkspacePanelSummary,
  WorkspacePanelTitle
} from "../../../components/workspace/workspace-panel";
import {
  WorkspaceSplit,
  WorkspaceSplitPane
} from "../../../components/workspace/workspace-split";
import { StatusPill } from "../../../shared/layout/status-pill";
import type {
  TaskConversationEntryViewModel,
  TaskDependencyViewModel,
  TaskDetailViewModel
} from "../use-execution-view-model";
import { TaskReviewSidebar } from "./task-review-sidebar";

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
              <Link to={task.detailPath} className="task-context-link">
                <p className="message-card-speaker">
                  {task.taskId} · {task.statusLabel}
                </p>
                <p className="message-card-body">{task.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ReviewSection>
  );
}

function TaskConversationEntries({
  entries
}: {
  entries: TaskConversationEntryViewModel[];
}) {
  return (
    <div className="task-conversation-stack" aria-label="Task conversation timeline">
      {entries.map((entry) => (
        <article key={entry.speaker} className="message-card">
          <p className="message-card-speaker">{entry.speaker}</p>
          <p className="message-card-body">{entry.body}</p>
        </article>
      ))}
    </div>
  );
}

export function TaskDetailWorkspace({ model }: { model: TaskDetailViewModel }) {
  return (
    <WorkspacePage>
      <WorkspacePageHeader className="run-detail-header">
        <WorkspacePageHeading>
          <p className="page-eyebrow">Task workspace</p>
          <h1 className="run-detail-title">
            {model.runDisplayId} / {model.taskDisplayId}
          </h1>
          {model.state === "ready" ? <p className="page-summary">{model.title}</p> : null}
        </WorkspacePageHeading>

        <WorkspacePageActions className="task-detail-header-actions">
          {model.state === "ready" ? (
            <StatusPill label={model.statusLabel} tone={model.statusTone} />
          ) : null}
          <Link to={model.backPath} className="back-link">
            Back to DAG
          </Link>
        </WorkspacePageActions>
      </WorkspacePageHeader>

      <WorkspaceSplit className="task-detail-split">
        <WorkspaceSplitPane>
          <WorkspacePanel>
            <WorkspacePanelHeader>
              <WorkspacePanelHeading>
                <WorkspacePanelTitle>Task conversation</WorkspacePanelTitle>
              </WorkspacePanelHeading>
              <WorkspacePanelSummary>
                Task handoff, execution notes, and the current live-chat gap for this task.
              </WorkspacePanelSummary>
            </WorkspacePanelHeader>

            {model.state === "ready" ? (
              <div className="task-detail-pane-body">
                <TaskConversationEntries entries={model.conversationEntries} />

                <ReviewSection>
                  <ReviewSectionLabel>Task scope</ReviewSectionLabel>
                  <p className="task-detail-title">{model.title}</p>
                  <DocumentFrameSummary>{model.description}</DocumentFrameSummary>
                  <DocumentFrameSummary>{model.activityLabel}</DocumentFrameSummary>
                </ReviewSection>

                <div className="task-context-grid">
                  <TaskDependencyList label="Depends on" tasks={model.dependsOn} />
                  <TaskDependencyList label="Downstream tasks" tasks={model.downstreamTasks} />
                </div>

                <div className="conversation-composer-placeholder">
                  Live task conversation remains out of scope in this phase. This frame will accept
                  real messages once the chat runtime is wired.
                </div>
              </div>
            ) : (
              <WorkspaceEmptyState>
                <WorkspaceEmptyStateTitle as="h3">
                  {model.state === "not_found" ? "Task not found" : "Execution unavailable"}
                </WorkspaceEmptyStateTitle>
                <WorkspaceEmptyStateDescription>{model.message}</WorkspaceEmptyStateDescription>
              </WorkspaceEmptyState>
            )}
          </WorkspacePanel>
        </WorkspaceSplitPane>

        <WorkspaceSplitPane>
          <WorkspacePanel className="workspace-panel-review">
            <WorkspacePanelHeader>
              <WorkspacePanelHeading>
                <WorkspacePanelTitle>Code review</WorkspacePanelTitle>
              </WorkspacePanelHeading>
              {model.state === "ready" ? (
                <WorkspacePanelSummary>{model.reviewSummary}</WorkspacePanelSummary>
              ) : (
                <WorkspacePanelSummary>
                  Review artifacts appear here once the live task record is ready.
                </WorkspacePanelSummary>
              )}
            </WorkspacePanelHeader>

            {model.state === "ready" ? (
              <TaskReviewSidebar artifacts={model.artifacts} />
            ) : (
              <DocumentFrameSummary>Task artifacts are unavailable for this route.</DocumentFrameSummary>
            )}
          </WorkspacePanel>
        </WorkspaceSplitPane>
      </WorkspaceSplit>
    </WorkspacePage>
  );
}
