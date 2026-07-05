/**
 * Alert Utilities - SIKAD v4.0
 * SweetAlert2 wrapper for modern, consistent alert/confirm/prompt dialogs
 */

import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

// SweetAlert2 default theme - matches app design
// SweetAlert2 default theme - matches app design
const SwalMixin = Swal.mixin({
  confirmButtonColor: '#2563EB', // primary-600
  cancelButtonColor: '#6B7280', // neutral-500
  buttonsStyling: true,
  reverseButtons: true,
});

export const swal = {
  /**
   * Show success notification
   */
  success: (message: string, title = 'Berhasil') => {
    return SwalMixin.fire({
      icon: 'success',
      title,
      text: message,
      timer: 2500,
      showConfirmButton: false,
    });
  },

  /**
   * Show error notification
   */
  error: (message: string, title = 'Error') => {
    return SwalMixin.fire({
      icon: 'error',
      title,
      text: message,
      confirmButtonText: 'OK',
    });
  },

  /**
   * Show warning notification
   */
  warning: (message: string, title = 'Peringatan') => {
    return SwalMixin.fire({
      icon: 'warning',
      title,
      text: message,
      confirmButtonText: 'OK',
    });
  },

  /**
   * Show info notification
   */
  info: (message: string, title = 'Informasi') => {
    return SwalMixin.fire({
      icon: 'info',
      title,
      text: message,
      confirmButtonText: 'OK',
    });
  },

  /**
   * Show confirmation dialog (replacement for window.confirm)
   * @returns Promise<boolean> - true if confirmed, false if cancelled
   */
  confirm: async (message: string, title = 'Konfirmasi') => {
    const result = await SwalMixin.fire({
      icon: 'question',
      title,
      text: message,
      showCancelButton: true,
      confirmButtonText: 'Ya, Lanjutkan',
      cancelButtonText: 'Batal',
      reverseButtons: true,
    });
    return result.isConfirmed;
  },

  /**
   * Show loading/toast while processing
   */
  loading: (message = 'Memproses...') => {
    SwalMixin.fire({
      title: message,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  },

  /**
   * Close loading dialog
   */
  closeLoading: () => {
    Swal.close();
  },

  /**
   * Show custom dialog with HTML content
   */
  custom: (options: {
    title?: string;
    html?: string;
    icon?: 'success' | 'error' | 'warning' | 'info' | 'question';
    showConfirmButton?: boolean;
    showCancelButton?: boolean;
    confirmText?: string;
    cancelText?: string;
    timer?: number;
  }) => {
    return SwalMixin.fire({
      icon: options.icon,
      title: options.title,
      html: options.html,
      showConfirmButton: options.showConfirmButton ?? true,
      showCancelButton: options.showCancelButton,
      confirmButtonText: options.confirmText ?? 'OK',
      cancelButtonText: options.cancelText ?? 'Batal',
      timer: options.timer,
    });
  },
};

export default swal;
