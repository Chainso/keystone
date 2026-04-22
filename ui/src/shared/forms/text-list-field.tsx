import { useId } from "react";

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

function buildAriaDescribedBy(...ids: Array<string | undefined>) {
  const describedBy = ids.filter(Boolean).join(" ");

  return describedBy || undefined;
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
  const fieldId = useId();
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = errorMessage ? `${fieldId}-message` : undefined;
  const fieldDescribedBy = buildAriaDescribedBy(descriptionId, errorId);

  return (
    <fieldset className="text-list-field" aria-describedby={fieldDescribedBy}>
      <legend className="form-field-label">{label}</legend>
      <div className="text-list-field-header">
        {description ? (
          <p id={descriptionId} className="form-field-description">
            {description}
          </p>
        ) : null}
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
          {items.map((item, index) => {
            const rowErrorId = rowErrors[index]
              ? `${fieldId}-row-${index}-message`
              : undefined;
            const rowDescribedBy = buildAriaDescribedBy(descriptionId, errorId, rowErrorId);

            return (
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
                    aria-describedby={rowDescribedBy}
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
                  <p id={rowErrorId} className="form-field-error">
                    {rowErrors[index]}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      {errorMessage ? (
        <p id={errorId} className="form-field-error">
          {errorMessage}
        </p>
      ) : null}
    </fieldset>
  );
}
