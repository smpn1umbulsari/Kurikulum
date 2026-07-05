import type { ReactNode } from 'react';

type KpiVariant = 'default' | 'success' | 'warning' | 'danger';

interface KpiCardProps {
  /** Label text displayed above the value */
  label: string;
  /** Main metric value to display */
  value: string | number;
  /** Optional icon rendered on the right side */
  icon?: ReactNode;
  /** Color variant for icon tinting */
  variant?: KpiVariant;
  /** Additional CSS classes */
  className?: string;
}

const variantStyles: Record<KpiVariant, string> = {
  default: 'text-primary-500',
  success: 'text-success-500',
  warning: 'text-warning-500',
  danger: 'text-danger-500',
};

/**
 * Metric display card for KPI dashboards.
 *
 * @example
 * ```tsx
 * <KpiCard
 *   label="Total Siswa"
 *   value={150}
 *   icon={<Users className="h-10 w-10" />}
 *   variant="success"
 * />
 * ```
 */
export function KpiCard({
  label,
  value,
  icon,
  variant = 'default',
  className,
}: KpiCardProps) {
  return (
    <div
      className={`bg-white p-6 rounded-card border border-neutral-200 shadow-card flex items-center justify-between h-[120px] ${
        className || ''
      }`}
    >
      <div>
        <p className="text-sm font-medium text-neutral-500">{label}</p>
        <p className="text-3xl font-bold text-neutral-800 mt-1">{value}</p>
      </div>
      {icon && (
        <div className={`h-10 w-10 ${variantStyles[variant]}`}>{icon}</div>
      )}
    </div>
  );
}
