import type { DocumentationViewModel } from "../use-documentation-view-model";

interface DocumentationWorkspaceProps {
  model: DocumentationViewModel;
}

export function DocumentationWorkspace({ model }: DocumentationWorkspaceProps) {
  return (
    <div className="page-stage">
      <section className="workspace-panel">
        <h1 className="page-title runs-page-title">{model.title}</h1>

        {model.compatibilityState || !model.selectedDocument ? (
          <section className="empty-state-card">
            <h2 className="document-card-title">
              {model.compatibilityState?.heading ?? "No documentation yet"}
            </h2>
            <p className="document-card-summary">
              {model.compatibilityState?.message ?? "This project does not have any documentation yet."}
            </p>
          </section>
        ) : (
          <div className="workspace-split documentation-grid">
            <section className="workspace-panel documentation-tree-panel">
              <header className="workspace-panel-header">
                <div>
                  <h2 className="workspace-panel-title">Doc tree</h2>
                </div>
              </header>

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
            </section>

            <section className="workspace-panel workspace-panel-document">
              <header className="workspace-panel-header">
                <div>
                  <h2 className="workspace-panel-title">Document viewer</h2>
                </div>
              </header>

              <div className="document-card">
                <h3 className="document-viewer-title">{model.selectedDocument.viewerTitle}</h3>
                <p className="document-viewer-path">{model.selectedDocument.path}</p>
                <div className="document-rule" aria-hidden="true" />

                <div className="document-copy">
                  {model.selectedDocument.contentLines.map((line) => (
                    <p key={line} className="document-line">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
