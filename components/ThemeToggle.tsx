import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, ThemeMode } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { Text } from '@/components/ui/AppText';

interface ThemeToggleProps {
  variant?: 'quick' | 'segmented';
  className?: string;
}

export function ThemeToggle({ variant = 'quick', className = '' }: ThemeToggleProps) {
  const { themeMode, isDark, colors, setThemeMode, toggleTheme } = useTheme();
  const { t, isArabic } = useLanguage();

  const handleSelectMode = (mode: ThemeMode) => {
    if (mode !== themeMode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setThemeMode(mode);
    }
  };

  const handleQuickToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toggleTheme();
  };

  if (variant === 'segmented') {
    const options: { mode: ThemeMode; labelKey: string; icon: any; iconType: 'ion' | 'feather' }[] = [
      { mode: 'system', labelKey: 'profile.systemTheme', icon: 'settings-outline', iconType: 'ion' },
      { mode: 'light', labelKey: 'profile.lightTheme', icon: 'sunny-outline', iconType: 'ion' },
      { mode: 'dark', labelKey: 'profile.darkTheme', icon: 'moon-outline', iconType: 'ion' },
    ];

    return (
      <View
        style={{
          backgroundColor: isDark ? '#070b14' : '#f1f5f9',
          borderColor: colors.cardBorder,
        }}
        className={`flex-row p-1 rounded-2xl border ${isArabic ? 'flex-row-reverse' : ''} ${className}`}
      >
        {options.map((opt) => {
          const isSelected = themeMode === opt.mode;
          return (
            <Pressable
              key={opt.mode}
              onPress={() => handleSelectMode(opt.mode)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              style={{
                backgroundColor: isSelected
                  ? isDark
                    ? '#22c55e'
                    : '#16a34a'
                  : 'transparent',
              }}
              className={`flex-1 py-2.5 px-2 rounded-xl items-center justify-center flex-row gap-1.5 ${
                isArabic ? 'flex-row-reverse' : ''
              }`}
            >
              <Ionicons
                name={opt.icon}
                size={16}
                color={
                  isSelected
                    ? isDark
                      ? '#04060c'
                      : '#ffffff'
                    : colors.mutedForeground
                }
              />
              <Text
                style={{
                  color: isSelected
                    ? isDark
                      ? '#04060c'
                      : '#ffffff'
                    : colors.mutedForeground,
                  fontSize: 12,
                }}
              >
                {t(opt.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  // Quick header icon toggle button
  return (
    <Pressable
      onPress={handleQuickToggle}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        backgroundColor: isDark ? '#070b14' : '#ffffff',
        borderColor: colors.cardBorder,
      }}
      className={`h-10 w-10 rounded-full border items-center justify-center active:opacity-80 shadow-sm ${className}`}
    >
      {isDark ? (
        <Ionicons name="sunny" size={18} color="#eab308" />
      ) : (
        <Ionicons name="moon" size={17} color="#0f172a" />
      )}
    </Pressable>
  );
}
