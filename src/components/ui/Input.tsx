/**
 * Input - SIKAD v4.0
 * Form input component with label, error, and helper text support.
 */

import { forwardRef, useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | boolean;
  helperText?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      leftIcon,
      rightIcon,
      className = '',
      id: propId,
      name,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = propId || name || generatedId;

    const inputClasses = `
      w-full h-10 border rounded-medium text-sm bg-white
      transition-colors duration-150
      focus:outline-none
      ${error
        ? 'border-danger-500 focus:ring-2 focus:ring-danger-500 focus:border-danger-500'
        : 'border-neutral-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
      }
      ${leftIcon ? 'pl-10' : 'pl-3'}
      ${rightIcon ? 'pr-10' : 'pr-3'}
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
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            name={name}
            className={inputClasses}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
        {typeof error === 'string' && error && (
          <p id={`${id}-error`} className="text-xs text-danger-500 mt-1">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${id}-helper`} className="text-xs text-neutral-500 mt-1">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
