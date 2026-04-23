import type { ProjectComponentTypeOption } from "../project-configuration-scaffold";
import { Badge } from "../../../components/ui/badge";

interface ProjectComponentTypePickerProps {
  onSelect: (kindId: ProjectComponentTypeOption["kindId"]) => void;
  options: ProjectComponentTypeOption[];
  title: string;
}

export function ProjectComponentTypePicker({
  onSelect,
  options,
  title
}: ProjectComponentTypePickerProps) {
  return (
    <section className="type-picker-panel" aria-label={title}>
      <div className="type-picker-header">
        <div className="type-picker-copy">
          <h3 className="page-section-title">{title}</h3>
          <p className="workspace-panel-summary">
            Type selection stays explicit even though backend support is currently limited to Git repositories.
          </p>
        </div>
        <Badge variant="outline">Explicit selection</Badge>
      </div>

      <ul className="type-picker-options" aria-label="Component type options">
        {options.map((option) => (
          <li key={option.kindId}>
            <button
              type="button"
              className="type-picker-option"
              onClick={() => onSelect(option.kindId)}
            >
              <span className="type-picker-option-title">{option.label}</span>
              {option.description ? (
                <span className="type-picker-option-copy" aria-hidden="true">
                  {option.description}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
