import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  getProjectComponentKindLabel,
  type ProjectComponentScaffold,
  type ProjectComponentSourceMode
} from "../project-configuration-scaffold";
import type { EditableProjectComponentViewModel } from "../use-project-configuration-view-model";
import { FormSelectField, FormTextField } from "../../../shared/forms/form-field";
import { TextListField } from "../../../shared/forms/text-list-field";

function SourceModeField({
  componentId,
  onChange,
  readOnly,
  sourceMode
}: {
  componentId: string;
  onChange?: (sourceMode: ProjectComponentSourceMode) => void;
  readOnly?: boolean;
  sourceMode: ProjectComponentSourceMode;
}) {
  const inputName = `${componentId}-source-mode`;

  return (
    <fieldset className="source-mode-field">
      <legend className="form-field-label">Source mode</legend>

      <div className="source-mode-row">
        <label
          className={
            sourceMode === "localPath" ? "source-mode-option is-active" : "source-mode-option"
          }
        >
          <input
            type="radio"
            name={inputName}
            checked={sourceMode === "localPath"}
            disabled={readOnly}
            onChange={() => onChange?.("localPath")}
          />
          <span className="source-mode-option-label">Local path</span>
          <span className="source-mode-option-copy" aria-hidden="true">
            Use a checked-out repository that already exists in the workspace.
          </span>
        </label>

        <label
          className={
            sourceMode === "gitUrl" ? "source-mode-option is-active" : "source-mode-option"
          }
        >
          <input
            type="radio"
            name={inputName}
            checked={sourceMode === "gitUrl"}
            disabled={readOnly}
            onChange={() => onChange?.("gitUrl")}
          />
          <span className="source-mode-option-label">Git URL</span>
          <span className="source-mode-option-copy" aria-hidden="true">
            Clone from a remote repository and optional default ref.
          </span>
        </label>
      </div>
    </fieldset>
  );
}

export function EditableProjectComponentCard({
  component
}: {
  component: EditableProjectComponentViewModel;
}) {
  return (
    <article className="component-card">
      <div className="component-card-header">
        <div className="component-card-copy">
          <h3 className="page-section-title">{component.heading}</h3>
        </div>
        <div className="component-card-meta">
          <Badge variant="outline">{getProjectComponentKindLabel(component.kind)}</Badge>
        </div>
      </div>

      <div className="project-form-grid">
        <FormSelectField
          label="Type"
          options={[getProjectComponentKindLabel(component.kind)]}
          value={getProjectComponentKindLabel(component.kind)}
          description="Git repository is the only supported component type."
          disabled
        />
        <FormTextField
          label={component.displayNameField.label}
          value={component.displayNameField.value}
          onChange={(event) => component.displayNameField.onChange?.(event.currentTarget.value)}
          errorMessage={component.displayNameField.errorMessage}
        />
        <FormTextField
          label={component.componentKeyField.label}
          description="Stable component key used in the configuration payload."
          mono
          value={component.componentKeyField.value}
          onChange={(event) => component.componentKeyField.onChange?.(event.currentTarget.value)}
          errorMessage={component.componentKeyField.errorMessage}
        />
        <SourceModeField
          componentId={component.componentId}
          sourceMode={component.sourceMode}
          onChange={component.setSourceMode}
        />
        <FormTextField
          label={component.localPathField.label}
          mono
          value={component.localPathField.value}
          onChange={(event) => component.localPathField.onChange?.(event.currentTarget.value)}
          errorMessage={component.localPathField.errorMessage}
          disabled={component.localPathField.disabled}
        />
        <FormTextField
          label={component.gitUrlField.label}
          mono
          value={component.gitUrlField.value}
          onChange={(event) => component.gitUrlField.onChange?.(event.currentTarget.value)}
          errorMessage={component.gitUrlField.errorMessage}
          disabled={component.gitUrlField.disabled}
        />
        <FormTextField
          label={component.defaultRefField.label}
          description="Branch, tag, or ref Keystone should prefer when it opens this repository."
          mono
          value={component.defaultRefField.value}
          onChange={(event) => component.defaultRefField.onChange?.(event.currentTarget.value)}
          errorMessage={component.defaultRefField.errorMessage}
        />
      </div>

      <div className="component-card-rule-overrides">
        <div className="component-card-subsection">
          <p className="form-field-label">Optional rule override</p>
          <p className="form-field-description">
            Add component-specific review or test instructions only when they differ from the project defaults.
          </p>
        </div>

        <div className="component-card-overrides">
          <TextListField
            label={component.reviewInstructions.label}
            items={component.reviewInstructions.items}
            onAdd={component.reviewInstructions.onAdd}
            onChange={component.reviewInstructions.onChange}
            onRemove={component.reviewInstructions.onRemove}
            addLabel={component.reviewInstructions.addLabel}
            rowErrors={component.reviewInstructions.rowErrors}
            emptyMessage="No review override instructions added."
          />
          <TextListField
            label={component.testInstructions.label}
            items={component.testInstructions.items}
            onAdd={component.testInstructions.onAdd}
            onChange={component.testInstructions.onChange}
            onRemove={component.testInstructions.onRemove}
            addLabel={component.testInstructions.addLabel}
            rowErrors={component.testInstructions.rowErrors}
            emptyMessage="No test override instructions added."
          />
        </div>
      </div>

      <div className="project-form-actions">
        <Button type="button" variant="outline" onClick={component.onRemove}>
          Remove
        </Button>
      </div>
    </article>
  );
}

export function ReadonlyProjectComponentCard({
  component
}: {
  component: ProjectComponentScaffold;
}) {
  return (
    <article className="component-card">
      <div className="component-card-header">
        <div className="component-card-copy">
          <h3 className="page-section-title">{component.heading}</h3>
          <p className="workspace-panel-summary">
            Component configuration is read-only in this scaffold preview.
          </p>
        </div>
        <div className="component-card-meta">
          <Badge variant="outline">{getProjectComponentKindLabel(component.kind)}</Badge>
        </div>
      </div>

      <div className="project-form-grid">
        <FormSelectField
          label="Type"
          options={[getProjectComponentKindLabel(component.kind)]}
          value={getProjectComponentKindLabel(component.kind)}
          disabled
        />
        <FormTextField label="Name" value={component.displayName} readOnly />
        <FormTextField label="Key" value={component.componentKey} mono readOnly />
        <SourceModeField
          componentId={component.componentId}
          sourceMode={component.sourceMode}
          readOnly
        />
        <FormTextField label="Local path" value={component.localPath} mono readOnly />
        <FormTextField label="Git URL" value={component.gitUrl} mono readOnly />
        <FormTextField label="Default ref" value={component.defaultRef} mono readOnly />
      </div>

      <div className="component-card-rule-overrides">
        <div className="component-card-subsection">
          <p className="form-field-label">Optional rule override</p>
          <p className="form-field-description">
            Component-specific guidance is shown here when present.
          </p>
        </div>

        <div className="component-card-overrides">
          <TextListField
            label="Review"
            items={component.reviewInstructions}
            readOnly
          />
          <TextListField
            label="Test"
            items={component.testInstructions}
            readOnly
          />
        </div>
      </div>

      <div className="project-form-actions">
        <Button type="button" variant="outline" disabled>
          Remove
        </Button>
      </div>
    </article>
  );
}
