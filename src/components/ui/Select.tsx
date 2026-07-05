/**
 * Select - SIKAD v4.0
 * Form select component with label and error support.
 */

import { forwardRef, useId } from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      required,
      options,
      placeholder,
      className = '',
      id: propId,
      name,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = propId || name || generatedId;

    const selectClasses = `
      w-full h-10 border rounded-medium text-sm bg-white
      transition-colors duration-150
      focus:outline-none
      ${error
        ? 'border-danger-500 focus:ring-2 focus:ring-danger-500 focus:border-danger-500'
        : 'border-neutral-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
      }
      ${props.disabled ? 'bg-neutral-100 cursor-not-allowed' : ''}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1">
            {label}
            {required && <span className="text-danger-500 ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={selectClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={`${id}-error`} className="text-xs text-danger-500 mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
