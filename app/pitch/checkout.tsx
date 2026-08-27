import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useVenue } from '@/features/venues/api/useVenuesQuery';
import { walletApi } from '@/services/api/walletApi';
import { bookingApi } from '@/services/api/bookingApi';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { PaymentMethodEnum, CreateBookingPayload, Booking } from '@/types';
import { PaymobWebViewCheckout } from '@/components/payment/PaymobWebViewCheckout';
import { BookingResultModal } from '@/features/bookings/components/BookingResultModal';
import { computePaymentSplit } from '@/features/bookings/utils/dateSlotGenerator';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatHourSlot(hour24: number): string {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:00 ${period}`;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const { t, isArabic, formatCurrency } = useLanguage();
  const { colors, isDark } = useTheme();

  const params = useLocalSearchParams<{
    venueId: string;
    date: string;
    startHours: string; // Comma-separated list of startHour24, e.g. "18,19"
  }>();

  const venueId = params.venueId || '';
  const dateStr = params.date || '';
  const startHoursList = useMemo(() => {
    if (!params.startHours) return [];
    return params.startHours
      .split(',')
      .map((h) => parseInt(h.trim(), 10))
      .filter((h) => !isNaN(h))
      .sort((a, b) => a - b);
  }, [params.startHours]);

  const { data: venue, isLoading: isVenueLoading } = useVenue(venueId);

  const [walletBalance, setWalletBalance] = useState<number>(user?.walletBalance ?? 0);
  const [paymentChoice, setPaymentChoice] = useState<'MIN_REQUIRED' | 'FULL' | 'CUSTOM'>('MIN_REQUIRED');
  const [customCardInput, setCustomCardInput] = useState<string>('');
  const [customCardAmount, setCustomCardAmount] = useState<number | undefined>(undefined);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodEnum>(PaymentMethodEnum.paymob);

  // Booking Execution States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [transactionStatus, setTransactionStatus] = useState<'SUCCESS' | 'FAIL' | null>(null);
  const [failureReason, setFailureReason] = useState<string>('');
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  // Paymob WebView States
  const [showPaymobModal, setShowPaymobModal] = useState<boolean>(false);
  const [paymobSession, setPaymobSession] = useState<{ clientSecret: string; publicKey: string } | null>(null);

  // Fetch Live Wallet Balance
  useEffect(() => {
    const fetchWallet = async () => {
      const uId = user?._id || (user as any)?.id;
      if (uId) {
        try {
          const res = await walletApi.getMyWallet(uId);
          if (res && typeof res.balance === 'number') {
            setWalletBalance(res.balance);
          }
        } catch {
          setWalletBalance(user?.walletBalance ?? 0);
        }
      }
    };
    fetchWallet();
  }, [user]);

  // Calculate Slots & Total Price
  const { slotsPayload, totalCost, slotRangeText } = useMemo(() => {
    if (!venue || startHoursList.length === 0) {
      return { slotsPayload: [], totalCost: 0, slotRangeText: '' };
    }

    let calculatedTotal = 0;
    const payload = startHoursList.map((startH) => {
      const endH = startH + 1;
      const customPrice = venue.customHourPrices?.find((p: any) => p.hour === startH);
      const price = customPrice?.pricePerHour || venue.defaultHourPrice || 200;
      calculatedTotal += price;
      return { startTime: startH, endTime: endH };
    });

    const firstH = startHoursList[0];
    const lastH = startHoursList[startHoursList.length - 1] + 1;
    const range = `${formatHourSlot(firstH)} - ${formatHourSlot(lastH)} (${startHoursList.length} ${isArabic ? 'ساعة' : 'Hours'})`;

    return {
      slotsPayload: payload,
      totalCost: calculatedTotal,
      slotRangeText: range,
    };
  }, [venue, startHoursList, isArabic]);

  const depositEnabled = typeof venue?.minimumDepositAmount === 'number' && venue.minimumDepositAmount > 0;
  const effectivePaymentChoice = depositEnabled ? paymentChoice : 'FULL';

  // Compute Full Payment Split
  const split = useMemo(() => {
    return computePaymentSplit({
      walletBalance,
      totalCost,
      minimumDepositAmount: venue?.minimumDepositAmount ?? 0,
      slotsCount: startHoursList.length || 1,
      paymentChoice: effectivePaymentChoice,
      customCardAmount,
    });
  }, [walletBalance, totalCost, venue?.minimumDepositAmount, startHoursList.length, effectivePaymentChoice, customCardAmount]);

  // Handle Custom Card Input change
  const handleCustomInputChange = (text: string) => {
    const numeric = text.replace(/[^0-9]/g, '');
    setCustomCardInput(numeric);
    const parsed = parseInt(numeric, 10);
    if (!isNaN(parsed)) {
      setCustomCardAmount(parsed);
    }
  };

  const handleAdjustCustom = (delta: number) => {
    const currentCard = split.paymobRemainder;
    const nextCard = Math.max(split.minCardRequired, Math.min(split.maxCardAllowed, currentCard + delta));
    setCustomCardInput(String(nextCard));
    setCustomCardAmount(nextCard);
  };

  // Execute Booking Confirmation
  const handleConfirmCheckout = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        isArabic ? 'تسجيل الدخول مطلوب' : 'Authentication Required',
        isArabic ? 'يرجى تسجيل الدخول أولاً لإتمام الحجز.' : 'Please sign in to complete your booking.',
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('auth.login'), onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    if (startHoursList.length === 0 || !venue) {
      Alert.alert(t('common.error'), isArabic ? 'لم يتم تحديد فترات زمنية.' : 'No slots selected.');
      return;
    }

    setIsProcessing(true);
    const idempotencyKey = generateUUID();
    const activeMethod = split.paymobRequired ? PaymentMethodEnum.paymob : PaymentMethodEnum.wallet;

    try {
      const payload: CreateBookingPayload = {
        venueId: venue._id || venue.id,
        date: dateStr,
        slots: slotsPayload,
        startTime: startHoursList[0],
        endTime: startHoursList[startHoursList.length - 1] + 1,
        paymentMethod: activeMethod,
        customAmount: split.targetPaymentAmount,
        walletAmountToUse: split.walletDeduction,
        idempotencyKey,
      };

      const response = await bookingApi.createBooking(payload, idempotencyKey);
      const newBooking =
        response.booking ||
        (response.bookings && response.bookings[0]) ||
        (response as unknown as Booking);

      setCreatedBooking(newBooking);

      if (activeMethod === PaymentMethodEnum.paymob) {
        const clientSecret = response.payment?.clientSecret || response.clientSecret;
        const publicKey = response.payment?.publicKey || response.publicKey;

        if (clientSecret && publicKey) {
          setIsProcessing(false);
          setPaymobSession({ clientSecret, publicKey });
          setShowPaymobModal(true);
        } else {
          // Instant success if mock or test mode
          setIsProcessing(false);
          setTransactionStatus('SUCCESS');
          setShowResultModal(true);
        }
      } else {
        // Wallet only confirmation
        setIsProcessing(false);
        setTransactionStatus('SUCCESS');
        setShowResultModal(true);
      }
    } catch (err: any) {
      setIsProcessing(false);
      setFailureReason(err.message || t('common.somethingWentWrong'));
      setTransactionStatus('FAIL');
      setShowResultModal(true);
    }
  };

  const handlePaymobSuccess = () => {
    setShowPaymobModal(false);
    setTransactionStatus('SUCCESS');
    setShowResultModal(true);
  };

  const handlePaymobFailure = (errorData: any) => {
    setShowPaymobModal(false);
    const reason = typeof errorData === 'string' ? errorData : errorData?.message || 'Payment failed or was cancelled by user';
    setFailureReason(reason);
    setTransactionStatus('FAIL');
    setShowResultModal(true);
  };

  const handleCloseResultModal = () => {
    setShowResultModal(false);
    if (transactionStatus === 'SUCCESS') {
      router.replace('/');
    }
  };

  if (isVenueLoading || !venue) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} className="items-center justify-center">
        <ActivityIndicator size="large" color={isDark ? '#22c55e' : '#16a34a'} />
        <Text style={{ color: colors.mutedForeground }} className="text-xs font-bold mt-3">
          {t('venue.loadingVenue')}
        </Text>
      </View>
    );
  }

  const primaryActionTitle = () => {
    if (isProcessing) {
      return isArabic ? 'جاري التأكيد...' : 'Processing...';
    }
    if (split.paymobRequired) {
      return isArabic
        ? `دفع ${formatCurrency(split.paymobRemainder)} وتأكيد`
        : `Pay ${formatCurrency(split.paymobRemainder)} & Confirm`;
    }
    return isArabic ? 'تأكيد الحجز' : 'Confirm Booking';
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: Math.max(insets.top, 16),
          borderBottomColor: colors.cardBorder,
          backgroundColor: isDark ? '#070b14' : '#ffffff',
        }}
        className={`px-4 pb-3 border-b flex-row items-center justify-between ${
          isArabic ? 'flex-row-reverse' : ''
        }`}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: isDark ? '#141d2e' : '#f1f5f9' }}
          className="h-10 w-10 rounded-full items-center justify-center"
        >
          <Ionicons
            name={isArabic ? 'arrow-forward' : 'arrow-back'}
            size={20}
            color={colors.textPrimary}
          />
        </Pressable>
        <Text
          style={[
            { color: colors.textPrimary },
            isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
          ]}
          className="font-black text-base"
        >
          {isArabic ? 'تأكيد الحجز' : 'Checkout'}
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140, paddingTop: 16 }}
        className="px-4"
      >
        {/* 1. Venue & Match Summary Card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          }}
          className="p-4 rounded-3xl border mb-4 shadow-sm"
        >
          <View className={`flex-row gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <Image
              source={{ uri: venue.images?.[0] || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018' }}
              style={{ width: 70, height: 70, borderRadius: 16 }}
              contentFit="cover"
            />
            <View className={`flex-1 justify-center ${isArabic ? 'items-end' : 'items-start'}`}>
              <Text
                style={[
                  { color: colors.textPrimary },
                  isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                ]}
                className="font-black text-base"
                numberOfLines={1}
              >
                {venue.venueName || venue.name}
              </Text>
              <Text
                style={{ color: colors.mutedForeground }}
                className="text-xs mt-0.5"
                numberOfLines={1}
              >
                {venue.address || 'Cairo, Egypt'}
              </Text>
              <View className="flex-row items-center gap-1.5 mt-1.5">
                <Ionicons name="calendar-outline" size={13} color="#3b82f6" />
                <Text style={{ color: '#3b82f6' }} className="text-xs font-bold font-mono">
                  {dateStr}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={{ borderTopColor: colors.cardBorder }}
            className={`flex-row justify-between items-center pt-3 border-t mt-3 ${
              isArabic ? 'flex-row-reverse' : ''
            }`}
          >
            <View className={`flex-row items-center gap-1.5 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground }} className="text-xs">
                {slotRangeText}
              </Text>
            </View>
            <Text style={{ color: isDark ? '#22c55e' : '#16a34a' }} className="text-sm font-black">
              {formatCurrency(totalCost)}
            </Text>
          </View>
        </View>

        {/* 2. Wallet Balance & Automatic Deduction Card */}
        <View
          style={{
            backgroundColor: split.walletDeduction > 0
              ? isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(22, 163, 74, 0.08)'
              : isDark ? '#0f172a' : '#f8fafc',
            borderColor: split.walletDeduction > 0
              ? isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(22, 163, 74, 0.3)'
              : colors.cardBorder,
          }}
          className="p-4 rounded-3xl border mb-4"
        >
          <View className={`flex-row items-center justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
            <View className={`flex-row items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <View
                style={{ backgroundColor: isDark ? '#141d2e' : '#e2e8f0' }}
                className="h-9 w-9 rounded-full items-center justify-center"
              >
                <Ionicons name="wallet-outline" size={18} color={isDark ? '#22c55e' : '#16a34a'} />
              </View>
              <View className={isArabic ? 'items-end' : 'items-start'}>
                <Text
                  style={[
                    { color: colors.textPrimary },
                    isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                  ]}
                  className="font-bold text-xs"
                >
                  {isArabic ? 'رصيد المحفظة' : 'Wallet Balance'}
                </Text>
                <Text style={{ color: isDark ? '#22c55e' : '#16a34a' }} className="text-sm font-black">
                  {formatCurrency(walletBalance)}
                </Text>
              </View>
            </View>

            {split.walletDeduction > 0 ? (
              <View className="bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                <Text style={{ color: isDark ? '#22c55e' : '#16a34a' }} className="text-[11px] font-black">
                  -{formatCurrency(split.walletDeduction)}
                </Text>
              </View>
            ) : null}
          </View>

          {depositEnabled && !split.walletCoversDeposit && split.minCardRequired > 0 && (
            <View
              style={{ borderTopColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(217, 119, 6, 0.2)' }}
              className={`mt-2.5 pt-2.5 border-t flex-row items-center gap-1.5 ${isArabic ? 'flex-row-reverse' : ''}`}
            >
              <Ionicons name="alert-circle" size={14} color="#f59e0b" />
              <Text style={{ color: '#f59e0b' }} className="text-[11px] font-bold">
                {isArabic
                  ? `يرجى سداد باقي العربون (${formatCurrency(split.minCardRequired)}) بالبطاقة.`
                  : `Please pay remaining deposit (${formatCurrency(split.minCardRequired)}) on card.`}
              </Text>
            </View>
          )}

          {!depositEnabled && split.walletDeduction > 0 && !split.walletCoversFull && (
            <View
              style={{ borderTopColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(22, 163, 74, 0.2)' }}
              className={`mt-2.5 pt-2.5 border-t flex-row items-center gap-1.5 ${isArabic ? 'flex-row-reverse' : ''}`}
            >
              <Ionicons name="checkmark-circle" size={14} color={isDark ? '#22c55e' : '#16a34a'} />
              <Text style={{ color: isDark ? '#22c55e' : '#16a34a' }} className="text-[11px] font-bold">
                {isArabic
                  ? `المتبقي للسداد (${formatCurrency(split.paymobRemainder)}) بالبطاقة.`
                  : `Remaining (${formatCurrency(split.paymobRemainder)}) to pay with card.`}
              </Text>
            </View>
          )}
        </View>

        {depositEnabled && !split.walletCoversFull && (
          <View className="mb-4">
            <Text
              style={[
                { color: colors.textPrimary },
                isArabic ? { fontFamily: 'DroidArabicKufi', textAlign: 'right' } : undefined,
              ]}
              className="font-bold text-sm mb-2.5 px-1"
            >
              {isArabic ? 'طريقة الدفع' : 'Payment Option'}
            </Text>

            {/* Min Deposit Option */}
            <Pressable
              onPress={() => setPaymentChoice('MIN_REQUIRED')}
              style={{
                borderColor: paymentChoice === 'MIN_REQUIRED'
                  ? isDark ? '#22c55e' : '#16a34a'
                  : colors.cardBorder,
                backgroundColor: paymentChoice === 'MIN_REQUIRED'
                  ? isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(22, 163, 74, 0.08)'
                  : colors.card,
              }}
              className={`p-3.5 rounded-2xl border mb-2.5 flex-row items-center justify-between ${
                isArabic ? 'flex-row-reverse' : ''
              }`}
            >
              <View className={`flex-row items-center gap-3 flex-1 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <Ionicons
                  name={paymentChoice === 'MIN_REQUIRED' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={paymentChoice === 'MIN_REQUIRED' ? (isDark ? '#22c55e' : '#16a34a') : colors.mutedForeground}
                />
                <Text
                  style={[
                    { color: colors.textPrimary },
                    isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                  ]}
                  className="font-bold text-xs"
                >
                  {split.walletCoversDeposit
                    ? (isArabic ? 'سداد المتبقي بالملعب' : 'Pay at Venue')
                    : (isArabic ? 'سداد العربون' : 'Pay Deposit')}
                </Text>
              </View>
              <Text style={{ color: isDark ? '#22c55e' : '#16a34a' }} className="text-xs font-black ml-2">
                {split.walletCoversDeposit
                  ? (isArabic ? '0 ج.م كارت' : '0 EGP Card')
                  : formatCurrency(split.minCardRequired)}
              </Text>
            </Pressable>

            {/* Full Payment Option */}
            <Pressable
              onPress={() => setPaymentChoice('FULL')}
              style={{
                borderColor: paymentChoice === 'FULL'
                  ? isDark ? '#22c55e' : '#16a34a'
                  : colors.cardBorder,
                backgroundColor: paymentChoice === 'FULL'
                  ? isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(22, 163, 74, 0.08)'
                  : colors.card,
              }}
              className={`p-3.5 rounded-2xl border mb-2.5 flex-row items-center justify-between ${
                isArabic ? 'flex-row-reverse' : ''
              }`}
            >
              <View className={`flex-row items-center gap-3 flex-1 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <Ionicons
                  name={paymentChoice === 'FULL' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={paymentChoice === 'FULL' ? (isDark ? '#22c55e' : '#16a34a') : colors.mutedForeground}
                />
                <Text
                  style={[
                    { color: colors.textPrimary },
                    isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                  ]}
                  className="font-bold text-xs"
                >
                  {isArabic ? 'دفع كامل المبلغ' : 'Pay Full'}
                </Text>
              </View>
              <Text style={{ color: isDark ? '#22c55e' : '#16a34a' }} className="text-xs font-black ml-2">
                {formatCurrency(split.maxCardAllowed)}
              </Text>
            </Pressable>

            {/* Custom Payment Option */}
            {split.maxCardAllowed > split.minCardRequired && (
              <Pressable
                onPress={() => {
                  setPaymentChoice('CUSTOM');
                  if (!customCardAmount) {
                    setCustomCardAmount(split.minCardRequired);
                  }
                }}
                style={{
                  borderColor: paymentChoice === 'CUSTOM'
                    ? '#3b82f6'
                    : colors.cardBorder,
                  backgroundColor: paymentChoice === 'CUSTOM'
                    ? isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.08)'
                    : colors.card,
                }}
                className="p-3.5 rounded-2xl border mb-2.5"
              >
                <View className={`flex-row items-center justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <View className={`flex-row items-center gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <Ionicons
                      name={paymentChoice === 'CUSTOM' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={paymentChoice === 'CUSTOM' ? '#3b82f6' : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        { color: colors.textPrimary },
                        isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                      ]}
                      className="font-bold text-xs"
                    >
                      {isArabic ? 'مبلغ مخصص' : 'Custom Amount'}
                    </Text>
                  </View>
                </View>

                {paymentChoice === 'CUSTOM' && (
                  <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                    <View className={`flex-row items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <Pressable
                        onPress={() => handleAdjustCustom(-50)}
                        style={{ backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }}
                        className="px-3 py-2 rounded-xl"
                      >
                        <Text className="text-xs font-black text-gray-700 dark:text-gray-300">-50</Text>
                      </Pressable>

                      <View
                        style={{
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                          borderColor: colors.cardBorder,
                        }}
                        className="flex-1 flex-row items-center px-3 py-2 rounded-xl border justify-between"
                      >
                        <TextInput
                          value={customCardInput || String(split.paymobRemainder)}
                          onChangeText={handleCustomInputChange}
                          keyboardType="numeric"
                          style={{
                            color: colors.textPrimary,
                            fontSize: 15,
                            fontWeight: 'bold',
                            flex: 1,
                            textAlign: isArabic ? 'right' : 'left',
                          }}
                          placeholder={String(split.minCardRequired)}
                          placeholderTextColor={colors.mutedForeground}
                        />
                        <Text style={{ color: colors.mutedForeground }} className="text-xs font-bold ml-1">
                          {isArabic ? 'ج.م' : 'EGP'}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => handleAdjustCustom(50)}
                        style={{ backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }}
                        className="px-3 py-2 rounded-xl"
                      >
                        <Text className="text-xs font-black text-gray-700 dark:text-gray-300">+50</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </Pressable>
            )}
          </View>
        )}

        {/* Financial Summary Table */}
        <View
          style={{
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          }}
          className="p-4 rounded-3xl border mb-6 space-y-2.5 shadow-sm"
        >
          <Text
            style={[
              { color: colors.textPrimary },
              isArabic ? { fontFamily: 'DroidArabicKufi', textAlign: 'right' } : undefined,
            ]}
            className="font-bold text-xs uppercase tracking-wider mb-1"
          >
            {isArabic ? 'ملخص الحساب' : 'Summary'}
          </Text>

          <View className={`flex-row justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
            <Text style={{ color: colors.mutedForeground }} className="text-xs">
              {isArabic ? 'إجمالي الحجز' : 'Total'}
            </Text>
            <Text style={{ color: colors.textPrimary }} className="text-xs font-bold">
              {formatCurrency(totalCost)}
            </Text>
          </View>

          {split.walletDeduction > 0 && (
            <View className={`flex-row justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
              <Text style={{ color: isDark ? '#22c55e' : '#16a34a' }} className="text-xs font-semibold">
                {isArabic ? 'المحفظة' : 'Wallet'}
              </Text>
              <Text style={{ color: isDark ? '#22c55e' : '#16a34a' }} className="text-xs font-black">
                -{formatCurrency(split.walletDeduction)}
              </Text>
            </View>
          )}

          {split.paymobRemainder > 0 && (
            <View className={`flex-row justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
              <Text style={{ color: '#3b82f6' }} className="text-xs font-semibold">
                {isArabic ? 'البطاقة' : 'Card'}
              </Text>
              <Text style={{ color: '#3b82f6' }} className="text-xs font-black">
                {formatCurrency(split.paymobRemainder)}
              </Text>
            </View>
          )}

          <View
            style={{ borderTopColor: colors.cardBorder }}
            className={`flex-row justify-between items-center pt-2.5 border-t ${
              isArabic ? 'flex-row-reverse' : ''
            }`}
          >
            <Text style={{ color: colors.textPrimary }} className="text-xs font-bold">
              {isArabic ? 'المدفوع الآن' : 'Paid Now'}
            </Text>
            <Text style={{ color: isDark ? '#22c55e' : '#16a34a' }} className="text-base font-black">
              {formatCurrency(split.targetPaymentAmount)}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: split.remainingAtVenue > 0
                ? isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb'
                : isDark ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4',
              borderColor: split.remainingAtVenue > 0 ? '#f59e0b' : (isDark ? '#22c55e' : '#16a34a'),
            }}
            className={`p-2.5 rounded-xl border flex-row justify-between items-center ${
              isArabic ? 'flex-row-reverse' : ''
            }`}
          >
            <Text
              style={[
                { color: split.remainingAtVenue > 0 ? '#f59e0b' : (isDark ? '#22c55e' : '#16a34a') },
                isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
              ]}
              className="text-xs font-bold"
            >
              {isArabic ? 'المتبقي بالملعب' : 'Due at Venue'}
            </Text>
            <Text
              style={{ color: split.remainingAtVenue > 0 ? '#f59e0b' : (isDark ? '#22c55e' : '#16a34a') }}
              className="text-xs font-black"
            >
              {split.remainingAtVenue > 0
                ? formatCurrency(split.remainingAtVenue)
                : isArabic ? '0 ج.م' : '0 EGP'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View
        style={{
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: isDark ? 'rgba(7, 11, 20, 0.98)' : 'rgba(255, 255, 255, 0.98)',
          borderTopColor: colors.cardBorder,
        }}
        className="border-t p-4 backdrop-blur-lg shadow-2xl"
      >
        <Pressable
          onPress={handleConfirmCheckout}
          disabled={isProcessing}
          style={{
            backgroundColor: isDark ? '#22c55e' : '#16a34a',
            opacity: isProcessing ? 0.7 : 1,
          }}
          className="w-full py-4 rounded-2xl items-center justify-center flex-row gap-2 shadow-lg"
        >
          {isProcessing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons
                name={split.paymobRequired ? 'card-outline' : 'checkmark-circle-outline'}
                size={18}
                color="#ffffff"
              />
              <Text
                style={[
                  { color: '#ffffff' },
                  isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                ]}
                className="text-sm font-black"
              >
                {primaryActionTitle()}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Paymob Intention WebView Checkout Modal */}
      <PaymobWebViewCheckout
        visible={showPaymobModal}
        clientSecret={paymobSession?.clientSecret || ''}
        publicKey={paymobSession?.publicKey || ''}
        headerTitle="Paymob Secure Card Payment"
        headerBackgroundColor={isDark ? '#0f172a' : '#ffffff'}
        headerTextColor={isDark ? '#ffffff' : '#0f172a'}
        onSuccess={handlePaymobSuccess}
        onFailure={handlePaymobFailure}
        onClose={() => setShowPaymobModal(false)}
      />

      {/* Booking Result Success / Fail Modal */}
      <BookingResultModal
        visible={showResultModal}
        status={transactionStatus}
        failureReason={failureReason}
        venueName={venue.venueName || venue.name}
        dateText={dateStr}
        slotTime={slotRangeText}
        totalPrice={totalCost}
        paidAmount={split.targetPaymentAmount}
        remainingAmount={split.remainingAtVenue}
        bookingId={createdBooking?._id}
        bookingCode={createdBooking?.bookingCode}
        qrCode={createdBooking?.qrCode}
        onClose={handleCloseResultModal}
      />
    </View>
  );
}
