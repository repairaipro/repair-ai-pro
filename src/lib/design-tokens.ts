/**
 * REPAIR OS - Design System
 * Enterprise-grade design tokens
 * Future-proof, scalable, accessible
 */

export const colors = {
  light: {
    // Primary - Trust & Action
    primary: {
      50: '#EEF2FF',
      100: '#E0E7FF',
      200: '#C7D2FE',
      300: '#A5B4FC',
      400: '#818CF8',
      500: '#6366F1',
      600: '#4F46E5',
      700: '#4338CA',
      800: '#3730A3',
      900: '#312E81',
      950: '#1E1B4B',
    },
    // Success - Completion & Approval
    success: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBFF8D',
      300: '#86EFAC',
      400: '#4ADE80',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
      800: '#166534',
      900: '#145231',
    },
    // Warning - Attention & Pending
    warning: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },
    // Error - Decline & Critical
    error: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
    },
    // Neutral - Secondary & Disabled
    neutral: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D8',
      400: '#A1A1AA',
      500: '#71717A',
      600: '#52525B',
      700: '#3F3F46',
      800: '#27272A',
      900: '#18181B',
      950: '#09090B',
    },
  },
  dark: {
    primary: {
      50: '#E0E7FF',
      100: '#C7D2FE',
      200: '#A5B4FC',
      300: '#818CF8',
      400: '#6366F1',
      500: '#818CF8',
      600: '#A5B4FC',
      700: '#C7D2FE',
      800: '#E0E7FF',
      900: '#F0F4FF',
    },
    success: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      200: '#A7F3D0',
      300: '#6EE7B7',
      400: '#34D399',
      500: '#10B981',
      600: '#059669',
      700: '#047857',
      800: '#065F46',
      900: '#064E3B',
    },
    neutral: {
      50: '#0F172A',
      100: '#1E293B',
      200: '#334155',
      300: '#475569',
      400: '#64748B',
      500: '#94A3B8',
      600: '#CBD5E1',
      700: '#E2E8F0',
      800: '#F1F5F9',
      900: '#F8FAFC',
    },
  },
}

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
}

export const typography = {
  display: {
    fontSize: '32px',
    fontWeight: 700,
    lineHeight: '40px',
    letterSpacing: '-0.5px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    lineHeight: '32px',
    letterSpacing: '-0.25px',
  },
  headline: {
    fontSize: '20px',
    fontWeight: 600,
    lineHeight: '28px',
  },
  body: {
    fontSize: '16px',
    fontWeight: 400,
    lineHeight: '24px',
  },
  bodySmall: {
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: '20px',
  },
  caption: {
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: '16px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: '16px',
    letterSpacing: '0.5px',
  },
}

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
}

export const borderRadius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  full: '9999px',
}

export const transitions = {
  fast: '100ms ease-in-out',
  normal: '150ms ease-in-out',
  slow: '200ms ease-in-out',
  slower: '300ms ease-in-out',
}

export const zIndex = {
  hide: '-1',
  auto: 'auto',
  base: '0',
  dropdown: '1000',
  sticky: '1100',
  fixed: '1200',
  backdrop: '1300',
  modal: '1400',
  popover: '1500',
  tooltip: '1600',
}
