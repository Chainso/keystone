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
    <fieldset className="form-field">
      <legend className="form-field-label">Source mode</legend>

      <div className="source-mode-row">
        <label>
          <input
            type="radio"
            name={inputName}
            checked={sourceMode === "localPath"}
            disabled={readOnly}
            onChange={() => onChange?.("localPath")}
          />
          {" "}
          Local path
        </label>

        <label>
          <input
            type="radio"
            name={inputName}
            checked={sourceMode === "gitUrl"}
            disabled={readOnly}
            onChange={() => onChange?.("gitUrl")}
          />
          {" "}
          Git URL
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
        <div>
          <h3 className="page-section-title">{component.heading}</h3>
        </div>
      </div>

      <div className="project-form-grid">
        <FormSelectField
          label="Type"
          options={[getProjectComponentKindLabel(component.kind)]}
          value={getProjectComponentKindLabel(component.kind)}
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
          value={component.localPathField.value}
          onChange={(event) => component.localPathField.onChange?.(event.currentTarget.value)}
          errorMessage={component.localPathField.errorMessage}
          disabled={component.localPathField.disabled}
        />
        <FormTextField
          label={component.gitUrlField.label}
          value={component.gitUrlField.value}
          onChange={(event) => component.gitUrlField.onChange?.(event.currentTarget.value)}
          errorMessage={component.gitUrlField.errorMessage}
          disabled={component.gitUrlField.disabled}
        />
        <FormTextField
          label={component.defaultRefField.label}
          value={component.defaultRefField.value}
          onChange={(event) => component.defaultRefField.onChange?.(event.currentTarget.value)}
          errorMessage={component.defaultRefField.errorMessage}
        />
      </div>

      <div className="component-card-rule-overrides">
        <p className="form-field-label">Optional rule override</p>

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
        <button type="button" className="ghost-button" onClick={component.onRemove}>
          Remove
        </button>
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
        <div>
          <h3 className="page-section-title">{component.heading}</h3>
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
        <FormTextField label="Key" value={component.componentKey} readOnly />
        <SourceModeField
          componentId={component.componentId}
          sourceMode={component.sourceMode}
          readOnly
        />
        <FormTextField label="Local path" value={component.localPath} readOnly />
        <FormTextField label="Git URL" value={component.gitUrl} readOnly />
        <FormTextField label="Default ref" value={component.defaultRef} readOnly />
      </div>

      <div className="component-card-rule-overrides">
        <p className="form-field-label">Optional rule override</p>

        <div className="component-card-overrides">
          <TextListField label="Review" items={component.reviewInstructions} readOnly />
          <TextListField label="Test" items={component.testInstructions} readOnly />
        </div>
      </div>

      <div className="project-form-actions">
        <button type="button" className="ghost-button" disabled>
          Remove
        </button>
      </div>
    </article>
  );
}
