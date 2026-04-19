interface PlaceholderListFieldProps {
  label: string;
  items: string[];
}

export function PlaceholderListField({ label, items }: PlaceholderListFieldProps) {
  const values = items.length === 0 ? [""] : items;

  return (
    <fieldset className="placeholder-list-field">
      <legend className="placeholder-field-label">{label}</legend>
      <ol className="placeholder-list-editor">
        {values.map((item, index) => (
          <li key={`${label}-${index}`} className="placeholder-list-item">
            <input
              type="text"
              className="placeholder-field-input"
              aria-label={values.length === 1 ? label : `${label} ${index + 1}`}
              defaultValue={item}
            />
          </li>
        ))}
      </ol>
    </fieldset>
  );
}
