/**
 * Toast Store — SIKAD v4.0
 * Zustand store for non-blocking toast notifications
 */

import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

// Convenience helpers exposed on the store
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ message, variant: 'success', duration }),
  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ message, variant: 'error', duration }),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ message, variant: 'warning', duration }),
  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ message, variant: 'info', duration }),
  confirm: (message: string, _onConfirm: () => void) =>
    useToastStore.getState().addToast({
      message,
      variant: 'warning',
      duration: 0, // persistent until dismissed
    }),
  remove: (id: string) => useToastStore.getState().removeToast(id),
};

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    // Auto-dismiss unless duration is 0 (persistent, e.g. confirm)
    const dismissMs = toast.duration ?? 4000;
    if (dismissMs > 0) {
      setTimeout(() => {
        useToastStore.getState().removeToast(id);
      }, dismissMs);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => set({ toasts: [] }),
}));
