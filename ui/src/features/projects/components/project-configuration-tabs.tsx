import type { ComponentType, ReactNode } from "react";

import type { ProjectConfigurationTabId } from "../project-configuration-scaffold";
import {
  useProjectConfigurationComponentsViewModel,
  useProjectConfigurationEnvironmentViewModel,
  useProjectConfigurationOverviewViewModel,
  useProjectConfigurationRulesViewModel
} from "../use-project-configuration-view-model";
import { FormTextAreaField, FormTextField } from "../../../shared/forms/form-field";
import { TextListField } from "../../../shared/forms/text-list-field";
import { EditableProjectComponentCard } from "./project-component-card";
import { ProjectComponentTypePicker } from "./project-component-type-picker";
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

function ProjectConfigurationFormFrame({
  children,
  disabled
}: {
  children: ReactNode;
  disabled: boolean;
}) {
  if (!disabled) {
    return <>{children}</>;
  }

  return (
    <fieldset className="project-config-form-frame" disabled>
      {children}
    </fieldset>
  );
}

function ProjectConfigurationOverviewTab() {
  const model = useProjectConfigurationOverviewViewModel();

  return (
    <ProjectConfigurationSection title={model.heading}>
      <ProjectConfigurationFormFrame disabled={model.isSubmitting}>
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
      </ProjectConfigurationFormFrame>
    </ProjectConfigurationSection>
  );
}

function ProjectConfigurationComponentsTab() {
  const model = useProjectConfigurationComponentsViewModel();

  return (
    <ProjectConfigurationSection title={model.heading}>
      <ProjectConfigurationFormFrame disabled={model.isSubmitting}>
        <ProjectConfigurationError message={model.submitError} />

        <div className="project-config-section-actions">
          <button
            type="button"
            className="ghost-button"
            aria-expanded={model.typePickerOpen}
            onClick={model.toggleTypePicker}
          >
            <span>+ Add component </span>
            <span aria-hidden="true">▾</span>
          </button>
        </div>

        {model.typePickerOpen ? (
          <ProjectComponentTypePicker
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
      </ProjectConfigurationFormFrame>
    </ProjectConfigurationSection>
  );
}

function ProjectConfigurationRulesTab() {
  const model = useProjectConfigurationRulesViewModel();

  return (
    <ProjectConfigurationSection title={model.heading}>
      <ProjectConfigurationFormFrame disabled={model.isSubmitting}>
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

        <ProjectConfigurationActions actions={model.footerActions} />
      </ProjectConfigurationFormFrame>
    </ProjectConfigurationSection>
  );
}

function ProjectConfigurationEnvironmentTab() {
  const model = useProjectConfigurationEnvironmentViewModel();

  return (
    <ProjectConfigurationSection title={model.heading}>
      <ProjectConfigurationFormFrame disabled={model.isSubmitting}>
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
      </ProjectConfigurationFormFrame>
    </ProjectConfigurationSection>
  );
}

const projectConfigurationTabComponents: Record<
  ProjectConfigurationTabId,
  ComponentType
> = {
  components: ProjectConfigurationComponentsTab,
  environment: ProjectConfigurationEnvironmentTab,
  overview: ProjectConfigurationOverviewTab,
  rules: ProjectConfigurationRulesTab
};

export function ProjectConfigurationTabContent({
  tabId
}: {
  tabId: ProjectConfigurationTabId;
}) {
  const TabComponent = projectConfigurationTabComponents[tabId];

  return <TabComponent />;
}

export function NewProjectConfigurationTabContent({
  tabId
}: {
  tabId: ProjectConfigurationTabId;
}) {
  return <ProjectConfigurationTabContent tabId={tabId} />;
}

export function ProjectSettingsConfigurationTabContent({
  tabId
}: {
  tabId: ProjectConfigurationTabId;
}) {
  return <ProjectConfigurationTabContent tabId={tabId} />;
}
