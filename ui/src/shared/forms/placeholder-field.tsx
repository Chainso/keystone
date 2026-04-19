interface PlaceholderFieldProps {
  label: string;
  value: string;
}

interface PlaceholderSelectFieldProps extends PlaceholderFieldProps {
  options: string[];
}

export function PlaceholderTextField({ label, value }: PlaceholderFieldProps) {
  return (
    <label className="placeholder-field">
      <span className="placeholder-field-label">{label}</span>
      <input type="text" className="placeholder-field-input" defaultValue={value} />
    </label>
  );
}

export function PlaceholderTextAreaField({ label, value }: PlaceholderFieldProps) {
  return (
    <label className="placeholder-field">
      <span className="placeholder-field-label">{label}</span>
      <textarea className="placeholder-field-input placeholder-field-textarea" defaultValue={value} />
    </label>
  );
}

export function PlaceholderSelectField({
  label,
  options,
  value
}: PlaceholderSelectFieldProps) {
  return (
    <label className="placeholder-field">
      <span className="placeholder-field-label">{label}</span>
      <select className="placeholder-field-input" defaultValue={value}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
