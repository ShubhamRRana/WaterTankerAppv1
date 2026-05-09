import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppearancePreference = 'light' | 'dark' | 'system';

export const THEME_PREFERENCES_STORAGE_KEY = 'watertanker-appearance';

interface ThemePreferencesState {
  appearance: AppearancePreference;
  setAppearance: (appearance: AppearancePreference) => void;
}

export const useThemePreferencesStore = create<
  ThemePreferencesState
>()(
  persist(
    (set) => ({
      appearance: 'dark',
      setAppearance: (appearance) => set({ appearance }),
    }),
    {
      name: THEME_PREFERENCES_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ appearance: state.appearance }),
    }
  )
);
