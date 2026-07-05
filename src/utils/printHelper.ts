/**
 * printHelper - SIKAD v4.0
 * Centralised utility to trigger offline-friendly page printing via browser popups.
 * Adapts Spenturi's clean print window paradigm.
 */

export interface PrintOptions {
  documentTitle?: string;
  popupBlockedTitle?: string;
  popupBlockedMessage?: string;
  autoPrint?: boolean;
  printDelayMs?: number;
  fallbackDelayMs?: number;
}

export const AppPrint = {
  /**
   * Opens HTML content in a new blank window, appends stylesheets, and schedules printing.
   */
  openHtml(html: string, options: PrintOptions = {}): Window | null {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      const msg = options.popupBlockedMessage || 'Izinkan popup browser untuk mencetak / export PDF.';
      alert(msg);
      return null;
    }

    if (options.documentTitle) {
      try {
        printWindow.document.title = options.documentTitle;
      } catch (err) {
        console.warn('Failed to set print document title:', err);
      }
    }

    try {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
    } catch (error) {
      try {
        printWindow.close();
      } catch {}
      console.error('Failed to write html to print window:', error);
      throw error;
    }

    const autoPrint = options.autoPrint !== false;
    if (autoPrint) {
      let hasPrinted = false;
      const printDelayMs = options.printDelayMs || 400;
      const fallbackDelayMs = options.fallbackDelayMs || 900;

      const triggerPrint = () => {
        if (hasPrinted) return;
        hasPrinted = true;
        try {
          printWindow.focus();
        } catch {}
        setTimeout(() => {
          try {
            printWindow.print();
          } catch (err) {
            console.error('Window print triggered error:', err);
          }
        }, printDelayMs);
      };

      try {
        printWindow.addEventListener('load', triggerPrint, { once: true });
      } catch {}
      setTimeout(triggerPrint, fallbackDelayMs);
    }

    return printWindow;
  }
};
