import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
}) => {
  const baseStyles = 'animate-pulse bg-gray-200 rounded';
  const variantStyles = {
    text: 'h-4 w-full',
    rectangular: 'h-24 w-full',
    circular: 'h-12 w-12 rounded-full',
  };

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        className
      )}
      style={{
        width: width,
        height: height,
      }}
    />
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-4 space-y-3', className)}>
    <Skeleton variant="text" width="60%" />
    <Skeleton variant="text" width="80%" />
    <Skeleton variant="text" width="40%" />
  </div>
);

export const FormSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-4', className)}>
    <div className="space-y-2">
      <Skeleton variant="text" width="30%" />
      <Skeleton variant="rectangular" height={40} />
    </div>
    <div className="space-y-2">
      <Skeleton variant="text" width="30%" />
      <Skeleton variant="rectangular" height={40} />
    </div>
    <Skeleton variant="text" width="40%" height={40} />
  </div>
);

export const FileListSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-4', className)}>
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
        <Skeleton variant="circular" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="20%" />
        </div>
      </div>
    ))}
  </div>
); 