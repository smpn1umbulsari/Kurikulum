/**
 * Design Tokens - SIKAD v4.0
 * Based on docs/14-UI-Design-System.md
 */

export const tokens = {
  // Color System
  colors: {
    primary: {
      50: '#EEF4FF',
      100: '#D9E7FF',
      200: '#BAD3FF',
      300: '#8EB6FF',
      400: '#5D92FF',
      500: '#356EFF',
      600: '#1D4ED8',
      700: '#1E40AF',
      800: '#1E3A8A',
      900: '#172554',
    },
    neutral: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    success: {
      500: '#22C55E',
      600: '#16A34A',
    },
    warning: {
      500: '#F59E0B',
      600: '#D97706',
    },
    danger: {
      500: '#EF4444',
      600: '#DC2626',
    },
    info: {
      500: '#0EA5E9',
      600: '#0284C7',
    },
  },

  // Academic Status Colors
  academic: {
    draft: 'neutral',
    published: 'primary',
    finalized: 'success',
  },

  // Attendance Colors
  attendance: {
    hadir: 'success',
    izin: 'warning',
    sakit: 'info',
    alpa: 'danger',
  },

  // Workload Colors
  workload: {
    underload: 'warning',
    ideal: 'success',
    overload: 'danger',
  },

  // Typography
  font: {
    family: {
      sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
    },
    size: {
      display: '48px',
      h1: '36px',
      h2: '30px',
      h3: '24px',
      h4: '20px',
      body: '18px',
      small: '14px',
    },
  },

  // Spacing System (4px base)
  spacing: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
  },

  // Border Radius
  radius: {
    small: '8px',
    medium: '12px',
    large: '16px',
    card: '16px',
  },

  // Shadows
  shadow: {
    card: 'shadow-sm',
    modal: 'shadow-lg',
    floating: 'shadow-xl',
  },

  // Layout
  layout: {
    container: {
      maxWidth: '1440px',
    },
    padding: {
      desktop: '24px',
      mobile: '16px',
    },
  },

  // Grid
  grid: {
    desktop: '12 columns',
    tablet: '8 columns',
    mobile: '4 columns',
  },

  // Button Sizes
  button: {
    small: 'h-10',
    medium: 'h-12',
    large: 'h-14',
  },

  // Form
  form: {
    inputHeight: '56px',
    textareaMinHeight: '120px',
  },

  // Table
  table: {
    rowHeight: '64px',
    cellPadding: '16px',
  },

  // Modal
  modal: {
    small: '480px',
    medium: '720px',
    large: '960px',
  },

  // Responsive Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

export type Tokens = typeof tokens;
