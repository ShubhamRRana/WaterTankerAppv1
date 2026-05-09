/**
 * Semantic app colors. Use via `useTheme().colors` so light/dark stay in sync.
 */
export type AppPalette = {
  primary: string;
  background: string;
  surface: string;
  surfaceLight: string;
  secondary: string;
  accent: string;
  accentMuted: string;
  text: string;
  textSecondary: string;
  textLight: string;
  /** Text/icon on top of `accent` fills (e.g. primary buttons) */
  onAccent: string;
  /** Text on `secondary` fills (e.g. secondary buttons) */
  onSecondary: string;
  border: string;
  borderLight: string;
  success: string;
  warning: string;
  error: string;
  disabled: string;
  shadow: string;
  overlaySubtle: string;
  overlayLight: string;
  overlayMedium: string;
  overlayDark: string;
};

export const darkPalette: AppPalette = {
  primary: '#1a1d24',
  background: '#1a1d24',
  surface: '#252a33',
  surfaceLight: '#2f3540',
  secondary: '#3d4552',
  accent: '#ffc300',
  accentMuted: '#a08b4a',
  text: '#f0f2f5',
  textSecondary: '#9ca3af',
  textLight: '#ffffff',
  onAccent: '#ffffff',
  onSecondary: '#ffffff',
  border: '#3d4552',
  borderLight: '#4a5568',
  success: '#34d399',
  warning: '#f59e0b',
  error: '#ef4444',
  disabled: '#6b7280',
  shadow: '#000000',
  overlaySubtle: 'rgba(255, 255, 255, 0.06)',
  overlayLight: 'rgba(255, 255, 255, 0.2)',
  overlayMedium: 'rgba(255, 255, 255, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.6)',
};

export const lightPalette: AppPalette = {
  primary: '#f3f4f6',
  background: '#f3f4f6',
  surface: '#ffffff',
  surfaceLight: '#e5e7eb',
  secondary: '#d1d5db',
  accent: '#ffc300',
  accentMuted: '#a0892d',
  text: '#111827',
  textSecondary: '#6b7280',
  textLight: '#ffffff',
  onAccent: '#111827',
  onSecondary: '#111827',
  border: '#d1d5db',
  borderLight: '#9ca3af',
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  disabled: '#9ca3af',
  shadow: '#000000',
  overlaySubtle: 'rgba(0, 0, 0, 0.04)',
  overlayLight: 'rgba(0, 0, 0, 0.08)',
  overlayMedium: 'rgba(0, 0, 0, 0.12)',
  overlayDark: 'rgba(0, 0, 0, 0.45)',
};
