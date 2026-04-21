import type { ChangeEventHandler, ReactNode } from "react";

interface FormFieldFrameProps {
  children: ReactNode;
  errorMessage?: string | undefined;
  label: string;
}

interface FormTextFieldProps {
  disabled?: boolean | undefined;
  errorMessage?: string | undefined;
  label: string;
  onChange?: ChangeEventHandler<HTMLInputElement> | undefined;
  readOnly?: boolean | undefined;
  value: string;
}

interface FormTextAreaFieldProps {
  disabled?: boolean | undefined;
  errorMessage?: string | undefined;
  label: string;
  onChange?: ChangeEventHandler<HTMLTextAreaElement> | undefined;
  readOnly?: boolean | undefined;
  value: string;
}

interface FormSelectFieldProps {
  disabled?: boolean | undefined;
  errorMessage?: string | undefined;
  label: string;
  onChange?: ChangeEventHandler<HTMLSelectElement> | undefined;
  options: string[];
  value: string;
}

function FormFieldFrame({ children, errorMessage, label }: FormFieldFrameProps) {
  return (
    <label className="form-field">
      <span className="form-field-label">{label}</span>
      {children}
      {errorMessage ? <p className="form-field-error">{errorMessage}</p> : null}
    </label>
  );
}

export function FormTextField({
  disabled,
  errorMessage,
  label,
  onChange,
  readOnly,
  value
}: FormTextFieldProps) {
  return (
    <FormFieldFrame label={label} errorMessage={errorMessage}>
      <input
        type="text"
        className="form-field-input"
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
  disabled,
  errorMessage,
  label,
  onChange,
  readOnly,
  value
}: FormTextAreaFieldProps) {
  return (
    <FormFieldFrame label={label} errorMessage={errorMessage}>
      <textarea
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
  disabled,
  errorMessage,
  label,
  onChange,
  options,
  value
}: FormSelectFieldProps) {
  return (
    <FormFieldFrame label={label} errorMessage={errorMessage}>
      <select
        className="form-field-input"
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
