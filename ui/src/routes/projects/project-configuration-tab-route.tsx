import type {
  ProjectConfigurationMode,
  ProjectConfigurationTabId
} from "../../features/projects/project-configuration-scaffold";
import {
  useProjectComponentsViewModel,
  useProjectEnvironmentViewModel,
  useProjectOverviewViewModel,
  useProjectRulesViewModel
} from "../../features/projects/use-project-configuration-view-model";
import { ComponentTypePicker } from "../../shared/forms/component-type-picker";
import {
  PlaceholderTextAreaField,
  PlaceholderTextField
} from "../../shared/forms/placeholder-field";
import { PlaceholderListField } from "../../shared/forms/placeholder-list-field";

interface ProjectConfigurationTabRouteProps {
  mode: ProjectConfigurationMode;
  tabId: ProjectConfigurationTabId;
}

function OverviewTab({ mode }: { mode: ProjectConfigurationMode }) {
  const model = useProjectOverviewViewModel(mode);

  return (
    <div className="project-config-section">
      <div className="project-config-section-header">
        <div>
          <p className="workspace-panel-eyebrow">Overview</p>
          <h2 className="workspace-panel-title">{model.heading}</h2>
        </div>
        <p className="workspace-panel-summary">{model.summary}</p>
      </div>

      <div className="project-form-grid">
        <PlaceholderTextField label={model.nameField.label} value={model.nameField.value} />
        <PlaceholderTextField label={model.keyField.label} value={model.keyField.value} />
        <PlaceholderTextAreaField
          label={model.descriptionField.label}
          value={model.descriptionField.value}
        />
      </div>

      <div className="project-form-actions">
        {model.footerActions.map((action) => (
          <button key={action} type="button" className="ghost-button" disabled>
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}

function ComponentsTab({ mode }: { mode: ProjectConfigurationMode }) {
  const model = useProjectComponentsViewModel(mode);

  return (
    <div className="project-config-section">
      <div className="project-config-section-header">
        <div>
          <p className="workspace-panel-eyebrow">Components</p>
          <h2 className="workspace-panel-title">{model.heading}</h2>
        </div>
        <div className="project-config-section-actions">
          <p className="workspace-panel-summary">{model.summary}</p>
          <button type="button" className="ghost-button" onClick={model.openTypePicker}>
            + Add component
          </button>
        </div>
      </div>

      {model.typePickerOpen ? (
        <ComponentTypePicker
          title={model.typePickerTitle}
          summary={model.typePickerSummary}
          options={model.typeOptions}
          onClose={model.closeTypePicker}
          onSelect={() => model.pickComponentType()}
        />
      ) : null}

      {model.components.length === 0 ? (
        <div className="empty-state-card">
          <p className="page-section-copy">{model.emptyState}</p>
        </div>
      ) : (
        <div className="component-card-stack">
          {model.components.map((component) => (
            <article key={component.componentId} className="component-card">
              <div className="component-card-header">
                <div>
                  <p className="workspace-panel-eyebrow">{component.statusLabel}</p>
                  <h3 className="page-section-title">{component.heading}</h3>
                </div>
                <button type="button" className="ghost-button" disabled>
                  Remove
                </button>
              </div>

              <div className="project-form-grid">
                <PlaceholderTextField label="Type" value={component.kindLabel} />
                <PlaceholderTextField label="Component name" value={component.displayName} />
                <PlaceholderTextField label="Component key" value={component.componentKey} />

                <div className="placeholder-field">
                  <span className="placeholder-field-label">Source mode</span>
                  <div className="source-mode-row">
                    <span className="source-mode-pill is-active">{component.sourceModeLabel}</span>
                    <span className="source-mode-pill">Git URL</span>
                  </div>
                </div>

                <PlaceholderTextField label="Local path" value={component.localPath} />
                <PlaceholderTextField
                  label="Git URL"
                  value={component.gitUrl || "Configure remote source later if needed."}
                />
                <PlaceholderTextField label="Default ref" value={component.defaultRef} />
              </div>

              <div className="component-card-overrides">
                <PlaceholderListField
                  label="Review instructions"
                  items={component.reviewInstructions}
                />
                <PlaceholderListField label="Test instructions" items={component.testInstructions} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function RulesTab() {
  const model = useProjectRulesViewModel();

  return (
    <div className="project-config-section">
      <div className="project-config-section-header">
        <div>
          <p className="workspace-panel-eyebrow">Rules</p>
          <h2 className="workspace-panel-title">{model.heading}</h2>
        </div>
        <p className="workspace-panel-summary">{model.summary}</p>
      </div>

      <div className="project-rule-grid">
        <PlaceholderListField label="Project review instructions" items={model.reviewInstructions} />
        <PlaceholderListField label="Project test instructions" items={model.testInstructions} />
      </div>
    </div>
  );
}

function EnvironmentTab() {
  const model = useProjectEnvironmentViewModel();

  return (
    <div className="project-config-section">
      <div className="project-config-section-header">
        <div>
          <p className="workspace-panel-eyebrow">Environment</p>
          <h2 className="workspace-panel-title">{model.heading}</h2>
        </div>
        <p className="workspace-panel-summary">{model.summary}</p>
      </div>

      <div className="project-environment-stack">
        {model.envVars.map((envVar) => (
          <article key={envVar.name} className="environment-var-card">
            <div className="environment-var-heading">
              <p className="page-section-title">{envVar.name}</p>
              <span className="meta-chip">Non-secret</span>
            </div>
            <p className="environment-var-value">{envVar.value}</p>
            <p className="table-row-note">{envVar.note}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ProjectConfigurationTabRoute({
  mode,
  tabId
}: ProjectConfigurationTabRouteProps) {
  if (tabId === "overview") {
    return <OverviewTab mode={mode} />;
  }

  if (tabId === "components") {
    return <ComponentsTab mode={mode} />;
  }

  if (tabId === "rules") {
    return <RulesTab />;
  }

  return <EnvironmentTab />;
}
