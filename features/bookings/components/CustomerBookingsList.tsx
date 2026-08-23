import React, { useState } from 'react';
import { View, Pressable, Modal, Alert, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Booking, BookingStatusEnum, PaymentMethodEnum } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { QRCodeWidget } from '@/components/QRCodeWidget';
import { bookingApi } from '@/services/api/bookingApi';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

interface CustomerBookingsListProps {
  bookings: Booking[];
  onRefresh?: () => void;
}

export function CustomerBookingsList({
  bookings,
  onRefresh,
}: CustomerBookingsListProps) {
  const { t, isArabic, formatCurrency, formatHourSlot, translateStatus } = useLanguage();
  const { colors, isDark } = useTheme();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  if (!bookings || bookings.length === 0) {
    return (
      <View
        style={{
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        }}
        className="border rounded-3xl p-6 items-center justify-center mb-6 mx-5 shadow-sm"
      >
        <View
          style={{ backgroundColor: isDark ? '#141d2e' : '#f1f5f9' }}
          className="h-14 w-14 rounded-full items-center justify-center mb-3"
        >
          <Ionicons name="calendar-outline" size={28} color={colors.mutedForeground} />
        </View>
        <Text
          style={[
            { color: colors.textPrimary },
            isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
          ]}
          className="text-sm font-black uppercase tracking-wider"
        >
          {t('booking.noBookings')}
        </Text>
        <Text
          style={[
            { color: colors.mutedForeground },
            isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
          ]}
          className="text-xs text-center mt-1 leading-relaxed"
        >
          {t('booking.noBookingsSub')}
        </Text>
      </View>
    );
  }

  const handleCancelBooking = async (bookingId: string) => {
    Alert.alert(
      t('booking.cancelBooking'),
      t('booking.cancelBookingConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              await bookingApi.cancelBooking(bookingId);
              setIsCancelling(false);
              setSelectedBooking(null);
              Alert.alert(t('common.success'), isArabic ? 'تم إلغاء الحجز واسترداد الرصيد.' : 'Booking cancelled and slot released.');
              if (onRefresh) onRefresh();
            } catch (err: any) {
              setIsCancelling(false);
              Alert.alert(t('common.error'), err.message || t('common.somethingWentWrong'));
            }
          },
        },
      ]
    );
  };

  return (
    <View className="mb-6 px-5">
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
        className="font-black text-base uppercase tracking-wider mb-3"
      >
        {t('booking.myBookings')}
      </Text>
      <View className="flex-col gap-3">
        {bookings.map((booking) => {
          const venueName =
            typeof booking.venueId === 'object' && booking.venueId !== null
              ? (booking.venueId as any).venueName
              : (isArabic ? 'ملعب رياضي' : 'Sports Arena');

          const isConfirmed = booking.status === BookingStatusEnum.confirmed;
          const isCancelled = booking.status === BookingStatusEnum.cancelled;

          const dateDisplay = typeof booking.date === 'string' ? booking.date.split('T')[0] : (isArabic ? 'اليوم' : 'Today');
          const timeDisplay = `${formatHourSlot(booking.startTime)} - ${formatHourSlot(booking.endTime)}`;

          return (
            <Pressable
              key={booking._id}
              onPress={() => setSelectedBooking(booking)}
              style={{
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              }}
              className="border rounded-3xl p-4 active:opacity-90 shadow-sm"
            >
              <View
                className={`flex-row justify-between items-start mb-2 ${
                  isArabic ? 'flex-row-reverse' : ''
                }`}
              >
                <View className={`flex-1 ${isArabic ? 'ml-2 items-end' : 'mr-2 items-start'}`}>
                  <Text
                    style={[
                      { color: colors.textPrimary },
                      isArabic
                        ? { fontFamily: 'DroidArabicKufi', textAlign: 'right' }
                        : undefined,
                    ]}
                    className="font-black text-base"
                    numberOfLines={1}
                  >
                    {venueName}
                  </Text>
                  <Text
                    style={[
                      { color: colors.mutedForeground },
                      isArabic
                        ? { fontFamily: 'DroidArabicKufi', textAlign: 'right' }
                        : undefined,
                    ]}
                    className="text-xs mt-0.5"
                  >
                    {dateDisplay} • {timeDisplay}
                  </Text>
                </View>
                <Badge
                  variant={isConfirmed ? 'default' : isCancelled ? 'destructive' : 'secondary'}
                  label={translateStatus(booking.status || 'CONFIRMED')}
                />
              </View>

              <View
                style={{ borderTopColor: colors.cardBorder }}
                className={`flex-row justify-between items-center pt-2.5 border-t mt-1 ${
                  isArabic ? 'flex-row-reverse' : ''
                }`}
              >
                <View className={`flex-row items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <Text
                    style={[
                      { color: colors.mutedForeground },
                      isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                    ]}
                    className="text-xs"
                  >
                    {isArabic ? 'المبلغ: ' : 'Price: '}
                    <Text
                      style={{ color: isDark ? '#22c55e' : '#16a34a' }}
                      className="font-black"
                    >
                      {formatCurrency(booking.totalPrice)}
                    </Text>
                  </Text>
                  {booking.bookingCode && (
                    <View
                      style={{ backgroundColor: isDark ? '#141d2e' : '#f1f5f9' }}
                      className="px-2 py-0.5 rounded-md"
                    >
                      <Text
                        style={{ color: isDark ? '#22c55e' : '#16a34a' }}
                        className="text-[10px] font-extrabold uppercase"
                      >
                        {booking.bookingCode}
                      </Text>
                    </View>
                  )}
                </View>
                <View className={`flex-row items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <Ionicons name="qr-code-outline" size={15} color="#3b82f6" />
                  <Text
                    style={[
                      { color: '#3b82f6' },
                      isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                    ]}
                    className={`text-xs font-bold ${isArabic ? 'mr-1' : 'ml-1'}`}
                  >
                    {isArabic ? 'عرض التذكرة' : 'View Ticket'}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Ticket Details & Live QR Modal */}
      {selectedBooking && (
        <Modal
          visible={!!selectedBooking}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedBooking(null)}
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
              <View
                className={`flex-row justify-between items-center w-full mb-4 ${
                  isArabic ? 'flex-row-reverse' : ''
                }`}
              >
                <Text
                  style={[
                    { color: colors.textPrimary },
                    isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                  ]}
                  className="font-black text-lg uppercase tracking-wider"
                >
                  {isArabic ? 'تذكرة دخول المباراة' : 'Match Entry Pass'}
                </Text>
                <Pressable
                  onPress={() => setSelectedBooking(null)}
                  style={{ backgroundColor: isDark ? '#141d2e' : '#f1f5f9' }}
                  className="h-8 w-8 rounded-full items-center justify-center"
                >
                  <Ionicons name="close" size={18} color={colors.textPrimary} />
                </Pressable>
              </View>

              {/* QR Code Container */}
              <View
                style={{
                  backgroundColor: isDark ? '#0c1222' : '#f8fafc',
                  borderColor: colors.cardBorder,
                }}
                className="items-center mb-5 w-full border rounded-2xl p-4"
              >
                {selectedBooking.qrCode &&
                (selectedBooking.qrCode.startsWith('data:image') ||
                  selectedBooking.qrCode.startsWith('http')) ? (
                  <View className="bg-white p-2 rounded-2xl shadow-sm">
                    <Image
                      source={{ uri: selectedBooking.qrCode }}
                      style={{ width: 140, height: 140 }}
                      contentFit="contain"
                    />
                  </View>
                ) : (
                  <QRCodeWidget
                    value={
                      selectedBooking.bookingCode ||
                      selectedBooking._id ||
                      'ARENA_TICKET'
                    }
                    size={140}
                  />
                )}

                {selectedBooking.bookingCode && (
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
                      {isArabic ? `كود الحجز: ${selectedBooking.bookingCode}` : `CODE: ${selectedBooking.bookingCode}`}
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
                      {isArabic ? 'التاريخ' : 'Date'}
                    </Text>
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-xs font-bold"
                    >
                      {typeof selectedBooking.date === 'string'
                        ? selectedBooking.date.split('T')[0]
                        : (isArabic ? 'اليوم' : 'Today')}
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
                      {isArabic ? 'الموعد' : 'Time'}
                    </Text>
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-xs font-bold"
                    >
                      {formatHourSlot(selectedBooking.startTime)} -{' '}
                      {formatHourSlot(selectedBooking.endTime)}
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
                      {isArabic ? 'طريقة الدفع' : 'Payment Method'}
                    </Text>
                    <Text
                      style={[
                        { color: colors.textPrimary },
                        isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                      ]}
                      className="text-xs font-bold uppercase"
                    >
                      {selectedBooking.paymentMethod === PaymentMethodEnum.wallet || (selectedBooking.paymentMethod as string) === 'wallet'
                        ? (isArabic ? 'المحفظة' : 'WALLET')
                        : selectedBooking.paymentMethod === PaymentMethodEnum.paymob || (selectedBooking.paymentMethod as string) === 'paymob'
                        ? (isArabic ? 'بطاقة بنكية' : 'CARD (PAYMOB)')
                        : (isArabic ? 'كاش في الملعب' : 'CASH')}
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
                      {t('booking.totalAmount')}
                    </Text>
                    <Text
                      style={[
                        { color: isDark ? '#22c55e' : '#16a34a' },
                        isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                      ]}
                      className="text-xs font-black"
                    >
                      {formatCurrency(selectedBooking.totalPrice)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              {selectedBooking.status === BookingStatusEnum.confirmed && (
                <Button
                  title={isCancelling ? t('common.saving') : t('booking.cancelBooking')}
                  variant="destructive"
                  onPress={() => handleCancelBooking(selectedBooking._id)}
                  disabled={isCancelling}
                  className="w-full mb-2"
                />
              )}

              <Button
                title={t('common.close')}
                variant="secondary"
                onPress={() => setSelectedBooking(null)}
                className="w-full"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
