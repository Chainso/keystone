interface TextListFieldProps {
  addLabel?: string | undefined;
  emptyMessage?: string | undefined;
  errorMessage?: string | undefined;
  items: string[];
  label: string;
  onAdd?: (() => void) | undefined;
  onChange?: ((index: number, value: string) => void) | undefined;
  onRemove?: ((index: number) => void) | undefined;
  readOnly?: boolean | undefined;
  rowErrors?: Record<number, string> | undefined;
}

export function TextListField({
  addLabel = "Add item",
  emptyMessage = "No items added yet.",
  errorMessage,
  items,
  label,
  onAdd,
  onChange,
  onRemove,
  readOnly,
  rowErrors = {}
}: TextListFieldProps) {
  const isEditable = !readOnly && onChange && onAdd && onRemove;

  return (
    <fieldset className="text-list-field">
      <legend className="form-field-label">{label}</legend>

      {items.length === 0 ? (
        <p className="workspace-panel-summary">{emptyMessage}</p>
      ) : (
        <ol className="text-list-editor">
          {items.map((item, index) => (
            <li key={`${label}-${index}`} className="text-list-item">
              <div className="text-list-row">
                <input
                  type="text"
                  className="form-field-input"
                  aria-label={`${label} ${index + 1}`}
                  value={item}
                  onChange={(event) => onChange?.(index, event.currentTarget.value)}
                  readOnly={readOnly}
                  disabled={!isEditable}
                  aria-invalid={rowErrors[index] ? "true" : undefined}
                />
                {isEditable ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => onRemove(index)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              {rowErrors[index] ? (
                <p className="form-field-error">{rowErrors[index]}</p>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      {errorMessage ? <p className="form-field-error">{errorMessage}</p> : null}

      {isEditable ? (
        <button type="button" className="ghost-button" onClick={onAdd}>
          {addLabel}
        </button>
      ) : null}
    </fieldset>
  );
}
