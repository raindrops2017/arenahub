import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVenue } from '@/features/venues/api/useVenuesQuery';
import { VenueHeader } from '@/features/venues/components/VenueHeader';
import { VenueAmenities } from '@/features/venues/components/VenueAmenities';
import { DateSelector } from '@/features/bookings/components/DateSelector';
import { SlotPicker } from '@/features/bookings/components/SlotPicker';
import { BookingSummaryFooter } from '@/features/bookings/components/BookingSummaryFooter';
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
  const router = useRouter();
  const {
    availableDates,
    selectedDateIndex,
    setSelectedDateIndex,
    currentDate,
    selectedSlots,
    handleToggleSlot,
    handleClearSlots,
    paymentSplit,
    isProcessing,
  } = useBookingFlow(venue);

  const { isArabic } = useLanguage();
  const { colors } = useTheme();

  const slotSummaryText =
    selectedSlots.length === 1
      ? selectedSlots[0].time
      : selectedSlots.length > 1
      ? isArabic
        ? `${selectedSlots.length} فترات محددة`
        : `${selectedSlots.length} slots selected`
      : undefined;

  const handleNavigateToCheckout = () => {
    if (selectedSlots.length === 0 || !currentDate) return;
    router.push({
      pathname: '/pitch/checkout',
      params: {
        venueId: venue._id || venue.id,
        date: currentDate.date,
        startHours: selectedSlots.map((s) => s.startHour24).join(','),
      },
    });
  };

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
            selectedSlots={selectedSlots}
            onToggleSlot={handleToggleSlot}
            onClearSlots={handleClearSlots}
            defaultPrice={venue.defaultHourPrice}
          />

          <VenueAmenities amenities={venue.amenities} />
        </View>
      </ScrollView>

      <BookingSummaryFooter
        totalPrice={paymentSplit.totalCost}
        targetPaymentAmount={paymentSplit.targetPaymentAmount}
        walletDeduction={paymentSplit.walletDeduction}
        paymobRemainder={paymentSplit.paymobRemainder}
        remainingAtVenue={paymentSplit.remainingAtVenue}
        isDepositPayment={paymentSplit.isDepositPayment}
        minimumDepositAmount={venue.minimumDepositAmount}
        selectedSlotsCount={selectedSlots.length}
        selectedDateText={currentDate?.date}
        selectedSlotTime={slotSummaryText}
        onBookNow={handleNavigateToCheckout}
        isLoading={isProcessing}
        disabled={selectedSlots.length === 0}
      />
    </View>
  );
}
