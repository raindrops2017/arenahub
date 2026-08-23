import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { PaymentMethodEnum } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

export type PaymentOption = PaymentMethodEnum;

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentOption;
  onSelectMethod: (method: PaymentOption) => void;
  walletBalance?: number;
  totalPrice?: number;
  currency?: string;
}

export function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
  walletBalance = 0,
  totalPrice = 0,
}: PaymentMethodSelectorProps) {
  const { t, isArabic, formatCurrency } = useLanguage();
  const { colors, isDark } = useTheme();
  const hasSufficientWallet = walletBalance >= totalPrice;

  const options: {
    id: PaymentOption;
    title: string;
    description: string;
    icon: React.ReactNode;
    badge?: string;
    disabled?: boolean;
  }[] = [
    {
      id: PaymentMethodEnum.wallet,
      title: t('booking.payWithWallet'),
      description: isArabic
        ? `الرصيد المتاح: ${formatCurrency(walletBalance)}`
        : `Available Balance: ${formatCurrency(walletBalance)}`,
      icon: <Ionicons name="wallet-outline" size={20} color={isDark ? "#22c55e" : "#16a34a"} />,
      badge: hasSufficientWallet
        ? (isArabic ? 'دفع فوري سريع' : 'Instant 1-Tap')
        : (isArabic ? 'رصيد غير كافٍ' : 'Low Balance'),
      disabled: !hasSufficientWallet,
    },
    {
      id: PaymentMethodEnum.paymob,
      title: t('booking.payWithCard'),
      description: isArabic
        ? 'فيزا، ماستركارد، ميزة ومحافظ إلكترونية'
        : 'Visa, Mastercard, Meeza & Mobile Wallets',
      icon: <Ionicons name="card-outline" size={20} color="#60a5fa" />,
      badge: isArabic ? 'آمن ومباشر' : 'Fast & Secure',
    },
    {
      id: PaymentMethodEnum.cash,
      title: t('booking.payWithCash'),
      description: isArabic
        ? 'الدفع عند الدخول لبوابة الملعب'
        : 'Pay upon entry at the reception desk',
      icon: <FontAwesome5 name="money-bill-wave" size={18} color="#f59e0b" />,
      badge: isArabic ? 'دفع لاحقاً' : 'Pay Later',
    },
  ];

  return (
    <View className="mb-6 px-4">
      <Text
        style={[
          { color: colors.textPrimary },
          isArabic
            ? {
                fontFamily: 'DroidArabicKufi',
                textAlign: 'right',
                writingDirection: 'rtl',
              }
            : undefined,
        ]}
        className="font-bold text-base mb-3"
      >
        {t('booking.selectPayment')}
      </Text>
      <View className="flex-col gap-2.5">
        {options.map((option) => {
          const isSelected = selectedMethod === option.id;
          const isDisabled = option.disabled;

          const optionBg = isSelected
            ? isDark
              ? 'rgba(34, 197, 94, 0.1)'
              : 'rgba(22, 163, 74, 0.08)'
            : isDisabled
            ? isDark
              ? 'rgba(7, 11, 20, 0.5)'
              : '#f1f5f9'
            : colors.card;

          const optionBorder = isSelected
            ? isDark
              ? '#22c55e'
              : '#16a34a'
            : colors.cardBorder;

          return (
            <Pressable
              key={option.id}
              disabled={isDisabled}
              onPress={() => onSelectMethod(option.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected, disabled: isDisabled }}
              style={[
                styles.optionBase,
                isArabic && styles.optionBaseAr,
                {
                  backgroundColor: optionBg,
                  borderColor: optionBorder,
                  opacity: isDisabled ? 0.5 : 1,
                },
              ]}
              className="will-change-variable shadow-sm"
            >
              <View
                className={`flex-row items-center flex-1 ${
                  isArabic ? 'ml-2 flex-row-reverse' : 'mr-2'
                }`}
              >
                <View
                  style={{
                    backgroundColor: isDark ? '#141d2e' : '#f1f5f9',
                  }}
                  className={`h-10 w-10 rounded-xl items-center justify-center ${
                    isArabic ? 'ml-3' : 'mr-3'
                  }`}
                >
                  {option.icon}
                </View>
                <View className={`flex-1 ${isArabic ? 'items-end' : 'items-start'}`}>
                  <View
                    className={`flex-row items-center gap-2 ${
                      isArabic ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <Text
                      style={[
                        { color: colors.textPrimary },
                        isArabic
                          ? { fontFamily: 'DroidArabicKufi', textAlign: 'right' }
                          : undefined,
                      ]}
                      className="font-bold text-sm"
                    >
                      {option.title}
                    </Text>
                    {option.badge && (
                      <View
                        style={{
                          backgroundColor: isDark ? '#141d2e' : '#f1f5f9',
                        }}
                        className="px-2 py-0.5 rounded-md"
                      >
                        <Text
                          style={[
                            isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                            {
                              color:
                                option.id === PaymentMethodEnum.wallet
                                  ? hasSufficientWallet
                                    ? isDark ? '#22c55e' : '#16a34a'
                                    : '#f59e0b'
                                  : option.id === PaymentMethodEnum.paymob
                                  ? '#3b82f6'
                                  : '#f59e0b',
                            },
                          ]}
                          className="text-[10px] font-semibold"
                        >
                          {option.badge}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      { color: colors.mutedForeground },
                      isArabic
                        ? { fontFamily: 'DroidArabicKufi', textAlign: 'right' }
                        : undefined,
                    ]}
                    className="text-xs mt-0.5"
                  >
                    {option.description}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.radioOuter,
                  {
                    borderColor: isSelected
                      ? isDark
                        ? '#22c55e'
                        : '#16a34a'
                      : colors.mutedForeground,
                    backgroundColor: isSelected
                      ? isDark
                        ? '#22c55e'
                        : '#16a34a'
                      : 'transparent',
                  },
                ]}
              >
                {isSelected && (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: isDark ? '#04060c' : '#ffffff' },
                    ]}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  optionBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  optionBaseAr: {
    flexDirection: 'row-reverse',
  },
  radioOuter: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },
});
