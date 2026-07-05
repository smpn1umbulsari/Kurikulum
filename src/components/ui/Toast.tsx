/**
 * Toast Component — SIKAD v4.0
 * Non-blocking notification toast rendered via React portal
 */

import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, type ToastVariant } from '../../store/toastStore';

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 flex-shrink-0" />,
  error: <XCircle className="h-5 w-5 flex-shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 flex-shrink-0" />,
  info: <Info className="h-5 w-5 flex-shrink-0" />,
};

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'bg-white border-success-200 text-success-700 [&>svg]:text-success-500',
  error: 'bg-white border-danger-200 text-danger-700 [&>svg]:text-danger-500',
  warning: 'bg-white border-warning-200 text-warning-700 [&>svg]:text-warning-500',
  info: 'bg-white border-info-200 text-info-700 [&>svg]:text-info-500',
};

const VARIANT_BG: Record<ToastVariant, string> = {
  success: 'bg-success-50',
  error: 'bg-danger-50',
  warning: 'bg-warning-50',
  info: 'bg-info-50',
};

function ToastItem({ id, message, variant }: { id: string; message: string; variant: ToastVariant }) {
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg
        min-w-[320px] max-w-md w-full
        animate-toast-in
        ${VARIANT_CLASSES[variant]}
      `}
    >
      <div className={`p-1.5 rounded-full ${VARIANT_BG[variant]}`}>
        {ICONS[variant]}
      </div>
      <p className="flex-1 text-sm font-medium leading-relaxed">{message}</p>
      <button
        onClick={() => removeToast(id)}
        aria-label="Tutup notifikasi"
        className="flex-shrink-0 p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return createPortal(
    <div
      aria-label="Notifikasi"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
      style={{ isolation: 'isolate' }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem {...toast} />
        </div>
      ))}
    </div>,
    document.body
  );
}
