import type { ComponentType } from "react";

import type { ProjectConfigurationTabId } from "../project-configuration-scaffold";
import {
  useNewProjectComponentsViewModel,
  useNewProjectOverviewViewModel,
  useProjectEnvironmentViewModel,
  useProjectRulesViewModel,
  useProjectSettingsComponentsViewModel,
  useProjectSettingsOverviewViewModel
} from "../use-project-configuration-view-model";
import { ComponentTypePicker } from "../../../shared/forms/component-type-picker";
import {
  PlaceholderTextAreaField,
  PlaceholderTextField
} from "../../../shared/forms/placeholder-field";
import { PlaceholderListField } from "../../../shared/forms/placeholder-list-field";
import { ProjectComponentCard } from "./project-component-card";
import {
  ProjectConfigurationActions,
  ProjectConfigurationSection
} from "./project-configuration-section";

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
            <ProjectComponentCard key={component.componentId} component={component} />
          ))}
        </div>
      )}

      <ProjectConfigurationActions actions={model.footerActions} />
    </ProjectConfigurationSection>
  );
}

function ProjectRulesTab() {
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

function ProjectEnvironmentTab() {
  const model = useProjectEnvironmentViewModel();

  return (
    <ProjectConfigurationSection title={model.heading}>
      <div className="project-environment-stack">
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

const newProjectTabComponents: Record<ProjectConfigurationTabId, ComponentType> = {
  overview: NewProjectOverviewTab,
  components: NewProjectComponentsTab,
  rules: ProjectRulesTab,
  environment: ProjectEnvironmentTab
};

const projectSettingsTabComponents: Record<ProjectConfigurationTabId, ComponentType> = {
  overview: ProjectSettingsOverviewTab,
  components: ProjectSettingsComponentsTab,
  rules: ProjectRulesTab,
  environment: ProjectEnvironmentTab
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
