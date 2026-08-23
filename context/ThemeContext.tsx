import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  cardBorder: string;
  border: string;
  muted: string;
  mutedForeground: string;
  textPrimary: string;
  textSecondary: string;
  primary: string;
  accent: string;
  inputBackground: string;
  inputBorder: string;
  modalOverlay: string;
  isDark: boolean;
}

export const DARK_COLORS: ThemeColors = {
  background: '#04060c',
  surface: '#070b14',
  card: '#070b14',
  cardBorder: '#141d2e',
  border: '#141d2e',
  muted: '#141d2e',
  mutedForeground: '#94a3b8',
  textPrimary: '#ffffff',
  textSecondary: '#cbd5e1',
  primary: '#22c55e',
  accent: '#22c55e',
  inputBackground: '#070b14',
  inputBorder: '#141d2e',
  modalOverlay: 'rgba(0, 0, 0, 0.85)',
  isDark: true,
};

export const LIGHT_COLORS: ThemeColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
  cardBorder: '#e2e8f0',
  border: '#e2e8f0',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  primary: '#16a34a',
  accent: '#16a34a',
  inputBackground: '#ffffff',
  inputBorder: '#cbd5e1',
  modalOverlay: 'rgba(15, 23, 42, 0.65)',
  isDark: false,
};

export const THEME_STORAGE_KEY = '@app_theme_mode';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme() || 'dark'
  );

  useEffect(() => {
    // Load saved theme preference
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeModeState(saved);
        }
      })
      .catch((err) => console.error('Failed to load theme preference:', err));

    // Listen to device system appearance changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (err) {
      console.error('Failed to save theme preference:', err);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    await setThemeMode(nextMode);
  }, [themeMode, systemScheme]);

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemScheme === 'dark' || !systemScheme;
    }
    return themeMode === 'dark';
  }, [themeMode, systemScheme]);

  const colors = useMemo(() => {
    return isDark ? DARK_COLORS : LIGHT_COLORS;
  }, [isDark]);

  const contextValue = useMemo(
    () => ({
      themeMode,
      isDark,
      colors,
      setThemeMode,
      toggleTheme,
    }),
    [themeMode, isDark, colors, setThemeMode, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
