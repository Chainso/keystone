import type { ComponentType } from "react";

import type { ProjectConfigurationTabId } from "../project-configuration-scaffold";
import {
  useNewProjectComponentsViewModel,
  useNewProjectEnvironmentViewModel,
  useNewProjectOverviewViewModel,
  useNewProjectRulesViewModel,
  useProjectSettingsEnvironmentViewModel,
  useProjectSettingsComponentsViewModel,
  useProjectSettingsOverviewViewModel,
  useProjectSettingsRulesViewModel
} from "../use-project-configuration-view-model";
import { ComponentTypePicker } from "../../../shared/forms/component-type-picker";
import { FormTextAreaField, FormTextField } from "../../../shared/forms/form-field";
import { TextListField } from "../../../shared/forms/text-list-field";
import {
  EditableProjectComponentCard,
  ReadonlyProjectComponentCard
} from "./project-component-card";
import {
  ProjectConfigurationActions,
  ProjectConfigurationSection
} from "./project-configuration-section";

function ProjectConfigurationError({
  message
}: {
  message: string | null | undefined;
}) {
  if (!message) {
    return null;
  }

  return <p className="project-config-error">{message}</p>;
}

function NewProjectOverviewTab() {
  const model = useNewProjectOverviewViewModel();

  return (
    <ProjectConfigurationSection title={model.heading}>
      <ProjectConfigurationError message={model.submitError} />

      <div className="project-form-grid">
        <FormTextField
          label={model.nameField.label}
          value={model.nameField.value}
          onChange={(event) => model.nameField.onChange?.(event.currentTarget.value)}
          errorMessage={model.nameField.errorMessage}
        />
        <FormTextField
          label={model.keyField.label}
          value={model.keyField.value}
          onChange={(event) => model.keyField.onChange?.(event.currentTarget.value)}
          errorMessage={model.keyField.errorMessage}
        />
        <FormTextAreaField
          label={model.descriptionField.label}
          value={model.descriptionField.value}
          onChange={(event) => model.descriptionField.onChange?.(event.currentTarget.value)}
          errorMessage={model.descriptionField.errorMessage}
        />
      </div>

      <ProjectConfigurationActions actions={model.footerActions} />
    </ProjectConfigurationSection>
  );
}

function ProjectSettingsOverviewTab() {
  const model = useProjectSettingsOverviewViewModel();

  return (
    <ProjectConfigurationSection title={model.heading}>
      <div className="project-form-grid">
        <FormTextField label={model.nameField.label} value={model.nameField.value} readOnly />
        <FormTextField label={model.keyField.label} value={model.keyField.value} readOnly />
        <FormTextAreaField
          label={model.descriptionField.label}
          value={model.descriptionField.value}
          readOnly
        />
      </div>

      <ProjectConfigurationActions actions={model.footerActions} />
    </ProjectConfigurationSection>
  );
}

function NewProjectComponentsTab() {
  const model = useNewProjectComponentsViewModel();

  return (
    <ProjectConfigurationSection title={model.heading}>
      <ProjectConfigurationError message={model.submitError} />

      <div className="project-config-section-actions">
        <button
          type="button"
          className="ghost-button"
          aria-expanded={model.typePickerOpen}
          onClick={model.toggleTypePicker}
        >
          <span>+ Add component{" "}</span>
          <span aria-hidden="true">▾</span>
        </button>
      </div>

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
          {model.emptyError ? <ProjectConfigurationError message={model.emptyError} /> : null}
        </section>
      ) : (
        <div className="component-card-stack">
          {model.components.map((component) => (
            <EditableProjectComponentCard key={component.componentId} component={component} />
          ))}
        </div>
      )}

      <ProjectConfigurationActions actions={model.footerActions} />
    </ProjectConfigurationSection>
  );
}

function ProjectSettingsComponentsTab() {
  const model = useProjectSettingsComponentsViewModel();

  return (
    <ProjectConfigurationSection title={model.heading}>
      <div className="project-config-section-actions">
        <button
          type="button"
          className="ghost-button"
          aria-expanded={model.typePickerOpen}
          onClick={model.toggleTypePicker}
        >
          <span>+ Add component{" "}</span>
          <span aria-hidden="true">▾</span>
        </button>
      </div>

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
            <ReadonlyProjectComponentCard key={component.componentId} component={component} />
          ))}
        </div>
      )}

      <ProjectConfigurationActions actions={model.footerActions} />
    </ProjectConfigurationSection>
  );
}

