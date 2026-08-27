import { Venue, PitchDate, TimeSlot } from "@/features/venues/schemas/venue.schema";

const MONTH_NAMES = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
];

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export interface HourlySlot extends TimeSlot {
  id: string;
  startHour24: number;
  endHour24: number;
  time: string;
  price: number;
  available: boolean;
}

export function formatHour(hour24: number): string {
  const normalized = ((hour24 % 24) + 24) % 24;
  const period = normalized >= 12 && normalized < 24 ? "PM" : "AM";
  const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
  const pad = displayHour < 10 ? `0${displayHour}` : `${displayHour}`;
  return `${pad}:00 ${period}`;
}

/**
 * Computes the exact hourly price for a specific slot considering custom hourly rates from Mongoose schema.
 */
export function calculateSlotPrice(venue: Venue, startHour24: number): number {
  if (venue.customHourPrices && Array.isArray(venue.customHourPrices)) {
    const custom = venue.customHourPrices.find((c) => c.hour === startHour24);
    if (custom && custom.pricePerHour > 0) {
      return custom.pricePerHour;
    }
  }

  return venue.defaultHourPrice || 200;
}

/**
 * Generates forward series of booking dates based on live venue operating hours.
 */
export function generateFutureBookingDates(venue: Venue, daysAhead: number = 30): PitchDate[] {
  const dates: PitchDate[] = [];
  const now = new Date();
  const startHour = venue.startWorkingHours ?? 8;
  const endHour = venue.endWorkingHours ?? 24;

  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);

    const dayName = i === 0 ? "TODAY" : i === 1 ? "TOMORROW" : DAY_NAMES[d.getDay()];
    const day = String(d.getDate()).padStart(2, "0");
    const month = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    const isoDate = `${year}-${String(d.getMonth() + 1).padStart(2, "0")}-${day}`;

    const slots: HourlySlot[] = [];
    for (let h = startHour; h < endHour; h++) {
      const nextH = h + 1;
      const slotTime = `${formatHour(h)} - ${formatHour(nextH)}`;
      const price = calculateSlotPrice(venue, h);

      // Check if slot has already passed today
      const isPastToday = i === 0 && now.getHours() >= h;

      slots.push({
        id: `slot_${isoDate}_${h}`,
        time: slotTime,
        startHour24: h,
        endHour24: nextH,
        price,
        available: !isPastToday,
      });
    }

    dates.push({
      date: isoDate,
      dayName,
      day,
      month,
      slots,
    });
  }

  return dates;
}

/**
 * Timezone-safe date normalization preserving calendar date string (YYYY-MM-DD).
 */
