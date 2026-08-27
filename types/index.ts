// Direct Schema & Type Definitions matching nest-server Mongoose Schemas & DTOs

// ==========================================
// ENUMS (matching nest-server/src/common/enums)
// ==========================================

export enum RoleEnum {
  user = 'user',
  customer = 'customer',
  admin = 'admin',
  superAdmin = 'superAdmin',
  owner = 'owner',
  manager = 'manager',
}

export enum ProviderEnum {
  system = 'system',
  google = 'google',
}

export enum GenderEnum {
  male = 'male',
  female = 'female',
}

export enum BookingStatusEnum {
  pending = 'pending',
  confirmed = 'confirmed',
  cancelled = 'cancelled',
  completed = 'completed',
  expired = 'expired',
}

export enum PaymentStatusEnum {
  unpaid = 'unpaid',
  paid = 'paid',
  partially_paid = 'partially_paid',
  refunded = 'refunded',
  pay_at_venue = 'pay_at_venue',
}

export enum PaymentMethodEnum {
  wallet = 'wallet',
  paymob = 'paymob',
  cash = 'cash',
}

export enum TransactionTypeEnum {
  DEPOSIT = 'DEPOSIT',
  DEDUCTION = 'DEDUCTION',
  BOOKING_PAYMENT = 'BOOKING_PAYMENT',
  BOOKING_REFUND = 'BOOKING_REFUND',
}

export enum TransactionStatusEnum {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum CouponEnum {
  percentage = 'percentage',
  fixed = 'fixed',
}

// ==========================================
// VENUE ENTITIES & TYPES
// ==========================================

export interface VenueAmenities {
  Parking?: boolean;
  Cafeteria?: boolean;
  Shower?: boolean;
  ChangingRoom?: boolean;
  Toilets?: boolean;
  WiFi?: boolean;
  Lockers?: boolean;
  FloodLights?: boolean;
  DrinkingWater?: boolean;
  FirstAid?: boolean;
  PrayerArea?: boolean;
  EquipmentRental?: boolean;
}

export interface CustomHourPrice {
  hour: number;
  pricePerHour: number;
}

export interface Venue {
  _id: string;
  venueName: string;
  sportsType: string[];
  address: string;
  locationAlt: number;
  locationLang: number;
  images: string[];
  amenities: VenueAmenities;
  startWorkingHours: number;
  endWorkingHours: number;
  WorkingHours?: number;
  defaultHourPrice: number;
  customHourPrices?: CustomHourPrice[];
  minimumDepositAmount?: number;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// USER & CUSTOMER ENTITIES
// ==========================================

export interface CustomerUser {
  _id: string;
  userName: string;
  email: string;
  provider: ProviderEnum | 'google' | 'system';
  phone?: string;
  avatar?: string;
  position?: string;
  walletBalance: number;
  emailConfirmed?: boolean;
  role?: RoleEnum | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUser {
  _id: string;
  userName: string;
  email: string;
  role: RoleEnum;
  phone?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// BOOKING ENTITIES
// ==========================================

export interface Booking {
  _id: string;
  userId: string | CustomerUser;
  venueId: string | Venue;
  date: string; // ISO String format YYYY-MM-DD
  startTime: number; // 0 - 23
  endTime: number; // 1 - 24
  totalPrice: number;
  status: BookingStatusEnum;
  paymentStatus: PaymentStatusEnum;
  bookingCode: string;
  qrCode: string;
  couponCode?: string;
  discountAmount?: number;
  finalPrice?: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentMethod?: PaymentMethodEnum;
  expiresAt?: string;
  groupId?: string;
  idempotencyKey?: string;
  requestHash?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// PAYMENT ENTITIES
// ==========================================

export interface Payment {
  _id: string;
  bookingId: string | Booking;
  userId: string | CustomerUser;
  amount: number;
  paymentMethod: PaymentMethodEnum;
  transactionId: string;
  status: PaymentStatusEnum;
  paidAt?: string;
  refundedAmount?: number;
  refundReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// WALLET ENTITIES
// ==========================================

export interface Wallet {
  _id: string;
  userId: string;
  balance: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WalletTransaction {
  _id: string;
  walletId: string;
  type: TransactionTypeEnum;
  status: TransactionStatusEnum;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  receiptNumber: string;
  referenceId?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// COUPON ENTITIES
// ==========================================

export interface Coupon {
  _id: string;
  code: string;
  discount: number;
  discountType: CouponEnum;
  startDate: string;
  endDate: string;
  maxUses: number;
  usesCount: number;
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// BANNER & APP UTILITY TYPES
// ==========================================

export type AdActionType = 'EXTERNAL_LINK' | 'PITCH_DETAIL' | 'INFO_MODAL' | 'CONTACT_US' | 'NONE';

export interface Advertisement {
  _id: string;
  title: string;
  description?: string;
  image: string;
  linkUrl?: string;
  position?: 'DASHBOARD_TOP' | 'DASHBOARD_MIDDLE' | 'DASHBOARD_SIDEBAR' | string;
  status?: 'active' | 'inactive' | 'scheduled' | 'expired' | string;
  startDate?: string;
  endDate?: string;
  durationMinutes?: number;
  displayDuration?: number;
  priority?: number;
  impressions?: number;
  clicks?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdBanner {
  id: string;
  title: string;
  subtitle?: string;
  titleAr?: string;
  subtitleAr?: string;
  imageUrl: string | number | any;
  displayDuration: number;
  actionType: AdActionType;
  actionValue?: string;
  order: number;
  status: 'Active' | 'Inactive';
  startDate?: string;
  endDate?: string;
  durationMinutes?: number;
}

// Standard NestJS API response structure wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface CreateBookingSlotItem {
  startTime: number;
  endTime: number;
}

// DTO Payload Types
export interface CreateBookingPayload {
  venueId: string;
  date: string;
  slots?: CreateBookingSlotItem[];
  startTime?: number;
  endTime?: number;
  paymentMethod?: PaymentMethodEnum;
  customAmount?: number;
  walletAmountToUse?: number;
  couponCode?: string;
  idempotencyKey?: string;
}

export interface PaymobPaymentData {
  message?: string;
  bookingId?: string;
  paymentId?: string;
  transactionId?: string;
  amountToPay?: number;
  walletDeduction?: number;
  totalTarget?: number;
  currency?: string;
  clientSecret?: string;
  publicKey?: string;
  redirectUrl?: string;
  status?: string;
}

export interface CreateBookingResponse {
  booking?: Booking;
  bookings?: Booking[];
  groupId?: string;
  payment?: PaymobPaymentData | Payment | any;
  amountToPay?: number;
  walletDeduction?: number;
  totalTarget?: number;
  clientSecret?: string;
  publicKey?: string;
  redirectUrl?: string;
}

export interface CreatePaymentPayload {
  paymentMethod: PaymentMethodEnum;
  customAmount?: number;
  walletAmountToUse?: number;
  couponCode?: string;
}

export interface QueryBookingPayload {
  page?: number;
  limit?: number;
  status?: BookingStatusEnum;
  paymentStatus?: PaymentStatusEnum;
  date?: string;
}

export interface GetTransactionsPayload {
  page?: number;
  limit?: number;
  type?: TransactionTypeEnum;
  status?: TransactionStatusEnum;
}
