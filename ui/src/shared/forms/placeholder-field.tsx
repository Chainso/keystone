interface PlaceholderFieldProps {
  label: string;
  value: string;
}

function PlaceholderFieldShell({ label, value }: PlaceholderFieldProps) {
  return (
    <label className="placeholder-field">
      <span className="placeholder-field-label">{label}</span>
      <span className="placeholder-field-input">{value}</span>
    </label>
  );
}

export function PlaceholderTextField({ label, value }: PlaceholderFieldProps) {
  return <PlaceholderFieldShell label={label} value={value} />;
}

export function PlaceholderTextAreaField({ label, value }: PlaceholderFieldProps) {
  return (
    <label className="placeholder-field">
      <span className="placeholder-field-label">{label}</span>
      <span className="placeholder-field-input placeholder-field-textarea">{value}</span>
    </label>
  );
}
