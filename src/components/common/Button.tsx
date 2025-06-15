import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  glow?: boolean;
  pulse?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  glow = false,
  pulse = false,
  className,
  disabled,
  ...props
}) => {
  const baseClasses = cn(
    'inline-flex items-center justify-center',
    'font-mono font-medium rounded-sm',
    'transition-all duration-200 ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-cyber-cyan focus:ring-offset-2 focus:ring-offset-bg-primary',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'uppercase tracking-wider',
    'border text-xs',
    glow && 'hover:shadow-cyber',
    pulse && 'animate-pulse-cyan'
  );
  
  const variants = {
    primary: 'bg-cyber-cyan text-bg-primary border-cyber-cyan hover:bg-cyber-cyan/90 hover:shadow-cyber-lg',
    secondary: 'bg-bg-tertiary text-text-primary border-text-muted hover:bg-bg-tertiary/80 hover:border-cyber-cyan',
    outline: 'bg-transparent text-cyber-cyan border-cyber-cyan hover:bg-cyber-cyan-dim hover:shadow-cyber',
    ghost: 'bg-transparent text-text-secondary border-transparent hover:bg-bg-tertiary hover:text-text-primary',
    danger: 'bg-transparent text-cyber-magenta border-cyber-magenta hover:bg-cyber-magenta-dim hover:shadow-magenta'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2 text-xs',
    lg: 'px-6 py-3 text-sm'
  };

  return (
    <button
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};