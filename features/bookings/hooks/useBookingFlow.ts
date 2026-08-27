import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Venue, PitchDate, TimeSlot } from '@/features/venues/schemas/venue.schema';
import { PaymentMethodEnum, Booking, CreateBookingPayload } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { bookingApi } from '@/services/api/bookingApi';
import { walletApi } from '@/services/api/walletApi';
import { socketService, SlotEventData } from '@/services/api/socketService';
import {
  generateFutureBookingDates,
  HourlySlot,
  normalizeDateString,
  computePaymentSplit,
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
  const [selectedSlots, setSelectedSlots] = useState<HourlySlot[]>([]);
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

  // Multi-slot selection handlers
  const handleToggleSlot = useCallback((slot: HourlySlot) => {
    setSelectedSlots((prev) => {
      const exists = prev.some(
        (s) =>
          s.id === slot.id ||
          (s.startHour24 === slot.startHour24 && s.endHour24 === slot.endHour24)
      );
      if (exists) {
        return prev.filter(
          (s) =>
            !(
              s.id === slot.id ||
              (s.startHour24 === slot.startHour24 && s.endHour24 === slot.endHour24)
            )
        );
      }
      return [...prev, slot].sort((a, b) => a.startHour24 - b.startHour24);
    });
  }, []);

  const handleClearSlots = useCallback(() => {
    setSelectedSlots([]);
  }, []);

  const handleSelectDate = useCallback((index: number) => {
    setSelectedDateIndex(index);
    setSelectedSlots([]); // Clear slots when switching dates to enforce single-date reservations
  }, []);

  // Backward compatibility alias for single slot
  const selectedSlot = selectedSlots[0] || null;
  const setSelectedSlot = useCallback((slot: HourlySlot | null) => {
    if (slot) {
      setSelectedSlots([slot]);
    } else {
      setSelectedSlots([]);
    }
  }, []);

  // Total cost and payment split calculation
  const totalCost = useMemo(() => {
    return selectedSlots.reduce(
      (sum, s) => sum + (s.price ?? venue.defaultHourPrice),
      0
    );
  }, [selectedSlots, venue.defaultHourPrice]);

  const [paymentChoice, setPaymentChoice] = useState<'MIN_REQUIRED' | 'FULL' | 'CUSTOM'>('MIN_REQUIRED');
  const [customCardAmount, setCustomCardAmount] = useState<number | undefined>(undefined);

  const depositEnabled = typeof venue.minimumDepositAmount === 'number' && venue.minimumDepositAmount > 0;
  const effectivePaymentChoice = depositEnabled ? paymentChoice : 'FULL';

  const paymentSplit = useMemo(() => {
    return computePaymentSplit({
      walletBalance,
      totalCost,
      minimumDepositAmount: venue.minimumDepositAmount ?? 0,
      slotsCount: selectedSlots.length || 1,
      paymentChoice: effectivePaymentChoice,
      customCardAmount,
    });
  }, [walletBalance, totalCost, venue.minimumDepositAmount, selectedSlots.length, effectivePaymentChoice, customCardAmount]);

  const activePaymentMethod = paymentSplit.paymobRequired
    ? PaymentMethodEnum.paymob
    : PaymentMethodEnum.wallet;

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

  // Ref to track createdBooking without causing useEffect re-runs
  const createdBookingRef = useRef<Booking | null>(null);
  useEffect(() => {
    createdBookingRef.current = createdBooking;
  }, [createdBooking]);

  // Fetch booked/held slots from backend API
  const fetchAvailability = useCallback(async () => {
    const venueId = venue._id || venue.id;
    if (!venueId) return;
    try {
      const unavailable = await bookingApi.getAvailability(venueId);
      const locks: Record<string, boolean> = {};
      if (Array.isArray(unavailable)) {
        unavailable.forEach((b) => {
          const d = normalizeDateString(b.date);
          const startH = Number(b.startTime);
          const endH = Number(
            b.endTime && b.endTime > startH ? b.endTime : startH + 1
          );
          for (let h = startH; h < endH; h++) {
            locks[`${d}_${h}`] = true;
          }
        });
      }
      setLockedSlots(locks);
    } catch (err) {
      console.error('[useBookingFlow] Failed to fetch availability:', err);
    }
  }, [venue._id, venue.id]);

  // Initial availability fetch + refetch when date changes
  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability, selectedDateIndex]);

  // Subscribe to real-time venue slot locks & confirmations
  useEffect(() => {
    const venueId = venue._id || venue.id;
    socketService.joinVenue(venueId);

    const unsubLocked = socketService.onSlotLocked((data: SlotEventData) => {
      if (data.venueId === venueId) {
        const d = normalizeDateString(data.date);
        const startH = Number(data.startTime);
        const endH = Number(
          (data as any).endTime && (data as any).endTime > startH
            ? (data as any).endTime
            : startH + 1
        );
        const newLocks: Record<string, boolean> = {};
        for (let h = startH; h < endH; h++) {
          newLocks[`${d}_${h}`] = true;
        }
        setLockedSlots((prev) => ({ ...prev, ...newLocks }));
      }
    });

    const unsubReleased = socketService.onSlotReleased((data: SlotEventData) => {
      if (data.venueId === venueId) {
        const d = normalizeDateString(data.date);
        const startH = Number(data.startTime);
        const endH = Number(
          (data as any).endTime && (data as any).endTime > startH
            ? (data as any).endTime
            : startH + 1
        );
        setLockedSlots((prev) => {
          const updated = { ...prev };
          for (let h = startH; h < endH; h++) {
            delete updated[`${d}_${h}`];
          }
          return updated;
        });
      }
    });

    const unsubConfirmed = socketService.onBookingConfirmed(
      async (data: SlotEventData) => {
        if (data.venueId === venueId) {
          const d = normalizeDateString(data.date);
          const startH = Number(data.startTime);
          const endH = Number(
            (data as any).endTime && (data as any).endTime > startH
              ? (data as any).endTime
              : startH + 1
          );
          const newLocks: Record<string, boolean> = {};
          for (let h = startH; h < endH; h++) {
            newLocks[`${d}_${h}`] = true;
          }
          setLockedSlots((prev) => ({ ...prev, ...newLocks }));
          await queryClient.invalidateQueries({
            queryKey: bookingQueries.all(),
          });
          await queryClient.invalidateQueries({ queryKey: ['wallet'] });
          await loadWallet();

          // If the confirmed booking matches our active session, close checkout modal and show success
          const currentBooking = createdBookingRef.current;
          if (
            currentBooking &&
            (data.bookingId === currentBooking._id ||
              data.bookingId === (currentBooking as any).id ||
              (data as any).groupId === (currentBooking as any).groupId)
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
  }, [venue._id, venue.id, queryClient, loadWallet]);

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
    if (selectedSlots.length === 0) {
      Alert.alert(
        'Select Time Slot',
        'Please pick at least one available time slot before booking.'
      );
      return;
    }

    const slotsPayload = selectedSlots.map((s) => ({
      startTime: s.startHour24,
      endTime: s.endHour24,
    }));

    // Check authentication
    if (!isAuthenticated) {
      setPendingBooking({
        venueId: venue._id || venue.id,
        venueName: venue.venueName || venue.name,
        date: currentDate.date,
        slots: slotsPayload,
        startTime: selectedSlots[0].startHour24,
        endTime: selectedSlots[selectedSlots.length - 1].endHour24,
        price: totalCost,
        paymentMethod: activePaymentMethod,
      });
      router.push('/(auth)/login');
      return;
    }

    setIsProcessing(true);
    const idempotencyKey = generateUUID();

    try {
      const payload: CreateBookingPayload = {
        venueId: venue._id || venue.id,
        date: currentDate.date,
        slots: slotsPayload,
        startTime: selectedSlots[0].startHour24,
        endTime: selectedSlots[selectedSlots.length - 1].endHour24,
        paymentMethod: activePaymentMethod,
        customAmount: paymentSplit.targetPaymentAmount,
        walletAmountToUse: paymentSplit.walletDeduction,
        idempotencyKey,
      };

      const response = await bookingApi.createBooking(payload, idempotencyKey);

      const newBooking =
        response.booking ||
        (response.bookings && response.bookings[0]) ||
        (response as unknown as Booking);
      setCreatedBooking(newBooking);

      if (activePaymentMethod === PaymentMethodEnum.paymob) {
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
                'Native Paymob SDK is not supported on this device. Booking failed.'
              );
            }
          }
        } else {
          throw new Error(
            'Server did not return a valid Paymob checkout session (missing clientSecret or publicKey).'
          );
        }
      } else {
        // Direct wallet auto-deducted confirmed booking
        setIsProcessing(false);
        setTransactionStatus('SUCCESS');
        setShowResultModal(true);
        await queryClient.invalidateQueries({ queryKey: bookingQueries.all() });
        await queryClient.invalidateQueries({ queryKey: ['wallet'] });
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
    async (transactionId: string, params?: Record<string, string>) => {
      console.log(
        '[useBookingFlow] Paymob transaction succeeded locally, verifying with backend...'
      );
      setShowPaymobModal(false);
      setPaymobSession(null);
      setIsProcessing(true);

      if (createdBooking) {
        if (__DEV__ && params) {
          try {
            console.log('[useBookingFlow] Simulating webhook on local dev environment');
            await bookingApi.simulateWebhook(params);
            // Give backend a moment to process before we poll
            await new Promise((res) => setTimeout(res, 1000));
          } catch (e) {
            console.warn('[useBookingFlow] Failed to simulate webhook', e);
          }
        }

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
          await queryClient.invalidateQueries({
            queryKey: bookingQueries.all(),
          });
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

  const handlePaymobFailure = useCallback(
    (errorData: any) => {
      console.warn(
        '[useBookingFlow] Paymob transaction failed or cancelled:',
        errorData
      );
      setShowPaymobModal(false);
      setPaymobSession(null);
      setIsProcessing(false);
      setFailureReason(
        errorData?.message || 'Payment was rejected or cancelled.'
      );
      setTransactionStatus('FAIL');
      setShowResultModal(true);

      if (createdBooking) {
        const bookingId = createdBooking._id || (createdBooking as any).id;
        bookingApi.cancelBooking(bookingId).catch((err) => {
          console.warn('Failed to release booking slot:', err);
        });
      }
    },
    [createdBooking]
  );

  const handlePaymobClose = useCallback(() => {
    setShowPaymobModal(false);
    setPaymobSession(null);
    setIsProcessing(false);

    if (createdBooking) {
      const bookingId = createdBooking._id || (createdBooking as any).id;
      bookingApi.cancelBooking(bookingId).catch((err) => {
        console.warn('Failed to release booking slot:', err);
      });
    }
  }, [createdBooking]);

  const handleCloseModal = () => {
    setShowResultModal(false);
    if (transactionStatus === 'SUCCESS') {
      fetchAvailability();
      router.replace('/');
    } else {
      // Refetch availability in case a pending booking expired
      fetchAvailability();
    }
  };

  return {
    availableDates,
    selectedDateIndex,
    setSelectedDateIndex: handleSelectDate,
    selectedSlots,
    setSelectedSlots,
    selectedSlot,
    setSelectedSlot,
    handleToggleSlot,
    handleClearSlots,
    totalCost,
    minRequiredDeposit: paymentSplit.minRequiredDeposit,
    paymentChoice,
    setPaymentChoice,
    customCardAmount,
    setCustomCardAmount,
    paymentSplit,
    paymentMethod: activePaymentMethod,
    setPaymentMethod: () => {},
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

