import type { ReactNode } from 'react';

interface ToolbarProps {
  actions?: ReactNode;
  filters?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Reusable data page toolbar with actions, filters, and optional footer.
 *
 * @example
 * ```tsx
 * <Toolbar
 *   actions={<button>Add</button>}
 *   filters={<input placeholder="Search..." />}
 *   footer={<span>100 items</span>}
 * />
 * ```
 */
export function Toolbar({ actions, filters, footer, className }: ToolbarProps) {
  const hasActions = actions !== undefined && actions !== null;
  const hasFilters = filters !== undefined && filters !== null;
  const hasFooter = footer !== undefined && footer !== null;

  if (!hasActions && !hasFilters && !hasFooter) {
    return null;
  }

  return (
    <div
      className={`bg-white rounded-card border border-neutral-200 shadow-card overflow-hidden ${
        className || ''
      }`}
    >
      {/* Actions Row */}
      {hasActions && (
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-neutral-100">
          {actions}
        </div>
      )}

      {/* Filters Row */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-4 p-4 bg-neutral-50">
          {filters}
        </div>
      )}

      {/* Footer Row */}
      {hasFooter && (
        <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-100">
          {footer}
        </div>
      )}
    </div>
  );
}
