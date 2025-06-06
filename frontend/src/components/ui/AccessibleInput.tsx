import React from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

export const AccessibleInput: React.FC<AccessibleInputProps> = ({
  label,
  description,
  error,
  helperText,
  required = false,
  icon,
  className,
  id,
  ...props
}) => {
  const { t } = useTranslation();
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const helperTextId = `${inputId}-helper`;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-hidden="true">*</span>
        )}
      </label>
      
      {description && (
        <p
          id={descriptionId}
          className="text-sm text-gray-500"
        >
          {description}
        </p>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            'block w-full rounded-md border-gray-300 shadow-sm',
            'focus:border-blue-500 focus:ring-blue-500',
            'disabled:bg-gray-100 disabled:text-gray-500',
            error ? 'border-red-300' : 'border-gray-300',
            icon ? 'pl-10' : 'pl-4',
            'pr-4 py-2',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={cn(
            description && descriptionId,
            error && errorId,
            helperText && helperTextId
          )}
          aria-required={required}
          {...props}
        />
      </div>

      {error && (
        <p
          id={errorId}
          className="text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}

      {helperText && !error && (
        <p
          id={helperTextId}
          className="text-sm text-gray-500"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}; 