import { useDocumentationViewModel } from "../../features/documentation/use-documentation-view-model";

export function DocumentationRoute() {
  const model = useDocumentationViewModel();

  return (
    <div className="page-stage">
      <header className="page-hero">
        <div>
          <span className="page-badge">Phase 3 scaffold</span>
          <p className="page-eyebrow">Documentation destination</p>
          <h1 className="page-title">{model.title}</h1>
          <p className="page-summary">{model.summary}</p>
        </div>
        <aside className="hero-aside">
          <p className="hero-aside-title">Placeholder honesty</p>
          <p className="hero-aside-copy">{model.stubNote}</p>
        </aside>
      </header>

      <div className="workspace-split documentation-grid">
        <section className="workspace-panel documentation-tree-panel">
          <header className="workspace-panel-header">
            <div>
              <p className="workspace-panel-eyebrow">Document tree</p>
              <h2 className="workspace-panel-title">Project knowledge</h2>
            </div>
            <p className="workspace-panel-summary">Living project documents and notes</p>
          </header>

          <p className="page-section-copy documentation-tree-note">{model.stubNote}</p>

          <div className="documentation-tree" role="tree" aria-label="Documentation tree">
            {model.groups.map((group) => (
              <section key={group.groupId} className="documentation-tree-group">
                <div className="documentation-tree-group-header">
                  <p className="documentation-tree-group-title">{group.label}</p>
                  <p className="documentation-tree-group-summary">{group.summary}</p>
                </div>

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
                      aria-pressed={document.isSelected}
                      onClick={() => model.selectDocument(document.documentId)}
                    >
                      <span className="documentation-tree-item-label">{document.label}</span>
                      <span className="documentation-tree-item-summary">{document.summary}</span>
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
              <p className="workspace-panel-eyebrow">Document viewer</p>
              <h2 className="workspace-panel-title">{model.selectedDocument.viewerTitle}</h2>
            </div>
            <p className="workspace-panel-summary">{model.selectedDocument.label}</p>
          </header>

          <div className="document-card">
            <p className="document-card-summary">{model.selectedDocument.viewerSummary}</p>

            <div className="document-section">
              <p className="document-section-label">Current state</p>
              <ul className="page-list compact-list">
                {model.selectedDocument.currentState.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="document-section">
              <p className="document-section-label">Backend coverage</p>
              <ul className="page-list compact-list">
                {model.selectedDocument.backendCoverage.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="document-section">
              <p className="document-section-label">Deferred work</p>
              <ul className="page-list compact-list">
                {model.selectedDocument.deferredWork.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
