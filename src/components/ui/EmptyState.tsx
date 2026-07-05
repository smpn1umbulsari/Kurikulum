/**
 * EmptyState Component — SIKAD v4.0
 * Informative empty state with icon, message, and optional action
 */

import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-neutral-400" />
      </div>
      <h3 className="text-base font-semibold text-neutral-700 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-neutral-500 max-w-xs mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            action.variant === 'secondary'
              ? 'border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
