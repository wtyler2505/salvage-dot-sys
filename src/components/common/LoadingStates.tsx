import React from 'react';
import { cn } from '@/lib/utils';

// Skeleton components for loading states
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('bg-bg-secondary border border-cyber-cyan/20 rounded-sm p-4 animate-pulse', className)}>
    <div className="space-y-3">
      <div className="h-32 bg-bg-tertiary rounded-sm" />
      <div className="space-y-2">
        <div className="h-4 bg-bg-tertiary rounded w-3/4" />
        <div className="h-3 bg-bg-tertiary rounded w-1/2" />
      </div>
      <div className="flex justify-between">
        <div className="h-3 bg-bg-tertiary rounded w-1/4" />
        <div className="h-3 bg-bg-tertiary rounded w-1/4" />
      </div>
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-3 animate-pulse">
    {/* Header */}
    <div className="flex space-x-4 pb-3 border-b border-cyber-cyan/20">
      <div className="h-4 bg-bg-tertiary rounded w-1/4" />
      <div className="h-4 bg-bg-tertiary rounded w-1/4" />
      <div className="h-4 bg-bg-tertiary rounded w-1/4" />
      <div className="h-4 bg-bg-tertiary rounded w-1/4" />
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex space-x-4 py-3">
        <div className="h-3 bg-bg-tertiary rounded w-1/4" />
        <div className="h-3 bg-bg-tertiary rounded w-1/4" />
        <div className="h-3 bg-bg-tertiary rounded w-1/4" />
        <div className="h-3 bg-bg-tertiary rounded w-1/4" />
      </div>
    ))}
  </div>
);

export const SkeletonList: React.FC<{ items?: number }> = ({ items = 6 }) => (
  <div className="space-y-4 animate-pulse">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-bg-tertiary rounded-sm" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-bg-tertiary rounded w-3/4" />
          <div className="h-3 bg-bg-tertiary rounded w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonStats: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-bg-secondary border border-cyber-cyan/20 rounded-sm p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 bg-bg-tertiary rounded w-20" />
            <div className="h-6 bg-bg-tertiary rounded w-16" />
            <div className="h-3 bg-bg-tertiary rounded w-24" />
          </div>
          <div className="w-12 h-12 bg-bg-tertiary rounded-sm" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonChat: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    {[false, true, false, true].map((isUser, i) => (
      <div key={i} className={cn('flex items-start space-x-3', isUser && 'flex-row-reverse space-x-reverse')}>
        <div className="w-8 h-8 bg-bg-tertiary rounded-sm" />
        <div className={cn('flex-1 max-w-md', isUser && 'text-right')}>
          <div className={cn(
            'inline-block p-3 rounded-sm space-y-2',
            isUser ? 'bg-cyber-cyan/20 border border-cyber-cyan' : 'bg-bg-tertiary border border-text-muted/30'
          )}>
            <div className="h-3 bg-bg-tertiary rounded w-full" />
            <div className="h-3 bg-bg-tertiary rounded w-3/4" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={cn(
      'border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin',
      sizeClasses[size],
      className
    )} />
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isLoading, 
  children, 
  message = 'LOADING...' 
}) => {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="fixed inset-0 bg-bg-primary/90 backdrop-blur-sm flex items-center justify-center z-50 scanning">
          <div className="text-center p-8 border border-cyber-cyan/50 bg-bg-secondary/50 rounded-sm shadow-cyber">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-text-primary font-mono text-glow-cyan">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
};