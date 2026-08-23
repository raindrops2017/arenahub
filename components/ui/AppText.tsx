import React, { forwardRef } from 'react';
import {
  Text as RNText,
  type TextProps as RNTextProps,
  StyleSheet,
  TextStyle,
} from 'react-native';
import { useLanguage } from '@/context/LanguageContext';

export interface AppTextProps extends RNTextProps {
  className?: string;
  variant?: 'regular' | 'medium' | 'bold' | 'extraBold' | 'black' | 'bebas';
}

const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const containsArabic = (node: any): boolean => {
  if (!node) return false;
  if (typeof node === 'string') return ARABIC_REGEX.test(node);
  if (typeof node === 'number') return false;
  if (Array.isArray(node)) return node.some(containsArabic);
  if (typeof node === 'object' && node.props && node.props.children) {
    return containsArabic(node.props.children);
  }
  return false;
};

// Standard font names matching registered TTF assets on native Android & iOS devices
export const ARABIC_FONT_NAME = 'DroidArabicKufi';

export const AppText = forwardRef<RNText, AppTextProps>(
  ({ style, variant = 'bold', children, className, ...props }, ref) => {
    let isArabic = false;
    try {
      const lang = useLanguage();
      isArabic = lang.isArabic;
    } catch {
      isArabic = false;
    }

    // Auto-detect if current locale is Arabic OR if content contains Arabic characters
    const hasArabicText = isArabic || containsArabic(children);

    const flat = (StyleSheet.flatten(style) as TextStyle) || {};
    const cleanedStyle: TextStyle = { ...flat };

    if (hasArabicText) {
      // 1. Delete any fontWeight and fontStyle that cause React Native to reject custom Arabic font
      delete (cleanedStyle as any).fontWeight;
      delete (cleanedStyle as any).fontStyle;

      // 2. Strip any font-weight or custom English font classes from Tailwind/NativeWind
      const sanitizedClassName = className
        ? className
            .replace(
              /\bfont-(bold|semibold|extrabold|black|medium|light|thin|heading|display|body|sans|serif|mono)\b/g,
              ''
            )
            .trim()
        : undefined;

      return (
        <RNText
          ref={ref}
          className={sanitizedClassName}
          style={[
            cleanedStyle,
            {
              fontFamily: ARABIC_FONT_NAME,
              fontWeight: 'normal' as const,
              fontStyle: 'normal' as const,
              writingDirection: cleanedStyle.writingDirection || 'rtl',
            },
          ]}
          {...props}
        >
          {children}
        </RNText>
      );
    }

    // --- English Typography Resolution for Real Devices ---
    let englishFontFamily = flat.fontFamily;

    // Detect weight from className or style or variant
    const classStr = className || '';
    const styleWeight = String(flat.fontWeight || '').toLowerCase();

    const isBebas = variant === 'bebas' || classStr.includes('font-display');
    const isBlack =
      variant === 'black' ||
      classStr.includes('font-black') ||
      styleWeight === '900';
    const isExtraBold =
      variant === 'extraBold' ||
      classStr.includes('font-extrabold') ||
      classStr.includes('font-heading') ||
      styleWeight === '800';
    const isMedium =
      variant === 'medium' ||
      classStr.includes('font-medium') ||
      styleWeight === '500';
    const isRegular =
      variant === 'regular' ||
      classStr.includes('font-normal') ||
      styleWeight === '400' ||
      styleWeight === 'normal';

    if (!englishFontFamily) {
      if (isBebas) {
        englishFontFamily = 'BebasNeue_400Regular';
      } else if (isBlack) {
        englishFontFamily = 'Montserrat_900Black';
      } else if (isExtraBold) {
        englishFontFamily = 'Montserrat_800ExtraBold';
      } else if (isMedium) {
        englishFontFamily = 'Montserrat_500Medium';
      } else if (isRegular) {
        englishFontFamily = 'Montserrat_400Regular';
      } else {
        // Default English font across the entire app
        englishFontFamily = 'Montserrat_700Bold';
      }
    }

    // Strip fontWeight so native React Native doesn't drop Montserrat looking for a bold sub-variant
    delete (cleanedStyle as any).fontWeight;
    delete (cleanedStyle as any).fontStyle;

    const sanitizedEnglishClass = className
      ? className
          .replace(
            /\bfont-(bold|semibold|extrabold|black|medium|light|thin|heading|display|body)\b/g,
            ''
          )
          .trim()
      : undefined;

    return (
      <RNText
        ref={ref}
        className={sanitizedEnglishClass}
        style={[
          cleanedStyle,
          {
            fontFamily: englishFontFamily,
            fontWeight: 'normal' as const,
            fontStyle: 'normal' as const,
            writingDirection: cleanedStyle.writingDirection || 'ltr',
          },
        ]}
        {...props}
      >
        {children}
      </RNText>
    );
  }
);

AppText.displayName = 'AppText';
export const Text = AppText;
export default AppText;
