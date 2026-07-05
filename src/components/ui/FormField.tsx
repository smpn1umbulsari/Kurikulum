import { ReactNode } from 'react';

export interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: ReactNode;
}

export function FormField({
  label,
  required = false,
  error,
  helperText,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      {/* Label */}
      <label className="block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-danger-500 ml-1">*</span>}
      </label>

      {/* Content slot */}
      {children}

      {/* Error or helper text */}
      {error ? (
        <p className="text-xs text-danger-500 mt-1" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-neutral-500 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
}

export default FormField;
