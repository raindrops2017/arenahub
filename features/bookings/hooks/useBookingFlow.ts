import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Venue, PitchDate, TimeSlot } from '@/features/venues/schemas/venue.schema';
import { PaymentMethodEnum, Booking } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { bookingApi } from '@/services/api/bookingApi';
import { walletApi } from '@/services/api/walletApi';
import { socketService, SlotEventData } from '@/services/api/socketService';
import {
  generateFutureBookingDates,
  HourlySlot,
} from '../utils/dateSlotGenerator';
import {
  configurePaymobSDK,
  startNativePaymobCheckout,
  USE_PAYMOB_WEBVIEW,
} from '@/services/paymobService';
import { bookingQueries } from '../api/useBookingsQuery';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useBookingFlow(venue: Venue) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, setPendingBooking, user } = useAuth();

  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<HourlySlot | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodEnum>(
    PaymentMethodEnum.wallet
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [transactionStatus, setTransactionStatus] = useState<
    'SUCCESS' | 'FAIL' | 'PENDING' | null
  >(null);
  const [failureReason, setFailureReason] = useState<string>('');
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(user?.walletBalance ?? 0);
  const [lockedSlots, setLockedSlots] = useState<Record<string, boolean>>({});

  // Modern Paymob Intention WebView state
  const [showPaymobModal, setShowPaymobModal] = useState<boolean>(false);
  const [paymobSession, setPaymobSession] = useState<{
    clientSecret: string;
    publicKey: string;
  } | null>(null);

  // Generate dynamic date slots from live venue operating hours
  const baseAvailableDates: PitchDate[] = useMemo(() => {
    return generateFutureBookingDates(venue, 30);
  }, [venue]);

  // Merge real-time socket locks into slot availability
  const availableDates: PitchDate[] = useMemo(() => {
    return baseAvailableDates.map((dateObj) => ({
      ...dateObj,
      slots: dateObj.slots.map((slot: TimeSlot) => {
        const hourly = slot as HourlySlot;
        const key = `${dateObj.date}_${hourly.startHour24}`;
        const isSocketLocked = lockedSlots[key] === true;
        return {
          ...hourly,
          available: hourly.available && !isSocketLocked,
        };
      }),
    }));
  }, [baseAvailableDates, lockedSlots]);

  const currentDate = availableDates[selectedDateIndex] || availableDates[0];

  // Load user wallet balance
  const loadWallet = useCallback(async () => {
    const userId = user?._id || (user as any)?.id;
    if (userId) {
      try {
        const res = await walletApi.getMyWallet(userId);
        if (res && typeof res.balance === 'number') {
          setWalletBalance(res.balance);
        }
      } catch {
        setWalletBalance(user?.walletBalance ?? 0);
      }
    }
  }, [user]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  // Subscribe to real-time venue slot locks & confirmations
  useEffect(() => {
    const venueId = venue._id || venue.id;
    socketService.joinVenue(venueId);

    // Initial fetch of already booked/held slots
    bookingApi.getAvailability(venueId).then((unavailable) => {
      const initialLocks: Record<string, boolean> = {};
      unavailable.forEach((b) => {
        const d = typeof b.date === 'string' ? b.date.split('T')[0] : new Date(b.date).toISOString().split('T')[0];
        const slotKey = `${d}_${b.startTime}`;
        initialLocks[slotKey] = true;
      });
      setLockedSlots((prev) => ({ ...prev, ...initialLocks }));
    }).catch(console.error);

    const unsubLocked = socketService.onSlotLocked((data: SlotEventData) => {

      if (data.venueId === venueId) {
        const slotKey = `${data.date.split('T')[0]}_${data.startTime}`;
        setLockedSlots((prev) => ({ ...prev, [slotKey]: true }));
      }
    });

    const unsubReleased = socketService.onSlotReleased((data: SlotEventData) => {
      if (data.venueId === venueId) {
        const slotKey = `${data.date.split('T')[0]}_${data.startTime}`;
        setLockedSlots((prev) => {
          const updated = { ...prev };
          delete updated[slotKey];
          return updated;
        });
      }
    });

    const unsubConfirmed = socketService.onBookingConfirmed(
      async (data: SlotEventData) => {
        if (data.venueId === venueId) {
          const slotKey = `${data.date.split('T')[0]}_${data.startTime}`;
          setLockedSlots((prev) => ({ ...prev, [slotKey]: true }));
          await queryClient.invalidateQueries({
            queryKey: bookingQueries.all(),
          });
          await queryClient.invalidateQueries({ queryKey: ['wallet'] });
          await loadWallet();

          // If the confirmed booking matches our active session, close checkout modal and show success
          if (
            createdBooking &&
            (data.bookingId === createdBooking._id ||
              data.bookingId === (createdBooking as any).id)
          ) {
            setShowPaymobModal(false);
            setIsProcessing(false);
            setTransactionStatus('SUCCESS');
            setShowResultModal(true);
          }
        }
      }
    );

    return () => {
      unsubLocked();
      unsubReleased();
      unsubConfirmed();
      socketService.leaveVenue(venueId);
    };
  }, [venue._id, venue.id, createdBooking, queryClient, loadWallet]);

  // Configure native Paymob SDK styling & callbacks
  useEffect(() => {
    configurePaymobSDK(
      async () => {
        setIsProcessing(false);
        setTransactionStatus('SUCCESS');
        setShowResultModal(true);
        await queryClient.invalidateQueries({ queryKey: bookingQueries.all() });
        await queryClient.invalidateQueries({ queryKey: ['wallet'] });
        await loadWallet();
      },
      (msg) => {
        setIsProcessing(false);
        setFailureReason(msg || 'Payment was rejected or cancelled.');
        setTransactionStatus('FAIL');
        setShowResultModal(true);
      },
      () => {
        setIsProcessing(false);
        setFailureReason('Transaction is pending bank approval.');
        setTransactionStatus('PENDING');
        setShowResultModal(true);
      }
    );
  }, [loadWallet, queryClient]);

  const handleBookNow = async () => {
    if (!selectedSlot) {
      Alert.alert('Select Time Slot', 'Please pick an available time slot before booking.');
      return;
    }

    const price = selectedSlot.price ?? venue.defaultHourPrice;

    // Check authentication
    if (!isAuthenticated) {
      setPendingBooking({
        venueId: venue._id || venue.id,
        venueName: venue.venueName || venue.name,
        date: currentDate.date,
        startTime: selectedSlot.startHour24,
        endTime: selectedSlot.endHour24,
        price,
        paymentMethod,
      });
      router.push('/(auth)/login');
      return;
    }

    // Validate wallet balance if choosing wallet
    if (paymentMethod === PaymentMethodEnum.wallet && walletBalance < price) {
      Alert.alert(
        'Insufficient Wallet Balance',
        `Your wallet balance is ${walletBalance} EGP, but this booking is ${price} EGP. Please choose Paymob Card or Cash.`,
        [
          {
            text: 'Use Paymob Card',
            onPress: () => setPaymentMethod(PaymentMethodEnum.paymob),
          },
          {
            text: 'Pay Cash',
            onPress: () => setPaymentMethod(PaymentMethodEnum.cash),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setIsProcessing(true);
    const idempotencyKey = generateUUID();

    try {
      const response = await bookingApi.createBooking(
        {
          venueId: venue._id || venue.id,
          date: currentDate.date,
          startTime: selectedSlot.startHour24,
          endTime: selectedSlot.endHour24,
          paymentMethod,
          idempotencyKey,
        },
        idempotencyKey
      );

      const newBooking = response.booking || (response as unknown as Booking);
      setCreatedBooking(newBooking);

      if (paymentMethod === PaymentMethodEnum.paymob) {
        const clientSecret = response.payment?.clientSecret;
        const publicKey = response.payment?.publicKey;

        if (clientSecret && publicKey) {
          if (USE_PAYMOB_WEBVIEW) {
            // 🚀 Modern Intention Flow (React Native WebView)
            console.log('🎯 Using modern Paymob Intention WebView flow');
            setIsProcessing(false);
            setPaymobSession({ clientSecret, publicKey });
            setShowPaymobModal(true);
          } else {
            // 🏛️ Legacy Fallback Flow (paymob-reactnative-sdk)
            const launched = startNativePaymobCheckout(clientSecret, publicKey);
            if (!launched) {
              setIsProcessing(false);
              Alert.alert(
                'Native Payment Unavailable',
                'Native Paymob SDK is not supported on this device. Please select Wallet or Cash payment.'
              );
            }
          }
        } else {
          throw new Error(
            'Server did not return a valid Paymob checkout session (missing clientSecret or publicKey).'
          );
        }
      } else {
        // Direct wallet debit or cash confirmed booking
        setIsProcessing(false);
        setTransactionStatus('SUCCESS');
        setShowResultModal(true);
        await queryClient.invalidateQueries({ queryKey: bookingQueries.all() });
        await loadWallet();
      }
    } catch (err: any) {
      setIsProcessing(false);
      setFailureReason(err.message || 'An error occurred during booking.');
      setTransactionStatus('FAIL');
      setShowResultModal(true);
    }
  };

  const handlePaymobSuccess = useCallback(
    async (transactionId: string) => {
      console.log('[useBookingFlow] Paymob transaction succeeded locally, verifying with backend...');
      setShowPaymobModal(false);
      setPaymobSession(null);
      setIsProcessing(true);

      if (createdBooking) {
        let isConfirmed = false;
        const bookingId = createdBooking._id || (createdBooking as any).id;
        // Poll for up to 8 seconds
        for (let i = 0; i < 4; i++) {
          try {
            const b = await bookingApi.getBookingById(bookingId);
            if (b.status === 'confirmed') {
              isConfirmed = true;
              break;
            }
          } catch (e) {
            console.warn('[useBookingFlow] Polling error:', e);
          }
          await new Promise((res) => setTimeout(res, 2000));
        }

        setIsProcessing(false);
        if (isConfirmed) {
          setTransactionStatus('SUCCESS');
          setShowResultModal(true);
          await queryClient.invalidateQueries({ queryKey: bookingQueries.all() });
          await queryClient.invalidateQueries({ queryKey: ['wallet'] });
          await loadWallet();
        } else {
          setFailureReason(
            'Payment completed but backend verification is taking longer than expected. Please check your bookings page shortly.'
          );
          setTransactionStatus('PENDING');
          setShowResultModal(true);
        }
      } else {
        setIsProcessing(false);
      }
    },
    [createdBooking, loadWallet, queryClient]
  );

  const handlePaymobFailure = useCallback((errorData: any) => {
    console.warn('[useBookingFlow] Paymob transaction failed or cancelled:', errorData);
    setShowPaymobModal(false);
    setPaymobSession(null);
    setIsProcessing(false);
    setFailureReason(errorData?.message || 'Payment was rejected or cancelled.');
    setTransactionStatus('FAIL');
    setShowResultModal(true);

    if (createdBooking) {
      const bookingId = createdBooking._id || (createdBooking as any).id;
      bookingApi.cancelBooking(bookingId).catch(err => {
        console.warn('Failed to release booking slot:', err);
      });
    }
  }, [createdBooking]);

  const handlePaymobClose = useCallback(() => {
    setShowPaymobModal(false);
    setPaymobSession(null);
    setIsProcessing(false);

    if (createdBooking) {
      const bookingId = createdBooking._id || (createdBooking as any).id;
      bookingApi.cancelBooking(bookingId).catch(err => {
        console.warn('Failed to release booking slot:', err);
      });
    }
  }, [createdBooking]);

  const handleCloseModal = () => {
    setShowResultModal(false);
    if (transactionStatus === 'SUCCESS') {
      router.push('/profile');
    }
  };

  return {
    availableDates,
    selectedDateIndex,
    setSelectedDateIndex,
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
    currentDate,
    handleBookNow,
    handleCloseModal,
    showPaymobModal,
    paymobSession,
    handlePaymobSuccess,
    handlePaymobFailure,
    handlePaymobClose,
  };
}
