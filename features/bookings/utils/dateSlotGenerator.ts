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
