import React from 'react';
import { View, Modal, Pressable } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { QRCodeWidget } from '@/components/QRCodeWidget';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

interface BookingResultModalProps {
  visible: boolean;
  status: 'SUCCESS' | 'FAIL' | 'PENDING' | null;
  failureReason?: string;
  venueName?: string;
  dateText?: string;
  slotTime?: string;
  totalPrice?: number;
  paidAmount?: number;
  remainingAmount?: number;
  currency?: string;
  bookingId?: string;
  bookingCode?: string;
  qrCode?: string;
  onClose: () => void;
}

export function BookingResultModal({
  visible,
  status,
  failureReason,
  venueName,
  dateText,
  slotTime,
  totalPrice,
  paidAmount,
  remainingAmount,
  bookingId,
  bookingCode,
  qrCode,
  onClose,
}: BookingResultModalProps) {
  const { t, isArabic, formatCurrency } = useLanguage();
  const { colors, isDark } = useTheme();

  if (!visible || !status) return null;

  const isSuccess = status === 'SUCCESS';
  const isBase64Image = qrCode && (qrCode.startsWith('data:image') || qrCode.startsWith('http'));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{ backgroundColor: colors.modalOverlay }}
        className="flex-1 justify-center items-center p-4"
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          }}
          className="border rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl"
        >
          {/* Status Icon */}
          <View
            className={`h-16 w-16 rounded-full items-center justify-center mb-4 ${
              isSuccess
                ? isDark
                  ? 'bg-[#22c55e]/20 border border-[#22c55e]/40'
                  : 'bg-green-100 border border-green-300'
                : isDark
                ? 'bg-red-500/20 border border-red-500/40'
                : 'bg-red-100 border border-red-300'
            }`}
          >
            <Ionicons
              name={isSuccess ? 'checkmark-circle' : 'alert-circle'}
              size={36}
              color={isSuccess ? (isDark ? '#22c55e' : '#16a34a') : '#ef4444'}
            />
          </View>

          {/* Title & Subtitle */}
          <Text
            style={[
              { color: colors.textPrimary },
              isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
            ]}
            className="text-2xl font-black text-center mb-1"
          >
            {isSuccess ? t('booking.bookingSuccess') : t('booking.bookingFailed')}
          </Text>
          <Text
            style={[
              { color: colors.mutedForeground },
              isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
            ]}
            className="text-xs text-center mb-5"
          >
            {isSuccess
              ? (isArabic
                  ? 'تم تأكيد حجزك بنجاح. أظهر الرمز عند الدخول.'
                  : 'Your booking is confirmed. Show this pass at entry.')
              : failureReason || (isArabic ? 'لم يتم إتمام العملية. يرجى المحاولة مجدداً.' : 'Payment failed. Please try again.')}
          </Text>

          {/* QR Code & Match Pass Details for Success */}
          {isSuccess && (
            <View
              style={{
                backgroundColor: isDark ? '#0c1222' : '#f8fafc',
                borderColor: colors.cardBorder,
              }}
              className="items-center mb-6 w-full border rounded-2xl p-4"
            >
              {isBase64Image ? (
                <View className="bg-white p-2 rounded-2xl shadow-sm">
                  <Image
                    source={{ uri: qrCode }}
                    style={{ width: 130, height: 130 }}
                    contentFit="contain"
                  />
                </View>
              ) : (
                <QRCodeWidget
                  value={bookingCode || bookingId || `ARENA-${venueName}-${slotTime}`}
                  size={130}
                />
              )}

              {bookingCode && (
                <View
                  style={{
                    backgroundColor: isDark ? '#141d2e' : '#e2e8f0',
                    borderColor: isDark ? 'rgba(34, 197, 94, 0.4)' : '#16a34a',
                  }}
                  className="mt-3 px-4 py-1.5 rounded-full border"
                >
                  <Text
                    style={[
                      { color: isDark ? '#22c55e' : '#16a34a' },
                      isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                    ]}
                    className="font-black text-sm tracking-widest uppercase"
                  >
                    {isArabic ? `كود الحجز: ${bookingCode}` : `CODE: ${bookingCode}`}
                  </Text>
                </View>
              )}

              <View
                style={{ borderTopColor: colors.cardBorder }}
                className="w-full mt-4 pt-3 border-t flex-col gap-1.5"
              >
                <View className={`flex-row justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <Text
                    style={[
                      { color: colors.mutedForeground },
                      isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                    ]}
                    className="text-xs"
                  >
                    {isArabic ? 'الملعب' : 'Venue'}
                  </Text>
                  <Text
                    style={[
                      { color: colors.textPrimary },
                      isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                    ]}
                    className="text-xs font-bold"
                    numberOfLines={1}
                  >
                    {venueName}
                  </Text>
                </View>

                <View className={`flex-row justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <Text
                    style={[
                      { color: colors.mutedForeground },
                      isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                    ]}
                    className="text-xs"
                  >
                    {isArabic ? 'الموعد' : 'Date & Time'}
                  </Text>
                  <Text
                    style={{ color: colors.textPrimary }}
                    className="text-xs font-bold"
                  >
                    {dateText} • {slotTime}
                  </Text>
                </View>

                {totalPrice !== undefined && (
                  <View className={`flex-row justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <Text
                      style={[
                        { color: colors.mutedForeground },
                        isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                      ]}
                      className="text-xs"
                    >
                      {isArabic ? 'الإجمالي' : 'Total'}
                    </Text>
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-xs font-bold"
                    >
                      {formatCurrency(totalPrice)}
                    </Text>
                  </View>
                )}

                {paidAmount !== undefined && (
                  <View className={`flex-row justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <Text
                      style={[
                        { color: colors.mutedForeground },
                        isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                      ]}
                      className="text-xs"
                    >
                      {isArabic ? 'المدفوع' : 'Paid'}
                    </Text>
                    <Text
                      style={[
                        { color: isDark ? '#22c55e' : '#16a34a' },
                        isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                      ]}
                      className="text-xs font-black"
                    >
                      {formatCurrency(paidAmount)}
                    </Text>
                  </View>
                )}

                {remainingAmount !== undefined && remainingAmount > 0 && (
                  <View className={`flex-row justify-between items-center pt-1 border-t border-dashed ${isDark ? 'border-gray-800' : 'border-gray-200'} ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <Text
                      style={[
                        { color: '#f59e0b' },
                        isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                      ]}
                      className="text-xs font-bold"
                    >
                      {isArabic ? 'المتبقي بالملعب' : 'Due at Venue'}
                    </Text>
                    <View className="bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      <Text
                        style={[
                          { color: '#f59e0b' },
                          isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                        ]}
                        className="text-xs font-black"
                      >
                        {formatCurrency(remainingAmount)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Action Button */}
          <Button
            title={isSuccess ? (isArabic ? 'الرئيسية' : 'Home') : (isArabic ? 'إعادة المحاولة' : 'Try Again')}
            onPress={onClose}
            size="lg"
            className="w-full"
          />
        </View>
      </View>
    </Modal>
  );
}
