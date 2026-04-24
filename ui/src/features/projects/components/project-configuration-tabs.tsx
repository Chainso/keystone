import type { ComponentType, ReactNode } from "react";

import type { ProjectConfigurationTabId } from "../project-configuration-scaffold";
import {
  useProjectConfigurationComponentsViewModel,
  useProjectConfigurationEnvironmentViewModel,
  useProjectConfigurationOverviewViewModel,
  useProjectConfigurationRulesViewModel
} from "../use-project-configuration-view-model";
import { Button } from "../../../components/ui/button";
import { FormTextAreaField, FormTextField } from "../../../shared/forms/form-field";
import { TextListField } from "../../../shared/forms/text-list-field";
import {
  WorkspaceEmptyState,
  WorkspaceEmptyStateDescription,
  WorkspaceEmptyStateTitle
} from "../../../components/workspace/workspace-empty-state";
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
            description="Stable slug used in URLs and project API requests."
            mono
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
    <ProjectConfigurationSection
      title={model.heading}
      actions={
        <Button
          type="button"
          variant="outline"
          disabled={model.isSubmitting}
          aria-expanded={model.typePickerOpen}
          onClick={model.toggleTypePicker}
        >
          + Add component
        </Button>
      }
    >
      <ProjectConfigurationFormFrame disabled={model.isSubmitting}>
        <ProjectConfigurationError message={model.submitError} />

        {model.typePickerOpen ? (
          <ProjectComponentTypePicker
            title={model.typePickerTitle}
            options={model.typeOptions}
            onSelect={model.pickComponentType}
          />
        ) : null}

        {model.components.length === 0 ? (
          <WorkspaceEmptyState>
            <WorkspaceEmptyStateTitle as="h3">No components added yet</WorkspaceEmptyStateTitle>
            <WorkspaceEmptyStateDescription>{model.emptyState}</WorkspaceEmptyStateDescription>
            {model.emptyError ? <ProjectConfigurationError message={model.emptyError} /> : null}
          </WorkspaceEmptyState>
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
    <ProjectConfigurationSection
      title={model.heading}
      actions={
        <Button
          type="button"
          variant="outline"
          disabled={model.isSubmitting}
          onClick={model.addEnvVar}
        >
          + Add environment variable
        </Button>
      }
    >
      <ProjectConfigurationFormFrame disabled={model.isSubmitting}>
        <ProjectConfigurationError message={model.submitError} />

        {model.envVars.length === 0 ? (
          <WorkspaceEmptyState>
            <WorkspaceEmptyStateTitle as="h3">No environment variables yet</WorkspaceEmptyStateTitle>
            <WorkspaceEmptyStateDescription>{model.emptyMessage}</WorkspaceEmptyStateDescription>
          </WorkspaceEmptyState>
        ) : (
          <div className="project-environment-stack">
            {model.envVars.map((envVar, index) => (
              <article key={envVar.entryId} className="environment-var-card">
                <div className="environment-var-heading">
                  <div className="environment-var-copy">
                    <h3 className="page-section-title">Environment variable {index + 1}</h3>
                    <p className="workspace-panel-summary">
                      Non-secret configuration saved with the project.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={envVar.onRemove}>
                    Remove
                  </Button>
                </div>

                <div className="project-form-grid">
                  <FormTextField
                    label={envVar.nameField.label}
                    mono
                    value={envVar.nameField.value}
                    onChange={(event) => envVar.nameField.onChange?.(event.currentTarget.value)}
                    errorMessage={envVar.nameField.errorMessage}
                  />
                  <FormTextField
                    label={envVar.valueField.label}
                    description="Non-secret value."
                    mono
                    value={envVar.valueField.value}
                    onChange={(event) => envVar.valueField.onChange?.(event.currentTarget.value)}
                    errorMessage={envVar.valueField.errorMessage}
                  />
                </div>
              </article>
            ))}
          </div>
        )}

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
