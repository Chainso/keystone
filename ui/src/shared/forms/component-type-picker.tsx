import type { ProjectComponentTypeOption } from "../../features/projects/project-configuration-scaffold";

interface ComponentTypePickerProps {
  options: ProjectComponentTypeOption[];
  onSelect: (kindId: ProjectComponentTypeOption["kindId"]) => void;
  title: string;
}

export function ComponentTypePicker({
  options,
  onSelect,
  title
}: ComponentTypePickerProps) {
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
