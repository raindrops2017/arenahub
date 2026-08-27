import React, { useState, useEffect } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

interface DepositAmountSelectorProps {
  totalCost: number;
  minRequiredDeposit: number;
  paymentOption: 'MIN_DEPOSIT' | 'FULL' | 'CUSTOM';
  onSelectOption: (option: 'MIN_DEPOSIT' | 'FULL' | 'CUSTOM') => void;
  customAmount?: number;
  onChangeCustomAmount: (amount: number) => void;
  targetPaymentAmount: number;
  remainingAtVenue: number;
}

export function DepositAmountSelector({
  totalCost,
  minRequiredDeposit,
  paymentOption,
  onSelectOption,
  customAmount,
  onChangeCustomAmount,
  targetPaymentAmount,
  remainingAtVenue,
}: DepositAmountSelectorProps) {
  const { t, isArabic, formatCurrency } = useLanguage();
  const { colors, isDark } = useTheme();

  const [inputVal, setInputVal] = useState<string>(
    customAmount ? String(customAmount) : String(minRequiredDeposit)
  );

  useEffect(() => {
    if (customAmount !== undefined && customAmount !== null) {
      setInputVal(String(customAmount));
    }
  }, [customAmount]);

  const handleInputChange = (text: string) => {
    const numeric = text.replace(/[^0-9]/g, '');
    setInputVal(numeric);
    const parsed = parseInt(numeric, 10);
    if (!isNaN(parsed)) {
      onChangeCustomAmount(parsed);
    }
  };

  const handleAdjust = (delta: number) => {
    const current = customAmount ?? minRequiredDeposit;
    const next = Math.max(minRequiredDeposit, Math.min(totalCost, current + delta));
    setInputVal(String(next));
    onChangeCustomAmount(next);
  };

  // Only show when there is a deposit option available and totalCost > minRequiredDeposit > 0
  if (minRequiredDeposit >= totalCost || totalCost <= 0 || minRequiredDeposit <= 0) {
    return null;
  }

  const isMin = paymentOption === 'MIN_DEPOSIT';
  const isFull = paymentOption === 'FULL';
  const isCustom = paymentOption === 'CUSTOM';

  return (
    <View className="mb-6 px-4">
      <View className={`flex-row items-center justify-between mb-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
        <View className={`flex-row items-center gap-1.5 ${isArabic ? 'flex-row-reverse' : ''}`}>
          <Ionicons name="cash-outline" size={18} color={isDark ? '#22c55e' : '#16a34a'} />
          <Text
            style={[
              { color: colors.textPrimary },
              isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
            ]}
            className="font-bold text-base"
          >
            {isArabic ? 'مبلغ الدفع' : 'Payment Amount'}
          </Text>
        </View>
        <Text
          style={[
            { color: colors.mutedForeground },
            isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
          ]}
          className="text-xs"
        >
          {isArabic ? `الحد الأدنى: ${formatCurrency(minRequiredDeposit)}` : `Min: ${formatCurrency(minRequiredDeposit)}`}
        </Text>
      </View>

      {/* Preset Option Tabs */}
      <View className={`flex-row gap-2 mb-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
        {/* Min Deposit Option */}
        <Pressable
          onPress={() => onSelectOption('MIN_DEPOSIT')}
          style={{
            borderColor: isMin ? (isDark ? '#22c55e' : '#16a34a') : colors.cardBorder,
            backgroundColor: isMin
              ? isDark
                ? 'rgba(34, 197, 94, 0.12)'
                : 'rgba(22, 163, 74, 0.08)'
              : colors.card,
          }}
          className="flex-1 p-3 rounded-xl border items-center justify-center"
        >
          <Text
            style={[
              { color: isMin ? (isDark ? '#22c55e' : '#16a34a') : colors.textPrimary },
              isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
            ]}
            className="font-bold text-xs text-center"
          >
            {isArabic ? 'العربون' : 'Deposit'}
          </Text>
          <Text
            style={[
              { color: isMin ? (isDark ? '#22c55e' : '#16a34a') : colors.mutedForeground },
              isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
            ]}
            className="text-xs font-black mt-0.5"
          >
            {formatCurrency(minRequiredDeposit)}
          </Text>
        </Pressable>

        {/* Custom Amount Option */}
        <Pressable
          onPress={() => {
            onSelectOption('CUSTOM');
            if (!customAmount) {
              onChangeCustomAmount(minRequiredDeposit);
            }
          }}
          style={{
            borderColor: isCustom ? (isDark ? '#3b82f6' : '#2563eb') : colors.cardBorder,
            backgroundColor: isCustom
              ? isDark
                ? 'rgba(59, 130, 246, 0.12)'
                : 'rgba(37, 99, 235, 0.08)'
              : colors.card,
          }}
          className="flex-1 p-3 rounded-xl border items-center justify-center"
        >
          <Text
            style={[
              { color: isCustom ? (isDark ? '#3b82f6' : '#2563eb') : colors.textPrimary },
              isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
            ]}
            className="font-bold text-xs text-center"
          >
            {isArabic ? 'مخصص' : 'Custom'}
          </Text>
          <Text
            style={[
              { color: isCustom ? (isDark ? '#3b82f6' : '#2563eb') : colors.mutedForeground },
              isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
            ]}
            className="text-xs font-black mt-0.5"
          >
            {isCustom && customAmount ? formatCurrency(customAmount) : (isArabic ? 'المبلغ' : 'Amount')}
          </Text>
        </Pressable>

        {/* Full Payment Option */}
        <Pressable
          onPress={() => onSelectOption('FULL')}
          style={{
            borderColor: isFull ? (isDark ? '#22c55e' : '#16a34a') : colors.cardBorder,
            backgroundColor: isFull
              ? isDark
                ? 'rgba(34, 197, 94, 0.12)'
                : 'rgba(22, 163, 74, 0.08)'
              : colors.card,
          }}
          className="flex-1 p-3 rounded-xl border items-center justify-center"
        >
          <Text
            style={[
              { color: isFull ? (isDark ? '#22c55e' : '#16a34a') : colors.textPrimary },
              isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
            ]}
            className="font-bold text-xs text-center"
          >
            {isArabic ? 'كامل المبلغ' : 'Full Pay'}
          </Text>
          <Text
            style={[
              { color: isFull ? (isDark ? '#22c55e' : '#16a34a') : colors.mutedForeground },
              isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
            ]}
            className="text-xs font-black mt-0.5"
          >
            {formatCurrency(totalCost)}
          </Text>
        </Pressable>
      </View>

      {/* Custom Amount Interactive Input */}
      {isCustom && (
        <View
          style={{
            backgroundColor: isDark ? 'rgba(20, 29, 46, 0.6)' : '#f8fafc',
            borderColor: colors.cardBorder,
          }}
          className="p-3 rounded-2xl border mb-3"
        >
          <View className={`flex-row items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <Pressable
              onPress={() => handleAdjust(-50)}
              style={{ backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }}
              className="px-3 py-2.5 rounded-xl items-center justify-center"
            >
              <Text className="text-sm font-black text-gray-700 dark:text-gray-300">-50</Text>
            </Pressable>

            <View
              style={{
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                borderColor: (customAmount ?? 0) < minRequiredDeposit || (customAmount ?? 0) > totalCost ? '#ef4444' : colors.cardBorder,
              }}
              className="flex-1 flex-row items-center px-3 py-2 rounded-xl border justify-between"
            >
              <TextInput
                value={inputVal}
                onChangeText={handleInputChange}
                keyboardType="numeric"
                style={{
                  color: colors.textPrimary,
                  fontSize: 16,
                  fontWeight: 'bold',
                  flex: 1,
                  textAlign: isArabic ? 'right' : 'left',
                }}
                placeholder={String(minRequiredDeposit)}
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={{ color: colors.mutedForeground }} className="text-xs font-bold ml-1">
                {isArabic ? 'ج.م' : 'EGP'}
              </Text>
            </View>

            <Pressable
              onPress={() => handleAdjust(50)}
              style={{ backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }}
              className="px-3 py-2.5 rounded-xl items-center justify-center"
            >
              <Text className="text-sm font-black text-gray-700 dark:text-gray-300">+50</Text>
            </Pressable>
          </View>

          {(customAmount ?? 0) < minRequiredDeposit && (
            <Text style={{ color: '#ef4444' }} className="text-[11px] font-bold mt-1.5 text-center">
              {isArabic
                ? `الحد الأدنى ${formatCurrency(minRequiredDeposit)}`
                : `Minimum ${formatCurrency(minRequiredDeposit)}`}
            </Text>
          )}
          {(customAmount ?? 0) > totalCost && (
            <Text style={{ color: '#ef4444' }} className="text-[11px] font-bold mt-1.5 text-center">
              {isArabic
                ? `يتجاوز الإجمالي (${formatCurrency(totalCost)})`
                : `Exceeds total (${formatCurrency(totalCost)})`}
            </Text>
          )}
        </View>
      )}

      {/* Financial Breakdown Bar */}
      <View
        style={{
          backgroundColor: isDark ? 'rgba(20, 29, 46, 0.4)' : '#f1f5f9',
          borderColor: colors.cardBorder,
        }}
        className={`flex-row justify-between items-center px-3.5 py-2 rounded-xl border ${isArabic ? 'flex-row-reverse' : ''}`}
      >
        <View className={`flex-row items-center gap-1.5 ${isArabic ? 'flex-row-reverse' : ''}`}>
          <Text
            style={[
              { color: colors.mutedForeground },
              isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
            ]}
            className="text-xs font-medium"
          >
            {isArabic ? 'المدفوع الآن:' : 'Paying Now:'}
          </Text>
          <Text
            style={{ color: isDark ? '#22c55e' : '#16a34a' }}
            className="text-xs font-black"
          >
            {formatCurrency(targetPaymentAmount)}
          </Text>
        </View>

        <View className={`flex-row items-center gap-1.5 ${isArabic ? 'flex-row-reverse' : ''}`}>
          <Text
            style={[
              { color: colors.mutedForeground },
              isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
            ]}
            className="text-xs font-medium"
          >
            {isArabic ? 'المتبقي بالملعب:' : 'Due at Venue:'}
          </Text>
          <Text
            style={{ color: remainingAtVenue > 0 ? '#f59e0b' : (isDark ? '#22c55e' : '#16a34a') }}
            className="text-xs font-black"
          >
            {remainingAtVenue > 0 ? formatCurrency(remainingAtVenue) : (isArabic ? '0 ج.م' : '0 EGP')}
          </Text>
        </View>
      </View>
    </View>
  );
}
