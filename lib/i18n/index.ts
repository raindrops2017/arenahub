import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import ar from './ar.json';

export const LANGUAGE_STORAGE_KEY = '@app_language';

export const resources = {
  en: { translation: en },
  ar: { translation: ar },
} as const;

export type SupportedLanguage = 'en' | 'ar';

export const getDeviceLanguage = (): SupportedLanguage => {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const code = locales[0].languageCode?.toLowerCase();
      if (code === 'ar') return 'ar';
    }
  } catch (error) {
    console.warn('Failed to detect device locale', error);
  }
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    compatibilityJSON: 'v4',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export const initLanguageFromStorage = async (): Promise<SupportedLanguage> => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'ar' || saved === 'en') {
      await i18n.changeLanguage(saved);
      return saved;
    }
    const deviceLang = getDeviceLanguage();
    await i18n.changeLanguage(deviceLang);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, deviceLang);
    return deviceLang;
  } catch (error) {
    console.warn('Failed loading language from storage', error);
    return 'en';
  }
};

export default i18n;
