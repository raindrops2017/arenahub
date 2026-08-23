import { apiRequest } from './apiClient';
import {
  Booking,
  CreateBookingPayload,
  CreateBookingResponse,
  CreatePaymentPayload,
  QueryBookingPayload,
} from '@/types';

export const bookingApi = {
  /**
   * Reserves an available venue time slot with dynamic hourly pricing & coupons.
   * Sends UUID idempotency header to prevent double booking on retry.
   * Hits `POST /api/v1/booking`.
   */
  async createBooking(
    data: CreateBookingPayload,
    idempotencyKey?: string
  ): Promise<CreateBookingResponse> {
    const payload = {
      ...data,
      idempotencyKey: idempotencyKey || data.idempotencyKey,
    };

    return await apiRequest<CreateBookingResponse>('booking', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey: payload.idempotencyKey,
    });
  },

  /**
   * Initiates payment for a pending booking via wallet, Paymob, or cash at venue.
   * Hits `POST /api/v1/booking/:bookingId/pay`.
   */
  async payBooking(
    bookingId: string,
    data: CreatePaymentPayload
  ): Promise<Booking> {
    return await apiRequest<Booking>(`booking/${bookingId}/pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Retrieves the authenticated customer's booking history with QR codes.
   * Hits `GET /api/v1/booking/my-bookings`.
   */
  async getMyBookings(query?: QueryBookingPayload): Promise<Booking[]> {
    return await apiRequest<Booking[]>('booking/my-bookings', {
      method: 'GET',
      params: query,
    });
  },

  /**
   * Retrieves full reservation details by MongoDB ID.
   * Hits `GET /api/v1/booking/:id`.
   */
  async getBookingById(id: string): Promise<Booking> {
    return await apiRequest<Booking>(`booking/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Cancels an active booking, releases slot, and triggers automated wallet refund.
   * Hits `PATCH /api/v1/booking/:id/cancel`.
   */
  async cancelBooking(id: string): Promise<Booking> {
    return await apiRequest<Booking>(`booking/${id}/cancel`, {
      method: 'PATCH',
    });
  },

  /**
   * Retrieves booked and held slots for a venue.
   */
  async getAvailability(venueId: string, startDate?: string, endDate?: string): Promise<{date: string; startTime: number; endTime: number; status: string}[]> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await apiRequest<{date: string; startTime: number; endTime: number; status: string}[]>(`booking/availability/${venueId}`, {
      method: 'GET',
      params,
    });
  },
};

