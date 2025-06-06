import React from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  label,
  description,
  icon,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  ...props
}) => {
  const { t } = useTranslation();
  const buttonId = React.useId();

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <div className="inline-block">
      <button
        id={buttonId}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        aria-label={label}
        aria-describedby={description ? `${buttonId}-desc` : undefined}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {icon && <span className="mr-2" aria-hidden="true">{icon}</span>}
        {label}
      </button>
      {description && (
        <span
          id={`${buttonId}-desc`}
          className="sr-only"
        >
          {description}
        </span>
      )}
    </div>
  );
}; 