export function normalizeDateString(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const normalizeDate = normalizeDateString;

/**
 * Checks whether an hourly slot index falls within any half-open booked intervals [startTime, endTime).
 */
export function isSlotLockedAcrossIntervals(
  slotHour: number,
  bookedIntervals: Array<{ startTime: number; endTime: number }>
): boolean {
  return bookedIntervals.some((booking) => {
    const end = booking.endTime && booking.endTime > booking.startTime ? booking.endTime : booking.startTime + 1;
    return slotHour >= booking.startTime && slotHour < end;
  });
}

/**
 * Computes the total price of a group booking across discrete slot intervals and custom pricing.
 */
export function calculateGroupBookingCost(
  slots: Array<{ startTime: number; endTime: number }>,
  venue: Venue
): number {
  if (!Array.isArray(slots) || slots.length === 0) {
    throw new Error('Slots array must contain at least 1 slot');
  }

  let totalCost = 0;
  for (const slot of slots) {
    if (typeof slot.startTime !== 'number' || typeof slot.endTime !== 'number') {
      throw new Error('Invalid slot time format');
    }
    if (slot.startTime >= slot.endTime) {
      throw new Error(`Invalid slot interval: startTime (${slot.startTime}) must be < endTime (${slot.endTime})`);
    }

    let slotPrice = 0;
    for (let hour = slot.startTime; hour < slot.endTime; hour++) {
      const customPrice = venue.customHourPrices?.find((p) => p.hour === hour);
      if (customPrice && typeof customPrice.pricePerHour === 'number' && customPrice.pricePerHour > 0) {
        slotPrice += customPrice.pricePerHour;
      } else {
        slotPrice += venue.defaultHourPrice || 200;
      }
    }
    totalCost += slotPrice;
  }

  return totalCost;
}

export interface PaymentSplitResult {
  totalCost: number;
  minRequiredDeposit: number;
  walletBalance: number;
  walletDeduction: number;
  paymobRemainder: number; // Amount to pay via card now
  paymobRequired: boolean;
  targetPaymentAmount: number; // Total paid now = walletDeduction + paymobRemainder
  remainingAtVenue: number; // Due at venue in cash
  paymentStatus: 'unpaid' | 'paid' | 'partially_paid';
  isDepositPayment: boolean;
  depositEnabled: boolean;
  walletCoversDeposit: boolean;
  walletCoversFull: boolean;
  minCardRequired: number; // Mandatory card payment to satisfy minimum deposit
  maxCardAllowed: number;  // Full remaining balance after wallet deduction
  totalRemainingAfterWallet: number; // Total remaining after wallet deduction
}

/**
 * Computes exact payment split, wallet deduction, deposit requirements, and Paymob remainder.
 * Rule: ALWAYS deducts all available wallet balance (up to total cost) first.
 * If wallet >= minimum deposit:
 *   - Minimum deposit is already satisfied by wallet.
 *   - User can choose to pay 0 on card now (pay remaining at venue in cash) or pay the remainder via card.
 * If wallet < minimum deposit:
 *   - Wallet covers part of deposit.
 *   - User MUST pay at least the remaining deposit (minRequiredDeposit - wallet) via card now.
 */
export function computePaymentSplit({
  walletBalance = 0,
  totalCost = 0,
  minimumDepositAmount = 0,
  slotsCount = 1,
  paymentChoice = 'MIN_REQUIRED',
  customCardAmount,
}: {
  walletBalance?: number;
  totalCost?: number;
  minimumDepositAmount?: number;
  slotsCount?: number;
  paymentChoice?: 'MIN_REQUIRED' | 'FULL' | 'CUSTOM';
  customCardAmount?: number;
}): PaymentSplitResult {
  const depositConfigured = typeof minimumDepositAmount === 'number' && minimumDepositAmount > 0;
  const minRequiredDeposit = depositConfigured
    ? Math.min(slotsCount * minimumDepositAmount, totalCost)
    : totalCost;

  const safeWalletBalance = Math.max(0, Number(walletBalance) || 0);

  // ALWAYS deduct all available wallet balance up to total cost
  const walletDeduction = Math.min(safeWalletBalance, totalCost);
  const totalRemainingAfterWallet = Math.max(0, Number((totalCost - walletDeduction).toFixed(2)));

  const walletCoversDeposit = walletDeduction >= minRequiredDeposit;
  const walletCoversFull = walletDeduction >= totalCost;

  // Minimum card payment required now to ensure deposit is satisfied
  const minCardRequired = Math.max(0, Number((minRequiredDeposit - walletDeduction).toFixed(2)));
  // Maximum card payment allowed (the full remainder)
  const maxCardAllowed = totalRemainingAfterWallet;

  let cardPayAmount = 0;

  if (walletCoversFull) {
    cardPayAmount = 0;
  } else if (paymentChoice === 'FULL') {
    cardPayAmount = maxCardAllowed;
  } else if (paymentChoice === 'MIN_REQUIRED') {
    cardPayAmount = minCardRequired;
  } else if (paymentChoice === 'CUSTOM') {
    if (customCardAmount !== undefined && customCardAmount !== null && customCardAmount >= 0) {
      cardPayAmount = Math.min(maxCardAllowed, Math.max(minCardRequired, customCardAmount));
    } else {
      cardPayAmount = minCardRequired;
    }
  }

  const paymobRemainder = Number(cardPayAmount.toFixed(2));
  const paymobRequired = paymobRemainder > 0;
  const targetPaymentAmount = Number((walletDeduction + paymobRemainder).toFixed(2));
  const remainingAtVenue = Math.max(0, Number((totalCost - targetPaymentAmount).toFixed(2)));

  let paymentStatus: 'unpaid' | 'paid' | 'partially_paid' = 'unpaid';
  if (targetPaymentAmount >= totalCost && totalCost > 0) {
    paymentStatus = paymobRequired ? 'unpaid' : 'paid';
  } else {
    paymentStatus = 'partially_paid';
  }

  return {
    totalCost,
    minRequiredDeposit,
    walletBalance: safeWalletBalance,
    walletDeduction: Number(walletDeduction.toFixed(2)),
    paymobRemainder,
    paymobRequired,
    targetPaymentAmount,
    remainingAtVenue,
    paymentStatus,
    isDepositPayment: depositConfigured && targetPaymentAmount < totalCost,
    depositEnabled: depositConfigured,
    walletCoversDeposit,
    walletCoversFull,
    minCardRequired,
    maxCardAllowed,
    totalRemainingAfterWallet,
  };
}

