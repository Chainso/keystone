import { cn } from "@/lib/utils";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

interface TextListFieldProps {
  addLabel?: string | undefined;
  description?: string | undefined;
  emptyMessage?: string | undefined;
  errorMessage?: string | undefined;
  items: string[];
  label: string;
  mono?: boolean | undefined;
  onAdd?: (() => void) | undefined;
  onChange?: ((index: number, value: string) => void) | undefined;
  onRemove?: ((index: number) => void) | undefined;
  readOnly?: boolean | undefined;
  rowErrors?: Record<number, string> | undefined;
}

export function TextListField({
  addLabel = "Add item",
  description,
  emptyMessage = "No items added yet.",
  errorMessage,
  items,
  label,
  mono,
  onAdd,
  onChange,
  onRemove,
  readOnly,
  rowErrors = {}
}: TextListFieldProps) {
  const isEditable = Boolean(!readOnly && onChange && onAdd && onRemove);

  return (
    <fieldset className="text-list-field">
      <legend className="form-field-label">{label}</legend>
      <div className="text-list-field-header">
        {description ? <p className="form-field-description">{description}</p> : null}
        {isEditable ? (
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            {addLabel}
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="workspace-panel-summary">{emptyMessage}</p>
      ) : (
        <ol className="text-list-editor">
          {items.map((item, index) => (
            <li key={`${label}-${index}`} className="text-list-item">
              <div className="text-list-row">
                <Badge variant="outline" className="text-list-index" aria-hidden="true">
                  {index + 1}
                </Badge>
                <Input
                  type="text"
                  className={cn("form-field-input text-list-input", mono ? "form-field-input-mono" : null)}
                  aria-label={`${label} ${index + 1}`}
                  value={item}
                  onChange={(event) => onChange?.(index, event.currentTarget.value)}
                  readOnly={readOnly || !isEditable}
                  disabled={!readOnly && !isEditable}
                  aria-invalid={rowErrors[index] ? "true" : undefined}
                />
                {isEditable ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onRemove(index)}
                  >
                    Remove
                  </Button>
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
    </fieldset>
  );
}
