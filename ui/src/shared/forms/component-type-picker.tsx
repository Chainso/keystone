import type { ProjectComponentTypeOption } from "../../features/projects/project-configuration-scaffold";

interface ComponentTypePickerProps {
  title: string;
  summary: string;
  options: ProjectComponentTypeOption[];
  onClose: () => void;
  onSelect: (kindId: ProjectComponentTypeOption["kindId"]) => void;
}

export function ComponentTypePicker({
  title,
  summary,
  options,
  onClose,
  onSelect
}: ComponentTypePickerProps) {
  return (
    <section className="type-picker-panel" aria-label={title}>
      <div className="type-picker-header">
        <div>
          <p className="workspace-panel-eyebrow">Component picker</p>
          <h3 className="page-section-title">{title}</h3>
        </div>
        <button type="button" className="ghost-button" onClick={onClose}>
          Close
        </button>
      </div>

      <p className="page-section-copy">{summary}</p>

      <div className="type-picker-options">
        {options.map((option) => (
          <button
            key={option.kindId}
            type="button"
            className="type-picker-option"
            onClick={() => onSelect(option.kindId)}
          >
            <span className="type-picker-option-title">{option.label}</span>
            <span className="type-picker-option-copy">{option.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
