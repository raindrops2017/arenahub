import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVenue } from '@/features/venues/api/useVenuesQuery';
import { VenueHeader } from '@/features/venues/components/VenueHeader';
import { VenueAmenities } from '@/features/venues/components/VenueAmenities';
import { DateSelector } from '@/features/bookings/components/DateSelector';
import { SlotPicker } from '@/features/bookings/components/SlotPicker';
import { PaymentMethodSelector } from '@/features/bookings/components/PaymentMethodSelector';
import { BookingSummaryFooter } from '@/features/bookings/components/BookingSummaryFooter';
import { BookingResultModal } from '@/features/bookings/components/BookingResultModal';
import { PaymobWebViewCheckout } from '@/components/payment/PaymobWebViewCheckout';
import { useBookingFlow } from '@/features/bookings/hooks/useBookingFlow';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

export default function PitchDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, isArabic } = useLanguage();
  const { colors, isDark } = useTheme();

  // Fetch live venue by ID from NestJS server
  const { data: venue, isLoading } = useVenue(id || '');
  if (isLoading || !venue) {
    return (
      <View
        style={{ backgroundColor: colors.background }}
        className="flex-1 items-center justify-center"
      >
        <ActivityIndicator size="large" color={isDark ? "#22c55e" : "#16a34a"} />
        <Text
          style={[
            { color: colors.mutedForeground },
            isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
          ]}
          className="text-xs font-bold mt-3 uppercase tracking-wider"
        >
          {t('venue.loadingVenue')}
        </Text>
      </View>
    );
  }

  return <PitchDetailsContent venue={venue} onBack={() => router.back()} />;
}

function PitchDetailsContent({
  venue,
  onBack,
}: {
  venue: any;
  onBack: () => void;
}) {
  const {
    availableDates,
    selectedDateIndex,
    setSelectedDateIndex,
    currentDate,
    selectedSlot,
    setSelectedSlot,
    paymentMethod,
    setPaymentMethod,
    isProcessing,
    showResultModal,
    transactionStatus,
    failureReason,
    createdBooking,
    walletBalance,
    handleBookNow,
    handleCloseModal,
    showPaymobModal,
    paymobSession,
    handlePaymobSuccess,
    handlePaymobFailure,
    handlePaymobClose,
  } = useBookingFlow(venue);

  const { colors, isDark } = useTheme();
  const currentPrice = selectedSlot?.price ?? venue.defaultHourPrice;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <VenueHeader venue={venue} onBack={onBack} />

        <View className="pt-4">
          <DateSelector
            dates={availableDates}
            selectedIndex={selectedDateIndex}
            onSelectDate={setSelectedDateIndex}
          />

          <SlotPicker
            slots={currentDate?.slots || []}
            selectedSlotTime={selectedSlot?.time}
            onSelectSlot={(slot) => setSelectedSlot(slot as any)}
            defaultPrice={venue.defaultHourPrice}
          />

          <VenueAmenities amenities={venue.amenities} />

          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onSelectMethod={setPaymentMethod}
            walletBalance={walletBalance}
            totalPrice={currentPrice}
          />
        </View>
      </ScrollView>

      <BookingSummaryFooter
        totalPrice={currentPrice}
        selectedDateText={currentDate?.date}
        selectedSlotTime={selectedSlot?.time}
        onBookNow={handleBookNow}
        isLoading={isProcessing}
        disabled={!selectedSlot || selectedSlot.available === false}
      />

      {/* Modern Paymob Intention WebView Modal Checkout */}
      <PaymobWebViewCheckout
        visible={showPaymobModal}
        clientSecret={paymobSession?.clientSecret || ''}
        publicKey={paymobSession?.publicKey || ''}
        headerTitle="Paymob Secure Payment"
        headerBackgroundColor={isDark ? '#0f172a' : '#ffffff'}
        headerTextColor={isDark ? '#ffffff' : '#0f172a'}
        loadingIndicatorColor={isDark ? '#22c55e' : '#16a34a'}
        onSuccess={handlePaymobSuccess}
        onFailure={handlePaymobFailure}
        onClose={handlePaymobClose}
      />

      <BookingResultModal
        visible={showResultModal}
        status={transactionStatus}
        failureReason={failureReason}
        venueName={venue.venueName || venue.name}
        dateText={currentDate?.date}
        slotTime={selectedSlot?.time}
        totalPrice={currentPrice}
        bookingId={createdBooking?._id}
        bookingCode={createdBooking?.bookingCode}
        qrCode={createdBooking?.qrCode}
        onClose={handleCloseModal}
      />
    </View>
  );
}
