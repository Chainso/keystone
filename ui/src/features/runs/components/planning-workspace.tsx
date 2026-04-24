import type { ReactNode } from "react";

import {
  DocumentFrame,
  DocumentFrameBody,
  DocumentFramePath,
  DocumentFrameRule
} from "../../../components/workspace/document-frame";
import {
  MarkdownDocumentEditor,
  MarkdownDocumentViewer
} from "../../../components/editor/markdown-document-surface";
import {
  WorkspaceEmptyState,
  WorkspaceEmptyStateActions,
  WorkspaceEmptyStateDescription,
  WorkspaceEmptyStateTitle
} from "../../../components/workspace/workspace-empty-state";
import {
  WorkspacePanel,
  WorkspacePanelActions,
  WorkspacePanelHeader,
  WorkspacePanelHeading,
  WorkspacePanelTitle
} from "../../../components/workspace/workspace-panel";
import {
  WorkspaceSplit,
  WorkspaceSplitPane
} from "../../../components/workspace/workspace-split";
import { FormTextField } from "../../../shared/forms/form-field";
import { AssistantChatSurface } from "../../conversations/assistant-chat-surface";
import type { RunPlanningPhaseViewModel } from "../use-run-view-model";

function PlanningConversationPanel({
  phaseTitle,
  conversationLocator
}: Pick<RunPlanningPhaseViewModel, "phaseTitle" | "conversationLocator">) {
  return (
    <WorkspacePanel>
      <WorkspacePanelHeader>
        <WorkspacePanelHeading>
          <WorkspacePanelTitle>{phaseTitle}</WorkspacePanelTitle>
        </WorkspacePanelHeading>
      </WorkspacePanelHeader>

      <AssistantChatSurface
        composerPlaceholder="Continue the planning conversation with Keystone."
        emptyMessage="This living document already has an attached agent chat. Send the next planning turn here."
        emptyTitle="Agent chat ready"
        locator={conversationLocator}
        unavailableMessage="Create or attach an agent chat before sending messages from this document."
        unavailableTitle="No agent chat attached"
      />
    </WorkspacePanel>
  );
}

function PlanningDocumentPanel(
  props: RunPlanningPhaseViewModel & {
    documentHeaderActions?: ReactNode;
  }
) {
  return (
    <WorkspacePanel className="workspace-panel-document">
      <WorkspacePanelHeader>
        <WorkspacePanelHeading>
          <WorkspacePanelTitle>{props.panelTitle}</WorkspacePanelTitle>
        </WorkspacePanelHeading>
        {props.documentHeaderActions ? (
          <WorkspacePanelActions>{props.documentHeaderActions}</WorkspacePanelActions>
        ) : null}
      </WorkspacePanelHeader>

      <DocumentFrame>
        <DocumentFramePath>{props.documentPath}</DocumentFramePath>
        <DocumentFrameRule />

        {props.state === "ready" ? (
          <>
            <DocumentFrameBody>
              <MarkdownDocumentViewer
                label={`${props.panelTitle} document`}
                markdown={props.documentMarkdown}
              />
            </DocumentFrameBody>
            <div className="shell-state-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  props.editDocument();
                }}
              >
                Edit document
              </button>
            </div>
          </>
        ) : props.state === "editing" ? (
          <>
            {props.submitErrorMessage ? (
              <p className="form-field-error">{props.submitErrorMessage}</p>
            ) : null}
            <div className="planning-document-editor">
              <div className="planning-document-editor-header">
                <p className="document-name">Document editor</p>
              </div>
              <div className="planning-document-editor-fields">
                <FormTextField
                  label={props.titleField.label}
                  value={props.titleField.value}
                  onChange={(event) => props.titleField.onChange(event.currentTarget.value)}
                  disabled={props.isSubmitting}
                />
              </div>
              <DocumentFrameRule />
              <MarkdownDocumentEditor
                disabled={props.documentEditor.disabled}
                label={`${props.panelTitle} document`}
                markdown={props.documentEditor.markdown}
                markdownSourceKey={props.documentEditor.markdownSourceKey}
                onMarkdownChange={props.documentEditor.onChange}
                editorLabel={props.documentEditor.editorLabel}
                placeholder={props.documentEditor.placeholder}
              />
            </div>
            <div className="shell-state-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  props.discardChanges();
                }}
                disabled={props.isSubmitting}
              >
                Discard changes
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  props.saveChanges();
                }}
                disabled={!props.canSave}
              >
                {props.saveLabel}
              </button>
            </div>
          </>
        ) : props.state === "empty" ? (
          <WorkspaceEmptyState>
            <WorkspaceEmptyStateTitle as="h3">{props.emptyTitle}</WorkspaceEmptyStateTitle>
            <WorkspaceEmptyStateDescription>{props.emptyMessage}</WorkspaceEmptyStateDescription>
            {props.actionErrorMessage ? (
              <p className="form-field-error">{props.actionErrorMessage}</p>
            ) : null}
            <WorkspaceEmptyStateActions>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  props.startEditing();
                }}
                disabled={props.isCreating}
              >
                {props.actionLabel}
              </button>
            </WorkspaceEmptyStateActions>
          </WorkspaceEmptyState>
        ) : (
          <WorkspaceEmptyState>
            <WorkspaceEmptyStateTitle as="h3">{props.errorTitle}</WorkspaceEmptyStateTitle>
            <WorkspaceEmptyStateDescription>{props.errorMessage}</WorkspaceEmptyStateDescription>
            <WorkspaceEmptyStateActions>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  props.retry();
                }}
              >
                Retry
              </button>
            </WorkspaceEmptyStateActions>
          </WorkspaceEmptyState>
        )}

      </DocumentFrame>
    </WorkspacePanel>
  );
}

export function PlanningWorkspaceFrame(
  props: RunPlanningPhaseViewModel & {
    documentHeaderActions?: ReactNode;
  }
) {
  const { documentHeaderActions, ...planningProps } = props;

  return (
    <WorkspaceSplit className="planning-workspace-split">
      <WorkspaceSplitPane>
        <PlanningConversationPanel
          phaseTitle={planningProps.phaseTitle}
          conversationLocator={planningProps.conversationLocator}
        />
      </WorkspaceSplitPane>

      <WorkspaceSplitPane>
        <PlanningDocumentPanel {...planningProps} documentHeaderActions={documentHeaderActions} />
      </WorkspaceSplitPane>
    </WorkspaceSplit>
  );
}
