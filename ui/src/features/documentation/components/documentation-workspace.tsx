import { Link } from "react-router-dom";

import {
  DocumentFrame,
  DocumentFrameBody,
  DocumentFramePath,
  DocumentFrameRule,
  DocumentFrameSummary,
  DocumentFrameTitle
} from "../../../components/workspace/document-frame";
import { MarkdownDocumentViewer } from "../../../components/editor/markdown-document-surface";
import {
  WorkspaceEmptyState,
  WorkspaceEmptyStateDescription,
  WorkspaceEmptyStateTitle
} from "../../../components/workspace/workspace-empty-state";
import { WorkspacePage } from "../../../components/workspace/workspace-page";
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
      <div className="workspace-surface-header">
        <div className="workspace-surface-heading">
          <h1 className="page-title runs-page-title">{model.title}</h1>
          <p className="workspace-surface-note documentation-shell-summary">
            Project-level knowledge stays organized as Product Specifications, Technical Architecture, and Miscellaneous Notes.
          </p>
        </div>
        <div
          className="workspace-surface-actions documentation-header-meta"
          aria-label="Documentation metadata"
          role="group"
        >
          <span className="meta-chip">{model.documentCountLabel}</span>
        </div>
      </div>

      {model.compatibilityState || !model.selectedDocument ? (
        <section className="workspace-surface">
          <WorkspaceEmptyState>
            <WorkspaceEmptyStateTitle>
              {model.compatibilityState?.heading ?? "No documentation yet"}
            </WorkspaceEmptyStateTitle>
            <WorkspaceEmptyStateDescription>
              {model.compatibilityState?.message ?? "This project does not have any documentation yet."}
            </WorkspaceEmptyStateDescription>
          </WorkspaceEmptyState>
        </section>
      ) : (
        <WorkspaceSplit className="documentation-grid">
          <WorkspaceSplitPane>
            <section className="workspace-surface documentation-tree-panel">
              <div className="workspace-surface-section-heading">
                <h2 className="page-section-title">Documentation categories</h2>
                <p className="page-section-copy">
                  Browse the current project documents by category.
                </p>
              </div>

              <nav className="documentation-tree" aria-label="Documentation categories">
                {model.groups.map((group) => (
                  <section key={group.groupId} className="documentation-tree-group">
                    <div className="documentation-tree-group-header">
                      <h3 className="documentation-tree-group-title">{group.label}</h3>
                      <p className="documentation-tree-group-summary">{group.summary}</p>
                    </div>

                    <div className="documentation-tree-items">
                      {group.documents.map((document, index) => (
                        <Link
                          key={document.documentId}
                          to={document.href}
                          className={
                            document.isSelected
                              ? "documentation-tree-item is-active"
                              : "documentation-tree-item"
                          }
                          aria-label={`${document.label} ${document.path}`}
                          aria-current={document.isSelected ? "page" : undefined}
                        >
                          <span className="documentation-tree-item-branch" aria-hidden="true">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="documentation-tree-item-copy">
                            <span className="documentation-tree-item-label">{document.label}</span>
                            <span className="documentation-tree-item-path">{document.path}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
              </nav>
            </section>
          </WorkspaceSplitPane>

          <WorkspaceSplitPane>
            <section className="workspace-surface workspace-panel-document">
              <div className="workspace-surface-section-heading">
                <h2 className="page-section-title">Current document</h2>
                <p className="page-section-copy">
                  Read the current project document selected from the category list.
                </p>
              </div>

              <DocumentFrame>
                <DocumentFramePath>{model.selectedDocument.path}</DocumentFramePath>
                <DocumentFrameTitle>{model.selectedDocument.title}</DocumentFrameTitle>
                {selectedDocumentSummary ? (
                  <DocumentFrameSummary>{selectedDocumentSummary}</DocumentFrameSummary>
                ) : null}
                <DocumentFrameRule />

                <DocumentFrameBody>
                  <MarkdownDocumentViewer
                    label="Documentation document"
                    markdown={model.selectedDocument.markdown}
                  />
                </DocumentFrameBody>
              </DocumentFrame>
            </section>
          </WorkspaceSplitPane>
        </WorkspaceSplit>
      )}
    </WorkspacePage>
  );
}
