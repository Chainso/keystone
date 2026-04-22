import { useId, type ChangeEventHandler, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";

interface FormFieldFrameProps {
  children: ReactNode;
  className?: string | undefined;
  description?: string | undefined;
  errorMessage?: string | undefined;
  htmlFor: string;
  label: string;
}

interface FormTextFieldProps {
  className?: string | undefined;
  description?: string | undefined;
  disabled?: boolean | undefined;
  errorMessage?: string | undefined;
  inputClassName?: string | undefined;
  label: string;
  mono?: boolean | undefined;
  onChange?: ChangeEventHandler<HTMLInputElement> | undefined;
  readOnly?: boolean | undefined;
  value: string;
}

interface FormTextAreaFieldProps {
  className?: string | undefined;
  description?: string | undefined;
  disabled?: boolean | undefined;
  errorMessage?: string | undefined;
  label: string;
  onChange?: ChangeEventHandler<HTMLTextAreaElement> | undefined;
  readOnly?: boolean | undefined;
  value: string;
}

interface FormSelectFieldProps {
  className?: string | undefined;
  description?: string | undefined;
  disabled?: boolean | undefined;
  errorMessage?: string | undefined;
  label: string;
  mono?: boolean | undefined;
  onChange?: ChangeEventHandler<HTMLSelectElement> | undefined;
  options: string[];
  value: string;
}

function FormFieldFrame({
  children,
  className,
  description,
  errorMessage,
  htmlFor,
  label
}: FormFieldFrameProps) {
  return (
    <div className={cn("form-field", className)}>
      <div className="form-field-header">
        <Label htmlFor={htmlFor} className="form-field-label">
          {label}
        </Label>
        {description ? <p className="form-field-description">{description}</p> : null}
      </div>
      {children}
      {errorMessage ? <p className="form-field-error">{errorMessage}</p> : null}
    </div>
  );
}

export function FormTextField({
  className,
  description,
  disabled,
  errorMessage,
  inputClassName,
  label,
  mono,
  onChange,
  readOnly,
  value
}: FormTextFieldProps) {
  const fieldId = useId();

  return (
    <FormFieldFrame
      className={className}
      description={description}
      label={label}
      errorMessage={errorMessage}
      htmlFor={fieldId}
    >
      <Input
        id={fieldId}
        type="text"
        className={cn("form-field-input", mono ? "form-field-input-mono" : null, inputClassName)}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        disabled={disabled}
        aria-invalid={errorMessage ? "true" : undefined}
      />
    </FormFieldFrame>
  );
}

export function FormTextAreaField({
  className,
  description,
  disabled,
  errorMessage,
  label,
  onChange,
  readOnly,
  value
}: FormTextAreaFieldProps) {
  const fieldId = useId();

  return (
    <FormFieldFrame
      className={className}
      description={description}
      label={label}
      errorMessage={errorMessage}
      htmlFor={fieldId}
    >
      <Textarea
        id={fieldId}
        className="form-field-input form-field-textarea"
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        disabled={disabled}
        aria-invalid={errorMessage ? "true" : undefined}
      />
    </FormFieldFrame>
  );
}

export function FormSelectField({
  className,
  description,
  disabled,
  errorMessage,
  label,
  mono,
  onChange,
  options,
  value
}: FormSelectFieldProps) {
  const fieldId = useId();

  return (
    <FormFieldFrame
      className={className}
      description={description}
      label={label}
      errorMessage={errorMessage}
      htmlFor={fieldId}
    >
      <select
        id={fieldId}
        className={cn("form-field-input form-field-select", mono ? "form-field-input-mono" : null)}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={errorMessage ? "true" : undefined}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FormFieldFrame>
  );
}
