import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { I18nManager, TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, {
  SupportedLanguage,
  LANGUAGE_STORAGE_KEY,
  initLanguageFromStorage,
} from '@/lib/i18n';

interface LanguageContextType {
  currentLanguage: SupportedLanguage;
  isRTL: boolean;
  isArabic: boolean;
  t: (key: string, options?: any) => string;
  changeLanguage: (lang: SupportedLanguage) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  fontFamily: string | undefined;
  getTypography: (variant?: 'regular' | 'bold' | 'extraBold' | 'black' | 'bebas') => TextStyle;
  formatCurrency: (amount: number | string) => string;
  formatHourSlot: (hour24: number) => string;
  formatDateLocalized: (date: Date | string) => { dayName: string; day: string; month: string };
  translateCategory: (category: string) => string;
  translatePosition: (position: string) => string;
  translateFoot: (foot: string) => string;
  translateStatus: (status: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const AR_MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const EN_MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

const AR_DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const EN_DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) || 'en'
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    initLanguageFromStorage().then((lang) => {
      if (isMounted) {
        setCurrentLanguage(lang);
        setIsReady(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const changeLanguage = useCallback(async (lang: SupportedLanguage) => {
    try {
      await i18n.changeLanguage(lang);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setCurrentLanguage(lang);
    } catch (error) {
      console.error('Error switching language:', error);
    }
  }, []);

  const toggleLanguage = useCallback(async () => {
    const nextLang = currentLanguage === 'en' ? 'ar' : 'en';
    await changeLanguage(nextLang);
  }, [currentLanguage, changeLanguage]);

  const isArabic = currentLanguage === 'ar';
  const isRTL = isArabic;

  const fontFamily = isArabic ? 'DroidArabicKufi' : undefined;

  const getTypography = useCallback(
    (variant: 'regular' | 'bold' | 'extraBold' | 'black' | 'bebas' = 'regular'): TextStyle => {
      if (isArabic) {
        return {
          fontFamily: 'DroidArabicKufi',
          writingDirection: 'rtl',
        };
      }

      switch (variant) {
        case 'bebas':
          return { fontFamily: 'BebasNeue_400Regular', writingDirection: 'ltr' };
        case 'black':
          return { fontFamily: 'Montserrat_900Black', writingDirection: 'ltr' };
        case 'extraBold':
          return { fontFamily: 'Montserrat_800ExtraBold', writingDirection: 'ltr' };
        case 'bold':
          return { fontFamily: 'Montserrat_700Bold', writingDirection: 'ltr' };
        case 'regular':
        default:
          return { writingDirection: 'ltr' };
      }
    },
    [isArabic]
  );

  const formatCurrency = useCallback(
    (amount: number | string) => {
      const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
      return isArabic ? `${num} ج.م` : `${num} EGP`;
    },
    [isArabic]
  );

  const formatHourSlot = useCallback(
    (hour24: number) => {
      const normalized = ((hour24 % 24) + 24) % 24;
      const isPM = normalized >= 12 && normalized < 24;
      const period = isArabic ? (isPM ? 'م' : 'ص') : (isPM ? 'PM' : 'AM');
      const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
      const pad = displayHour < 10 ? `0${displayHour}` : `${displayHour}`;
      return `${pad}:00 ${period}`;
    },
    [isArabic]
  );

  const formatDateLocalized = useCallback(
    (dateInput: Date | string) => {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      const dayIndex = d.getDay();
      const monthIndex = d.getMonth();
      const day = String(d.getDate()).padStart(2, '0');

      return {
        dayName: isArabic ? AR_DAY_NAMES[dayIndex] : EN_DAY_NAMES[dayIndex],
        day,
        month: isArabic ? AR_MONTH_NAMES[monthIndex] : EN_MONTH_NAMES[monthIndex],
      };
    },
    [isArabic]
  );

  const translateCategory = useCallback(
    (category: string) => {
      if (!isArabic) return category;
      const upper = category.toUpperCase();
      switch (upper) {
        case 'ALL':
          return 'الكل';
        case 'FOOTBALL':
          return 'كرة قدم';
        case 'PADEL':
          return 'بادل';
        case '5-A-SIDE':
        case '5-A-SIDE ':
          return 'خماسي';
        case '7-A-SIDE':
        case '7-A-SIDE ':
          return 'سباعي';
        case '11-A-SIDE':
        case '11-A-SIDE ':
          return 'قانوني (11)';
        default:
          return category;
      }
    },
    [isArabic]
  );

  const translatePosition = useCallback(
    (position: string) => {
      if (!isArabic) return position;
      const upper = (position || '').toUpperCase();
      switch (upper) {
        case 'CAM':
          return 'صانع ألعاب (CAM)';
        case 'ST':
          return 'مهاجم (ST)';
        case 'RW':
          return 'جناح أيمن (RW)';
        case 'LW':
          return 'جناح أيسر (LW)';
        case 'CM':
          return 'خط وسط (CM)';
        case 'CDM':
          return 'وسط مدافع (CDM)';
        case 'CB':
          return 'مدافع (CB)';
        case 'LB':
          return 'ظهير أيسر (LB)';
        case 'RB':
          return 'ظهير أيمن (RB)';
        case 'GK':
          return 'حارس مرمى (GK)';
        default:
          return position;
      }
    },
    [isArabic]
  );

  const translateFoot = useCallback(
    (foot: string) => {
      if (!isArabic) return foot;
      const upper = (foot || '').toUpperCase();
      switch (upper) {
        case 'RIGHT':
          return 'القدم اليمنى';
        case 'LEFT':
          return 'القدم اليسرى';
        case 'BOTH':
          return 'القدمين معاً';
        default:
          return foot;
      }
    },
    [isArabic]
  );

  const translateStatus = useCallback(
    (status: string) => {
      if (!isArabic) return status;
      const upper = (status || '').toUpperCase();
      switch (upper) {
        case 'CONFIRMED':
          return 'مؤكد';
        case 'PENDING':
          return 'معلق';
        case 'CANCELLED':
        case 'CANCELED':
          return 'ملغي';
        case 'COMPLETED':
          return 'مكتمل';
        default:
          return status;
      }
    },
    [isArabic]
  );

  const contextValue = useMemo(
    () => ({
      currentLanguage,
      isRTL,
      isArabic,
      t: (key: string, options?: any): string => String(t(key as any, options) ?? key),
      changeLanguage,
      toggleLanguage,
      fontFamily,
      getTypography,
      formatCurrency,
      formatHourSlot,
      formatDateLocalized,
      translateCategory,
      translatePosition,
      translateFoot,
      translateStatus,
    }),
    [
      currentLanguage,
      isRTL,
      isArabic,
      t,
      changeLanguage,
      toggleLanguage,
      fontFamily,
      getTypography,
      formatCurrency,
      formatHourSlot,
      formatDateLocalized,
      translateCategory,
      translatePosition,
      translateFoot,
      translateStatus,
    ]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
