import type { ReactNode } from "react";

import type {
  ProjectComponentScaffold,
  ProjectConfigurationMode,
  ProjectConfigurationTabId
} from "../../features/projects/project-configuration-scaffold";
import {
  useNewProjectComponentsViewModel,
  useNewProjectOverviewViewModel,
  useProjectEnvironmentViewModel,
  useProjectRulesViewModel,
  useProjectSettingsComponentsViewModel,
  useProjectSettingsOverviewViewModel
} from "../../features/projects/use-project-configuration-view-model";
import { ComponentTypePicker } from "../../shared/forms/component-type-picker";
import {
  PlaceholderSelectField,
  PlaceholderTextAreaField,
  PlaceholderTextField
} from "../../shared/forms/placeholder-field";
import { PlaceholderListField } from "../../shared/forms/placeholder-list-field";

interface ProjectConfigurationTabRouteProps {
  mode: ProjectConfigurationMode;
  tabId: ProjectConfigurationTabId;
}

function ProjectConfigurationSection({
  actions,
  children,
  title
}: {
  actions?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="project-config-section">
      <div className="project-config-section-header">
        <div>
          <h2 className="workspace-panel-title">{title}</h2>
        </div>
        {actions}
      </div>

      {children}
    </section>
  );
}

function ProjectConfigurationActions({ actions }: { actions: string[] }) {
  return (
    <div className="project-form-actions">
      {actions.map((action) => (
        <button key={action} type="button" className="ghost-button" disabled>
          {action}
        </button>
      ))}
    </div>
  );
}

function ProjectComponentSourceModeField({
  componentId,
  sourceMode
}: Pick<ProjectComponentScaffold, "componentId" | "sourceMode">) {
  const inputName = `${componentId}-source-mode`;

  return (
    <fieldset className="placeholder-field">
      <legend className="placeholder-field-label">Source mode</legend>

      <div className="source-mode-row">
        <label>
          <input type="radio" name={inputName} defaultChecked={sourceMode === "localPath"} />
          {" "}
          Local path
        </label>

        <label>
          <input type="radio" name={inputName} defaultChecked={sourceMode === "gitUrl"} />
          {" "}
          Git URL
        </label>
      </div>
    </fieldset>
  );
}

function ProjectComponentCard({ component }: { component: ProjectComponentScaffold }) {
  return (
    <article className="component-card">
      <div className="component-card-header">
        <div>
          <h3 className="page-section-title">{component.heading}</h3>
        </div>

        <button type="button" className="ghost-button" disabled>
          Remove
        </button>
      </div>

      <div className="project-form-grid">
        <PlaceholderSelectField
          label="Type"
          options={[component.kindLabel]}
          value={component.kindLabel}
        />
        <PlaceholderTextField label="Name" value={component.displayName} />
        <PlaceholderTextField label="Key" value={component.componentKey} />
        <ProjectComponentSourceModeField
          componentId={component.componentId}
          sourceMode={component.sourceMode}
        />
        <PlaceholderTextField label="Local path" value={component.localPath} />
        <PlaceholderTextField label="Git URL" value={component.gitUrl} />
        <PlaceholderTextField label="Default ref" value={component.defaultRef} />
      </div>

      <div className="component-card-overrides">
        <PlaceholderListField label="Review" items={component.reviewInstructions} />
        <PlaceholderListField label="Test" items={component.testInstructions} />
      </div>
    </article>
  );
}

function OverviewTab({
  model
}: {
  model: ReturnType<typeof useNewProjectOverviewViewModel>;
}) {
  return (
    <ProjectConfigurationSection title={model.heading}>
      <div className="project-form-grid">
        <PlaceholderTextField label={model.nameField.label} value={model.nameField.value} />
        <PlaceholderTextField label={model.keyField.label} value={model.keyField.value} />
        <PlaceholderTextAreaField
          label={model.descriptionField.label}
          value={model.descriptionField.value}
        />
      </div>

      <ProjectConfigurationActions actions={model.footerActions} />
    </ProjectConfigurationSection>
  );
}

function ComponentsTab({
  model
}: {
  model: ReturnType<typeof useNewProjectComponentsViewModel>;
}) {
  return (
    <ProjectConfigurationSection
      title={model.heading}
      actions={
        <button
          type="button"
          className="ghost-button"
          aria-expanded={model.typePickerOpen}
          onClick={model.toggleTypePicker}
        >
          + Add component
        </button>
      }
    >
      {model.typePickerOpen ? (
        <ComponentTypePicker
          title={model.typePickerTitle}
          options={model.typeOptions}
          onSelect={model.pickComponentType}
        />
      ) : null}

      {model.components.length === 0 ? (
        <section className="empty-state-card">
          <p className="document-line">{model.emptyState}</p>
        </section>
      ) : (
        <div className="component-card-stack">
          {model.components.map((component) => (
            <ProjectComponentCard key={component.componentId} component={component} />
          ))}
        </div>
      )}

      <ProjectConfigurationActions actions={model.footerActions} />
    </ProjectConfigurationSection>
  );
}

function RulesTab() {
  const model = useProjectRulesViewModel();

  return (
    <ProjectConfigurationSection title={model.heading}>
      <div className="project-rule-grid">
        <PlaceholderListField label="Project review instructions" items={model.reviewInstructions} />
        <PlaceholderListField label="Project test instructions" items={model.testInstructions} />
      </div>
    </ProjectConfigurationSection>
  );
}

function EnvironmentTab() {
  const model = useProjectEnvironmentViewModel();

  return (
    <ProjectConfigurationSection title={model.heading}>
      <div className="component-card-stack">
        {model.envVars.map((envVar) => (
          <PlaceholderTextField key={envVar.name} label={envVar.name} value={envVar.value} />
        ))}
      </div>
    </ProjectConfigurationSection>
  );
}

function NewProjectOverviewTab() {
  return <OverviewTab model={useNewProjectOverviewViewModel()} />;
}

function NewProjectComponentsTab() {
  return <ComponentsTab model={useNewProjectComponentsViewModel()} />;
}

function ProjectSettingsOverviewTab() {
  return <OverviewTab model={useProjectSettingsOverviewViewModel()} />;
}

function ProjectSettingsComponentsTab() {
  return <ComponentsTab model={useProjectSettingsComponentsViewModel()} />;
}

function NewProjectTabRoute({ tabId }: { tabId: ProjectConfigurationTabId }) {
  if (tabId === "overview") {
    return <NewProjectOverviewTab />;
  }

  if (tabId === "components") {
    return <NewProjectComponentsTab />;
  }

  if (tabId === "rules") {
    return <RulesTab />;
  }

  return <EnvironmentTab />;
}

function ProjectSettingsTabRoute({ tabId }: { tabId: ProjectConfigurationTabId }) {
  if (tabId === "overview") {
    return <ProjectSettingsOverviewTab />;
  }

  if (tabId === "components") {
    return <ProjectSettingsComponentsTab />;
  }

  if (tabId === "rules") {
    return <RulesTab />;
  }

  return <EnvironmentTab />;
}

export function ProjectConfigurationTabRoute({
  mode,
  tabId
}: ProjectConfigurationTabRouteProps) {
  return mode === "new" ? (
    <NewProjectTabRoute tabId={tabId} />
  ) : (
    <ProjectSettingsTabRoute tabId={tabId} />
  );
}
