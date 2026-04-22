import {
  DocumentFrame,
  DocumentFrameBody,
  DocumentFramePath,
  DocumentFrameRule,
  DocumentFrameSummary,
  DocumentFrameTitle
} from "../../../components/workspace/document-frame";
import { PlateMarkdownDocument } from "../../../components/editor/plate-markdown-document";
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
import type { DocumentationViewModel } from "../use-documentation-view-model";

interface DocumentationWorkspaceProps {
  model: DocumentationViewModel;
}

function normalizeDocumentLabel(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function DocumentationWorkspace({ model }: DocumentationWorkspaceProps) {
  const selectedDocumentSummary =
    model.selectedDocument &&
    normalizeDocumentLabel(model.selectedDocument.viewerTitle) !==
      normalizeDocumentLabel(model.selectedDocument.title)
      ? model.selectedDocument.viewerTitle
      : null;

  return (
    <WorkspacePage>
      <WorkspacePageHeader>
        <WorkspacePageHeading>
          <p className="page-eyebrow">Documentation</p>
          <h1 className="page-title runs-page-title">{model.title}</h1>
          <p className="page-summary documentation-shell-summary">
            Current project knowledge stays project-scoped and renders through the shared document surface.
          </p>
        </WorkspacePageHeading>
        <WorkspacePageActions
          className="documentation-header-meta"
          aria-label="Documentation metadata"
          role="group"
        >
          <span className="meta-chip">{model.currentProjectLabel}</span>
          <span className="meta-chip">{model.documentCountLabel}</span>
        </WorkspacePageActions>
      </WorkspacePageHeader>

      {model.compatibilityState || !model.selectedDocument ? (
        <WorkspacePanel>
          <WorkspaceEmptyState>
            <WorkspaceEmptyStateTitle>
              {model.compatibilityState?.heading ?? "No documentation yet"}
            </WorkspaceEmptyStateTitle>
            <WorkspaceEmptyStateDescription>
              {model.compatibilityState?.message ?? "This project does not have any documentation yet."}
            </WorkspaceEmptyStateDescription>
          </WorkspaceEmptyState>
        </WorkspacePanel>
      ) : (
        <WorkspaceSplit className="documentation-grid">
          <WorkspaceSplitPane>
            <WorkspacePanel className="documentation-tree-panel">
              <WorkspacePanelHeader>
                <WorkspacePanelHeading>
                  <WorkspacePanelTitle>Documentation categories</WorkspacePanelTitle>
                  <WorkspacePanelSummary>
                    Scaffold-backed documents stay grouped by category while the live project documentation API remains out of scope.
                  </WorkspacePanelSummary>
                </WorkspacePanelHeading>
              </WorkspacePanelHeader>

              <nav className="documentation-tree" aria-label="Documentation categories">
                {model.groups.map((group) => (
                  <section key={group.groupId} className="documentation-tree-group">
                    <div className="documentation-tree-group-header">
                      <h3 className="documentation-tree-group-title">{group.label}</h3>
                      <p className="documentation-tree-group-summary">{group.summary}</p>
                    </div>

                    <div className="documentation-tree-items">
                      {group.documents.map((document, index) => (
                        <button
                          key={document.documentId}
                          type="button"
                          className={
                            document.isSelected
                              ? "documentation-tree-item is-active"
                              : "documentation-tree-item"
                          }
                          aria-label={`${document.label} ${document.path}`}
                          aria-pressed={document.isSelected}
                          onClick={() => model.selectDocument(document.documentId)}
                        >
                          <span className="documentation-tree-item-branch" aria-hidden="true">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="documentation-tree-item-copy">
                            <span className="documentation-tree-item-label">{document.label}</span>
                            <span className="documentation-tree-item-path">{document.path}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </nav>
            </WorkspacePanel>
          </WorkspaceSplitPane>

          <WorkspaceSplitPane>
            <WorkspacePanel className="workspace-panel-document">
              <WorkspacePanelHeader>
                <WorkspacePanelHeading>
                  <WorkspacePanelTitle>Current document</WorkspacePanelTitle>
                  <WorkspacePanelSummary>
                    Markdown remains scaffold-backed truth until project-level document APIs are live.
                  </WorkspacePanelSummary>
                </WorkspacePanelHeading>
              </WorkspacePanelHeader>

              <DocumentFrame>
                <DocumentFramePath>{model.selectedDocument.path}</DocumentFramePath>
                <DocumentFrameTitle>{model.selectedDocument.title}</DocumentFrameTitle>
                {selectedDocumentSummary ? (
                  <DocumentFrameSummary>{selectedDocumentSummary}</DocumentFrameSummary>
                ) : null}
                <DocumentFrameRule />

                <DocumentFrameBody>
                  <PlateMarkdownDocument
                    label="Documentation document"
                    markdown={model.selectedDocument.markdown}
                  />
                </DocumentFrameBody>
              </DocumentFrame>
            </WorkspacePanel>
          </WorkspaceSplitPane>
        </WorkspaceSplit>
      )}
    </WorkspacePage>
  );
}
