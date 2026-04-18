interface PlaceholderListFieldProps {
  label: string;
  items: string[];
}

export function PlaceholderListField({ label, items }: PlaceholderListFieldProps) {
  return (
    <section className="placeholder-list-field">
      <p className="placeholder-field-label">{label}</p>
      <ol className="placeholder-list-editor">
        {items.map((item) => (
          <li key={item} className="placeholder-list-item">
            {item}
          </li>
        ))}
      </ol>
    </section>
  );
}
