/**
 * SkeletonRow Component — SIKAD v4.0
 * Animated placeholder rows for table loading states
 */

interface SkeletonRowProps {
  /** Number of columns (used when rows > 1) */
  columns?: number;
  /** Number of rows to render. Omit or pass 0 to render a single spanning row. */
  rows?: number;
  /** When rows is omitted/0: custom colSpan for the spanning row. */
  colSpan?: number;
}

export function SkeletonRow({ columns = 1, rows = 1, colSpan }: SkeletonRowProps) {
  // Single spanning row (used inside a <tbody> — one <tr> with colSpan)
  if (rows <= 1) {
    return (
      <tr aria-hidden="true">
        <td colSpan={colSpan} className="px-4 py-10 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-neutral-200 animate-skeleton" />
              <div className="h-4 w-32 rounded bg-neutral-200 animate-skeleton" />
            </div>
            <div className="h-3 w-48 rounded bg-neutral-100 animate-skeleton" />
          </div>
        </td>
      </tr>
    );
  }

  // Multiple skeleton rows
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} aria-hidden="true">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-4">
              <div className="h-4 bg-neutral-200 rounded animate-skeleton" style={{ width: `${60 + ((rowIdx * 7 + colIdx * 3) % 30)}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
