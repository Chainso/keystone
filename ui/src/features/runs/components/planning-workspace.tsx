import {
  DocumentFrame,
  DocumentFrameBody,
  DocumentFramePath,
  DocumentFrameRule,
  DocumentFrameSummary
} from "../../../components/workspace/document-frame";
import { PlateMarkdownDocument } from "../../../components/editor/plate-markdown-document";
import {
  WorkspaceEmptyState,
  WorkspaceEmptyStateActions,
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
import { FormTextAreaField, FormTextField } from "../../../shared/forms/form-field";
import { AssistantChatSurface } from "../../conversations/assistant-chat-surface";
import type { RunPlanningPhaseViewModel } from "../use-run-view-model";

function PlanningConversationPanel({
  phaseSummary,
  phaseTitle,
  conversationLocator
}: Pick<RunPlanningPhaseViewModel, "phaseSummary" | "phaseTitle" | "conversationLocator">) {
  return (
    <WorkspacePanel>
      <WorkspacePanelHeader>
        <WorkspacePanelHeading>
          <WorkspacePanelTitle>{phaseTitle}</WorkspacePanelTitle>
        </WorkspacePanelHeading>
        <WorkspacePanelSummary>{phaseSummary}</WorkspacePanelSummary>
      </WorkspacePanelHeader>

      <AssistantChatSurface
        composerPlaceholder="Continue the planning conversation with Keystone."
        emptyMessage="This document already has a persisted Cloudflare conversation. Send the next planning turn here."
        emptyTitle="Planning conversation ready"
        locator={conversationLocator}
        unavailableMessage="Create or attach a planning conversation before sending messages from this document."
        unavailableTitle="No planning conversation attached"
      />
    </WorkspacePanel>
  );
}

function PlanningDocumentPanel(props: RunPlanningPhaseViewModel) {
  return (
    <WorkspacePanel className="workspace-panel-document">
      <WorkspacePanelHeader>
        <WorkspacePanelHeading>
          <WorkspacePanelTitle>{props.panelTitle}</WorkspacePanelTitle>
        </WorkspacePanelHeading>
      </WorkspacePanelHeader>

      <DocumentFrame>
        <DocumentFramePath>{props.documentPath}</DocumentFramePath>
        <DocumentFrameRule />

        {props.state === "ready" ? (
          <>
            <DocumentFrameBody>
              <PlateMarkdownDocument
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
            <DocumentFrameSummary>{props.helperMessage}</DocumentFrameSummary>
            {props.submitErrorMessage ? (
              <p className="form-field-error">{props.submitErrorMessage}</p>
            ) : null}
            <div className="planning-document-editor">
              <div className="planning-document-editor-fields">
                <FormTextField
                  label={props.titleField.label}
                  value={props.titleField.value}
                  onChange={(event) => props.titleField.onChange(event.currentTarget.value)}
                  disabled={props.isSubmitting}
                />
                <FormTextAreaField
                  label={props.bodyField.label}
                  value={props.bodyField.value}
                  onChange={(event) => props.bodyField.onChange(event.currentTarget.value)}
                  disabled={props.isSubmitting}
                />
              </div>

              <section className="planning-document-preview">
                <div className="planning-document-preview-header">
                  <p className="document-name">Live preview</p>
                  <p className="planning-document-preview-summary">
                    Plate renders the current markdown source while markdown remains the canonical document format.
                  </p>
                </div>
                <DocumentFrameRule />
                <PlateMarkdownDocument
                  label="Document preview"
                  markdown={props.bodyField.value}
                  emptyMessage="Start writing markdown to preview this document."
                />
              </section>
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

export function PlanningWorkspaceFrame(props: RunPlanningPhaseViewModel) {
  return (
    <WorkspaceSplit className="planning-workspace-split">
      <WorkspaceSplitPane>
        <PlanningConversationPanel
          phaseTitle={props.phaseTitle}
          phaseSummary={props.phaseSummary}
          conversationLocator={props.conversationLocator}
        />
      </WorkspaceSplitPane>

      <WorkspaceSplitPane>
        <PlanningDocumentPanel {...props} />
      </WorkspaceSplitPane>
    </WorkspaceSplit>
  );
}