function NewProjectRulesTab() {
  const model = useNewProjectRulesViewModel();

  return (
    <ProjectConfigurationSection title={model.heading}>
      <ProjectConfigurationError message={model.submitError} />

      <div className="project-rule-grid">
        <TextListField
          label={model.reviewInstructions.label}
          items={model.reviewInstructions.items}
          addLabel={model.reviewInstructions.addLabel}
          onAdd={model.reviewInstructions.onAdd}
          onChange={model.reviewInstructions.onChange}
          onRemove={model.reviewInstructions.onRemove}
          rowErrors={model.reviewInstructions.rowErrors}
          emptyMessage="No project review instructions added."
        />
        <TextListField
          label={model.testInstructions.label}
          items={model.testInstructions.items}
          addLabel={model.testInstructions.addLabel}
          onAdd={model.testInstructions.onAdd}
          onChange={model.testInstructions.onChange}
          onRemove={model.testInstructions.onRemove}
          rowErrors={model.testInstructions.rowErrors}
          emptyMessage="No project test instructions added."
        />
      </div>

      {model.footerActions ? <ProjectConfigurationActions actions={model.footerActions} /> : null}
    </ProjectConfigurationSection>
  );
}

function ProjectSettingsRulesTab() {
  const model = useProjectSettingsRulesViewModel();

  return (
    <ProjectConfigurationSection title={model.heading}>
      <div className="project-rule-grid">
        <TextListField label={model.reviewInstructions.label} items={model.reviewInstructions.items} readOnly />
        <TextListField label={model.testInstructions.label} items={model.testInstructions.items} readOnly />
      </div>
    </ProjectConfigurationSection>
  );
}

function NewProjectEnvironmentTab() {
  const model = useNewProjectEnvironmentViewModel();

  return (
    <ProjectConfigurationSection title={model.heading}>
      <ProjectConfigurationError message={model.submitError} />

      {model.envVars.length === 0 ? (
        <section className="empty-state-card">
          <p className="document-line">{model.emptyMessage}</p>
        </section>
      ) : (
        <div className="project-environment-stack">
          {model.envVars.map((envVar) => (
            <article key={envVar.entryId} className="environment-var-card">
              <div className="environment-var-heading">
                <h3 className="page-section-title">Environment variable</h3>
                <button type="button" className="ghost-button" onClick={envVar.onRemove}>
                  Remove
                </button>
              </div>

              <div className="project-form-grid">
                <FormTextField
                  label={envVar.nameField.label}
                  value={envVar.nameField.value}
                  onChange={(event) => envVar.nameField.onChange?.(event.currentTarget.value)}
                  errorMessage={envVar.nameField.errorMessage}
                />
                <FormTextField
                  label={envVar.valueField.label}
                  value={envVar.valueField.value}
                  onChange={(event) => envVar.valueField.onChange?.(event.currentTarget.value)}
                  errorMessage={envVar.valueField.errorMessage}
                />
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="project-config-section-actions">
        <button type="button" className="ghost-button" onClick={model.addEnvVar}>
          + Add environment variable
        </button>
      </div>

      <ProjectConfigurationActions actions={model.footerActions} />
    </ProjectConfigurationSection>
  );
}

function ProjectSettingsEnvironmentTab() {
  const model = useProjectSettingsEnvironmentViewModel();

  return (
    <ProjectConfigurationSection title={model.heading}>
      <div className="project-environment-stack">
        {model.envVars.map((envVar) => (
          <FormTextField key={envVar.name} label={envVar.name} value={envVar.value} readOnly />
        ))}
      </div>
    </ProjectConfigurationSection>
  );
}

const newProjectTabComponents: Record<ProjectConfigurationTabId, ComponentType> = {
  overview: NewProjectOverviewTab,
  components: NewProjectComponentsTab,
  rules: NewProjectRulesTab,
  environment: NewProjectEnvironmentTab
};

const projectSettingsTabComponents: Record<ProjectConfigurationTabId, ComponentType> = {
  overview: ProjectSettingsOverviewTab,
  components: ProjectSettingsComponentsTab,
  rules: ProjectSettingsRulesTab,
  environment: ProjectSettingsEnvironmentTab
};

export function NewProjectConfigurationTabContent({
  tabId
}: {
  tabId: ProjectConfigurationTabId;
}) {
  const TabComponent = newProjectTabComponents[tabId];

  return <TabComponent />;
}

export function ProjectSettingsConfigurationTabContent({
  tabId
}: {
  tabId: ProjectConfigurationTabId;
}) {
  const TabComponent = projectSettingsTabComponents[tabId];

  return <TabComponent />;
}
