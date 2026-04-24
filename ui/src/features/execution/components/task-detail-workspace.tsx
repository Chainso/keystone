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
  WorkspacePanelTitle
} from "../../../components/workspace/workspace-panel";
import {
  WorkspaceSplit,
  WorkspaceSplitPane
} from "../../../components/workspace/workspace-split";
import { StatusPill } from "../../../shared/layout/status-pill";
import { AssistantChatSurface } from "../../conversations/assistant-chat-surface";
import type { TaskDetailViewModel } from "../use-execution-view-model";
import { TaskReviewSidebar } from "./task-review-sidebar";

export function TaskDetailWorkspace({ model }: { model: TaskDetailViewModel }) {
  return (
    <div className="task-detail-workspace">
      <WorkspaceSplit className="task-detail-split">
        <WorkspaceSplitPane>
          <WorkspacePanel>
            <WorkspacePanelHeader>
              <WorkspacePanelHeading>
                <WorkspacePanelTitle>Task conversation</WorkspacePanelTitle>
              </WorkspacePanelHeading>
              <div className="task-detail-header-actions">
                {model.state === "ready" ? (
                  <StatusPill label={model.statusLabel} tone={model.statusTone} />
                ) : null}
                <Link to={model.backPath} className="back-link">
                  Back to DAG
                </Link>
              </div>
            </WorkspacePanelHeader>

            <div className="task-detail-pane-body">
              {model.state === "ready" ? (
                <div className="task-detail-context" aria-label="Task context">
                  <p className="task-detail-title">
                    {model.runDisplayId} / {model.taskDisplayId}
                  </p>
                  <p className="document-name">
                    {model.title} · {model.activityLabel}
                  </p>
                </div>
              ) : null}

              {model.state === "ready" ? (
                <AssistantChatSurface
                  composerPlaceholder="Continue this task conversation with Keystone."
                  contextTitle={model.title}
                  emptyMessage="This task already has an attached conversation. Send the next implementation turn here."
                  emptyTitle="Task conversation ready"
                  locator={model.conversationLocator}
                  unavailableMessage="Task conversation becomes available after the run task record is ready."
                  unavailableTitle="No task conversation attached"
                />
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
