/**
 * LoadingState Component — SIKAD v4.0
 * In-page loading indicator for tables, panels, and content areas
 */

import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Memuat data...', className = '' }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`} aria-live="polite" aria-label={message}>
      <Loader2 className="h-8 w-8 text-primary-500 animate-spin mb-3" />
      <p className="text-sm text-neutral-500">{message}</p>
    </div>
  );
}
