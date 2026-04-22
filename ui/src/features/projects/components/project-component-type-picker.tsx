import type { ProjectComponentTypeOption } from "../project-configuration-scaffold";

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
      <h3 className="page-section-title">{title}</h3>

      <ul className="page-list compact-list">
        {options.map((option) => (
          <li key={option.kindId}>
            <button
              type="button"
              className="type-picker-option"
              onClick={() => onSelect(option.kindId)}
            >
              <span className="type-picker-option-title">{option.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
