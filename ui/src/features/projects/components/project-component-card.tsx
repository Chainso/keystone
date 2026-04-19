import type { ProjectComponentScaffold } from "../project-configuration-scaffold";
import {
  PlaceholderSelectField,
  PlaceholderTextField
} from "../../../shared/forms/placeholder-field";
import { PlaceholderListField } from "../../../shared/forms/placeholder-list-field";

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

export function ProjectComponentCard({
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

      <div className="component-card-rule-overrides">
        <p className="placeholder-field-label">Optional rule override</p>

        <div className="component-card-overrides">
          <PlaceholderListField label="Review" items={component.reviewInstructions} />
          <PlaceholderListField label="Test" items={component.testInstructions} />
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
