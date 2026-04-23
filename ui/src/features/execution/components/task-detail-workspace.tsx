import { Link } from "react-router-dom";

import { DocumentFrameSummary } from "../../../components/workspace/document-frame";
import {
  WorkspaceEmptyState,
  WorkspaceEmptyStateDescription,
  WorkspaceEmptyStateTitle
} from "../../../components/workspace/workspace-empty-state";
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
import { AssistantChatSurface } from "../../conversations/assistant-chat-surface";
import type {
  TaskDependencyViewModel,
  TaskDetailViewModel
} from "../use-execution-view-model";
import { TaskReviewSidebar } from "./task-review-sidebar";

function TaskDependencyStrip({
  label,
  tasks
}: {
  label: string;
  tasks: TaskDependencyViewModel[];
}) {
  return (
    <section className="task-dependency-strip" aria-label={label}>
      <p className="review-sidebar-label">{label}</p>
      {tasks.length === 0 ? (
        <DocumentFrameSummary>None.</DocumentFrameSummary>
      ) : (
        <ul className="task-dependency-list" aria-label={label}>
          {tasks.map((task) => (
            <li key={task.taskId}>
              <Link to={task.detailPath} className="task-context-link">
                <span className="task-dependency-title">{task.title}</span>
                <span className="document-name">{`${task.taskId} · ${task.statusLabel}`}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TaskDetailWorkspace({ model }: { model: TaskDetailViewModel }) {
  return (
    <div className="task-detail-workspace">
      <WorkspaceSplit className="task-detail-split">
        <WorkspaceSplitPane>
          <WorkspacePanel>
            <div className="task-detail-pane-body">
              <section className="task-context-bar" aria-label="Task context">
                <div className="task-context-copy">
                  <p className="review-sidebar-label">Task scope</p>
                  <h2 className="run-detail-title">
                    {model.runDisplayId} / {model.taskDisplayId}
                  </h2>
                  {model.state === "ready" ? (
                    <p className="task-detail-title">{model.title}</p>
                  ) : null}
                  {model.state === "ready" ? (
                    <DocumentFrameSummary>{model.description}</DocumentFrameSummary>
                  ) : null}
                </div>
                <div className="task-context-meta">
                  {model.state === "ready" ? (
                    <div className="task-context-actions">
                      <StatusPill label={model.statusLabel} tone={model.statusTone} />
                    </div>
                  ) : null}
                  <Link to={model.backPath} className="back-link">
                    Back to DAG
                  </Link>
                  {model.state === "ready" ? (
                    <p className="document-name">{model.activityLabel}</p>
                  ) : null}
                  {model.state === "ready" ? (
                    <div className="task-context-grid">
                      <TaskDependencyStrip label="Depends on" tasks={model.dependsOn} />
                      <TaskDependencyStrip label="Downstream tasks" tasks={model.downstreamTasks} />
                    </div>
                  ) : null}
                </div>
              </section>

              {model.state === "ready" ? (
                <>
                <WorkspacePanelHeader>
                  <WorkspacePanelHeading>
                    <WorkspacePanelTitle>Task conversation</WorkspacePanelTitle>
                  </WorkspacePanelHeading>
                  <WorkspacePanelSummary>
                    Task handoff, execution notes, and live approvals all run through the attached Cloudflare conversation.
                  </WorkspacePanelSummary>
                </WorkspacePanelHeader>

                <AssistantChatSurface
                  composerPlaceholder="Continue this task conversation with Keystone."
                  emptyMessage="This task already has a persisted Cloudflare conversation. Send the next implementation turn here."
                  emptyTitle="Task conversation ready"
                  locator={model.conversationLocator}
                  unavailableMessage="Task chat becomes available after the run task record provisions a Cloudflare conversation locator."
                  unavailableTitle="No task conversation attached"
                />
                </>
              ) : (
                <WorkspaceEmptyState>
                  <WorkspaceEmptyStateTitle as="h3">
                    {model.state === "not_found" ? "Task not found" : "Execution unavailable"}
                  </WorkspaceEmptyStateTitle>
                  <WorkspaceEmptyStateDescription>{model.message}</WorkspaceEmptyStateDescription>
                </WorkspaceEmptyState>
              )}
            </div>
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
    </div>
  );
}
