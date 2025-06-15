import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'terminal' | 'search';
  glow?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  variant = 'default',
  glow = false,
  className,
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const baseClasses = cn(
    'block w-full px-4 py-2 rounded-sm',
    'font-mono text-sm',
    'transition-all duration-200 ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-cyber-cyan focus:ring-offset-2 focus:ring-offset-bg-primary',
    glow && 'focus:shadow-cyber'
  );

  const variants = {
    default: cn(
      'bg-bg-primary border text-text-primary placeholder-text-muted',
      error 
        ? 'border-cyber-orange focus:border-cyber-orange focus:ring-cyber-orange' 
        : 'border-text-muted focus:border-cyber-cyan',
      'focus:bg-cyber-cyan-dim/10'
    ),
    terminal: cn(
      'bg-bg-primary border-cyber-green text-cyber-green placeholder-cyber-green/70',
      'focus:border-cyber-green focus:ring-cyber-green',
      'focus:shadow-green'
    ),
    search: cn(
      'bg-bg-secondary border-cyber-cyan/50 text-text-primary placeholder-text-secondary',
      'focus:border-cyber-cyan focus:bg-bg-primary',
      'focus:shadow-cyber'
    )
  };

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary font-mono uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-text-muted">{icon}</span>
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            baseClasses,
            variants[variant],
            icon && 'pl-10',
            className
          )}
          {...props}
        />
        {variant === 'terminal' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-cyber-green font-mono">{'>'}</span>
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-cyber-orange font-mono">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-text-muted">{helperText}</p>
      )}
    </div>
  );
};