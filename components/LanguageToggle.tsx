import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/AppText';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

interface LanguageToggleProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function LanguageToggle({ variant = 'compact', className = '' }: LanguageToggleProps) {
  const { currentLanguage, changeLanguage } = useLanguage();
  const { colors, isDark } = useTheme();

  const handleSelect = (lang: 'en' | 'ar') => {
    if (lang !== currentLanguage) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      changeLanguage(lang);
    }
  };

  const selectedBg = isDark ? '#22c55e' : '#16a34a';
  const selectedText = isDark ? '#04060c' : '#ffffff';

  if (variant === 'full') {
    return (
      <View
        style={{
          backgroundColor: isDark ? '#070b14' : '#f1f5f9',
          borderColor: colors.cardBorder,
        }}
        className={`flex-row border p-1 rounded-2xl ${className}`}
      >
        <Pressable
          onPress={() => handleSelect('en')}
          accessibilityRole="button"
          accessibilityState={{ selected: currentLanguage === 'en' }}
          style={{
            backgroundColor: currentLanguage === 'en' ? selectedBg : 'transparent',
          }}
          className="flex-1 py-3 px-4 rounded-xl items-center justify-center flex-row gap-2"
        >
          <Text
            style={{
              color: currentLanguage === 'en' ? selectedText : colors.mutedForeground,
            }}
            className="font-bold text-sm"
          >
            English (EN)
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleSelect('ar')}
          accessibilityRole="button"
          accessibilityState={{ selected: currentLanguage === 'ar' }}
          style={{
            backgroundColor: currentLanguage === 'ar' ? selectedBg : 'transparent',
          }}
          className="flex-1 py-3 px-4 rounded-xl items-center justify-center flex-row gap-2"
        >
          <Text
            style={{
              fontFamily: 'DroidArabicKufi',
              color: currentLanguage === 'ar' ? selectedText : colors.mutedForeground,
            }}
            className="text-sm font-bold"
          >
            العربية (AR)
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.cardBorder,
      }}
      className={`flex-row items-center border rounded-full p-0.5 shadow-sm ${className}`}
    >
      <Pressable
        onPress={() => handleSelect('en')}
        accessibilityRole="button"
        accessibilityLabel="English"
        accessibilityState={{ selected: currentLanguage === 'en' }}
        style={{
          backgroundColor: currentLanguage === 'en' ? selectedBg : 'transparent',
        }}
        className="px-2.5 py-1 rounded-full items-center justify-center"
      >
        <Text
          style={{
            color: currentLanguage === 'en' ? selectedText : colors.mutedForeground,
          }}
          className="text-xs font-bold"
        >
          EN
        </Text>
      </Pressable>

      <Pressable
        onPress={() => handleSelect('ar')}
        accessibilityRole="button"
        accessibilityLabel="Arabic"
        accessibilityState={{ selected: currentLanguage === 'ar' }}
        style={{
          backgroundColor: currentLanguage === 'ar' ? selectedBg : 'transparent',
        }}
        className="px-2.5 py-1 rounded-full items-center justify-center"
      >
        <Text
          style={{
            fontFamily: 'DroidArabicKufi',
            color: currentLanguage === 'ar' ? selectedText : colors.mutedForeground,
          }}
          className="text-xs font-bold"
        >
          عربي
        </Text>
      </Pressable>
    </View>
  );
}
