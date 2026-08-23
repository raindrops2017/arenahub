import { z } from "zod";
import { PitchDateSchema, TimeSlotSchema } from "@/features/venues/schemas/venue.schema";

export const BookingPaymentMethodSchema = z.enum(["WALLET", "CARD", "CASH", "PAYMOB_CARD", "PAYMOB_WALLET"]);
export type BookingPaymentMethod = z.infer<typeof BookingPaymentMethodSchema>;

export const BookingStatusSchema = z.enum(["CONFIRMED", "PENDING", "CANCELLED", "COMPLETED"]);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const BookingSchema = z.object({
  id: z.string().min(1),
  venueId: z.string().min(1),
  venueName: z.string().min(1),
  customerId: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  date: z.string(),
  timeSlot: z.string(),
  totalPrice: z.number().positive(),
  paymentMethod: BookingPaymentMethodSchema,
  status: BookingStatusSchema.default("CONFIRMED"),
  createdAt: z.string(),
  qrCode: z.string().optional(),
});
export type Booking = z.infer<typeof BookingSchema>;

export const PendingBookingSchema = z.object({
  venueId: z.string().min(1),
  venueName: z.string().optional(),
  date: PitchDateSchema,
  slot: TimeSlotSchema,
  paymentMethod: BookingPaymentMethodSchema.optional(),
});
export type PendingBooking = z.infer<typeof PendingBookingSchema>;
