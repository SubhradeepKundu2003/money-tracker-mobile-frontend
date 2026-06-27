/**
 * Shared visual language — a minimal monochrome system.
 * Only white, black and greyscale values; income/expense are distinguished by
 * tone (near-black vs. mid-grey) plus the +/− signs the screens render.
 */
export const colors = {
  primary: '#111111',
  primaryDark: '#000000',
  primaryLight: '#F2F2F2',
  accent: '#374151',

  income: '#111111',
  expense: '#6B7280',

  background: '#FAFAFA',
  surface: '#FFFFFF',
  border: '#E5E5E5',

  text: '#111111',
  textMuted: '#6B7280',
  textInverse: '#FFFFFF',

  danger: '#111111',
  success: '#111111',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
};

export const shadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};
