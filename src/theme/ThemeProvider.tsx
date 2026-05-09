import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { AppearancePreference, useThemePreferencesStore } from '../store/themePreferencesStore';
import { AppPalette, darkPalette, lightPalette } from './palettes';

export type ResolvedScheme = 'light' | 'dark';

export interface ThemeContextValue {
  colors: AppPalette;
  appearance: AppearancePreference;
  resolvedScheme: ResolvedScheme;
  setAppearance: (a: AppearancePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveAppearance(
  appearance: AppearancePreference,
  system: string | null | undefined
): ResolvedScheme {
  if (appearance === 'system') {
    return system === 'light' ? 'light' : 'dark';
  }
  return appearance;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const appearance = useThemePreferencesStore((s) => s.appearance);
  const setAppearance = useThemePreferencesStore((s) => s.setAppearance);
  const systemScheme = useColorScheme();

  const resolvedScheme = useMemo(
    () => resolveAppearance(appearance, systemScheme),
    [appearance, systemScheme]
  );

  const colors = resolvedScheme === 'dark' ? darkPalette : lightPalette;

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors,
      appearance,
      resolvedScheme,
      setAppearance,
    }),
    [colors, appearance, resolvedScheme, setAppearance]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
