import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

type ErrorType = 'error' | 'warning' | 'info';

interface ErrorMessageProps {
  message: string;
  type?: ErrorType;
  className?: string;
  onDismiss?: () => void;
  retry?: () => void;
}

const icons = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info
};

const styles = {
  error: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200'
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  type = 'error',
  className,
  onDismiss,
  retry
}) => {
  const Icon = icons[type];

  return (
    <div
      className={cn(
        'rounded-lg border p-4 flex items-start gap-3',
        styles[type],
        className
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <div className="flex items-center gap-2">
        {retry && (
          <button
            onClick={retry}
            className="text-sm font-medium hover:underline"
          >
            Try Again
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-sm font-medium hover:underline"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

export const ValidationError: React.FC<{
  errors: Record<string, string[]>;
  className?: string;
}> = ({ errors, className }) => {
  if (Object.keys(errors).length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {Object.entries(errors).map(([field, messages]) => (
        <div key={field} className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">
              {field.charAt(0).toUpperCase() + field.slice(1)}
            </p>
            <ul className="list-disc list-inside text-sm text-red-600">
              {messages.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}; 