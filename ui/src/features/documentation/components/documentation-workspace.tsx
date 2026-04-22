import {
  DocumentFrame,
  DocumentFrameBody,
  DocumentFrameRule,
  DocumentFrameSummary,
  DocumentFrameTitle
} from "../../../components/workspace/document-frame";
import {
  WorkspaceEmptyState,
  WorkspaceEmptyStateDescription,
  WorkspaceEmptyStateTitle
} from "../../../components/workspace/workspace-empty-state";
import {
  WorkspacePage
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
import type { DocumentationViewModel } from "../use-documentation-view-model";

interface DocumentationWorkspaceProps {
  model: DocumentationViewModel;
}

export function DocumentationWorkspace({ model }: DocumentationWorkspaceProps) {
  return (
    <WorkspacePage>
      <WorkspacePanel>
        <h1 className="page-title runs-page-title">{model.title}</h1>

        {model.compatibilityState || !model.selectedDocument ? (
          <WorkspaceEmptyState>
            <WorkspaceEmptyStateTitle>
              {model.compatibilityState?.heading ?? "No documentation yet"}
            </WorkspaceEmptyStateTitle>
            <WorkspaceEmptyStateDescription>
              {model.compatibilityState?.message ?? "This project does not have any documentation yet."}
            </WorkspaceEmptyStateDescription>
          </WorkspaceEmptyState>
        ) : (
          <WorkspaceSplit className="documentation-grid">
            <WorkspaceSplitPane>
              <WorkspacePanel className="documentation-tree-panel">
                <WorkspacePanelHeader>
                  <WorkspacePanelHeading>
                    <WorkspacePanelTitle>Doc tree</WorkspacePanelTitle>
                  </WorkspacePanelHeading>
                </WorkspacePanelHeader>

                <div className="documentation-tree" aria-label="Documentation tree">
                  {model.groups.map((group) => (
                    <section key={group.groupId} className="documentation-tree-group">
                      <h3 className="documentation-tree-group-title">{group.label}</h3>

                      <div className="documentation-tree-items">
                        {group.documents.map((document) => (
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
                            <span className="documentation-tree-item-label">{document.label}</span>
                            <span className="documentation-tree-item-path">{document.path}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </WorkspacePanel>
            </WorkspaceSplitPane>

            <WorkspaceSplitPane>
              <WorkspacePanel className="workspace-panel-document">
                <WorkspacePanelHeader>
                  <WorkspacePanelHeading>
                    <WorkspacePanelTitle>Document viewer</WorkspacePanelTitle>
                  </WorkspacePanelHeading>
                </WorkspacePanelHeader>

                <DocumentFrame>
                  <DocumentFrameTitle>{model.selectedDocument.viewerTitle}</DocumentFrameTitle>
                  <DocumentFrameSummary className="document-viewer-path">
                    {model.selectedDocument.path}
                  </DocumentFrameSummary>
                  <DocumentFrameRule />

                  <DocumentFrameBody>
                    {model.selectedDocument.contentLines.map((line, index) => (
                      <p
                        key={`${model.selectedDocument?.documentId ?? "document"}:${index}`}
                        className="document-line"
                      >
                        {line}
                      </p>
                    ))}
                  </DocumentFrameBody>
                </DocumentFrame>
              </WorkspacePanel>
            </WorkspaceSplitPane>
          </WorkspaceSplit>
        )}
      </WorkspacePanel>
    </WorkspacePage>
  );
}
