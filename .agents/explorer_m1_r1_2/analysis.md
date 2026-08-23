# Milestone 1 Schema & Entity Interface Specification Analysis

**Location**: `D:/test-mobile-app/.agents/explorer_m1_r1_2/analysis.md`  
**Author**: `teamwork_preview_explorer` (M1-2 Schema Specialist)  
**Date**: 2026-08-07  
**Target Milestone**: M1 (Shared Mock Data Store & Persistence)  

---

## 1. Executive Summary & Context

This document provides the definitive TypeScript interface declarations matching Nest.js server entity models for the **ArenaHub Dual-Platform Prototype**.

The primary objective is to define clean, strict, cross-platform TypeScript schemas for:
1. **Venue**: Sports facility entity with operating hours, geolocation, sports types, custom hourly rates, amenities, and gallery assets.
2. **Customer**: Mobile client user record with account status enforcement (`Active`, `On Hold`, `Suspended`, `Inactive`) and system wallet linkage.
3. **SystemUser**: Dashboard administrative user record with role-based access (`Admin`, `Employee`, `Manager`, `Owner`) and account status.
4. **Wallet**: Customer digital wallet entity holding current balance and currency.
5. **WalletTransaction**: Financial audit log entry tracking debits, refund credits, admin payouts, and top-ups.
6. **Booking**: Reservation record tying customers, venues, slots, payment methods, payment status, and refund metadata.

These interfaces will be co-located at:
- Dashboard: `D:/test-mobile-app/dashboard/src/types/index.ts`
- Mobile App: `D:/test-mobile-app/types/index.ts`

---

## 2. Entity Overview & Relationships

```
+----------------+          1:1          +----------------+
|    Customer    |---------------------->|     Wallet     |
+----------------+                       +----------------+
        |                                        |
        | 1:N                                    | 1:N
        v                                        v
+----------------+                       +----------------+
|    Booking     |                       |WalletTransaction|
+----------------+                       +----------------+
        |
        | N:1
        v
+----------------+
|     Venue      |
+----------------+

+----------------+
|   SystemUser   | (Manages Customers, Venues, Bookings, & Payouts)
+----------------+
```

---

## 3. Detailed Entity Declarations

Below is the complete TypeScript code block to be written to `types/index.ts`.

```typescript
// ==========================================
// 1. VENUE ENTITY & SUB-TYPES (Nest.js Venue)
// ==========================================

export type SportsType = '5-A-SIDE' | '7-A-SIDE' | '11-A-SIDE' | 'PADEL';
export type VenueStatus = 'Active' | 'Maintenance' | 'Inactive';

export interface CustomPricingRate {
  id: string;
  startHour: string; // HH:mm (24hr) e.g., "18:00"
  endHour: string;   // HH:mm (24hr) e.g., "23:00"
  pricePerHour: number;
}

export interface WorkingHours {
  openTime: string;  // e.g., "08:00 AM" or "08:00"
  closeTime: string; // e.g., "02:00 AM" or "02:00"
  daysOpen: string[]; // e.g., ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PricingInfo {
  defaultPricePerHour: number;
  currency: 'EGP' | 'USD';
  customHourlyRates: CustomPricingRate[];
}

export interface Venue {
  id: string;
  name: string;
  sportsTypes: SportsType[];
  address: string;
  coordinates: Coordinates;
  workingHours: WorkingHours;
  pricing: PricingInfo;
  amenities: string[]; // e.g., ["Parking", "Locker Room", "Floodlights", "Cafeteria", "Showers"]
  imageUrls: string[];
  rating: number;      // Average rating score (e.g. 4.8)
  reviewCount: number; // Total number of reviews
  description: string;
  status: VenueStatus;
  createdAt: string;  // ISO 8601 string
  updatedAt: string;  // ISO 8601 string
}

// ==========================================
// 2. CUSTOMER ENTITY & STATUS ENFORCEMENT
// ==========================================

export type CustomerStatus = 'Active' | 'On Hold' | 'Suspended' | 'Inactive';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  favoritePosition: string; // e.g., 'Midfielder', 'Forward', 'Defender', 'Goalkeeper', 'Winger'
  status: CustomerStatus;
  walletId: string;
  walletBalance: number;    // Denormalized snapshot for performant list views
  createdAt: string;        // ISO 8601 string
  updatedAt: string;        // ISO 8601 string
}

// ==========================================
// 3. SYSTEM USER ENTITY (Dashboard Admin)
// ==========================================

export type UserRole = 'Admin' | 'Employee' | 'Manager' | 'Owner';
export type UserStatus = 'Active' | 'Inactive';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  createdAt: string;        // ISO 8601 string
  updatedAt: string;        // ISO 8601 string
}

// ==========================================
// 4. SYSTEM WALLET ENTITY
// ==========================================

export interface Wallet {
  id: string;
  customerId: string;
  customerName: string;
  balance: number;
  currency: 'EGP' | 'USD';
  updatedAt: string;        // ISO 8601 string
}

// ==========================================
// 5. WALLET TRANSACTION ENTITY (Audit Log)
// ==========================================

export type TransactionType = 
  | 'REFUND_CREDIT'   // Automatic refund credit from booking cancellation
  | 'BOOKING_DEBIT'   // Wallet deduction during slot checkout
  | 'ADMIN_PAYOUT'    // Admin manual cash payout deduction
  | 'TOP_UP';          // Direct account top-up

export interface WalletTransaction {
  id: string;
  walletId: string;
  customerId: string;
  customerName: string;
  type: TransactionType;
  amount: number;          // Positive for credits/top-ups, negative for debits/payouts
  balanceAfter: number;    // Resulting wallet balance
  description: string;     // Audit summary text
  referenceId?: string;    // e.g. bookingId or payoutId
  createdBy: string;       // E.g., 'System', 'Admin (Sarah)', 'Customer (Ahmed)'
  createdAt: string;       // ISO 8601 string
}

// ==========================================
// 6. BOOKING ENTITY
// ==========================================

export type PaymentMethod = 'Wallet Balance' | 'Cash' | 'Credit Card';
export type PaymentStatus = 'Paid' | 'Pending' | 'Refunded' | 'Partially Refunded';
export type BookingStatus = 'Confirmed' | 'Completed' | 'Cancelled';
export type RefundOption = 'FULL' | 'PARTIAL' | 'NONE';

export interface Booking {
  id: string;
  venueId: string;
  venueName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  date: string;            // YYYY-MM-DD format
  startTime: string;       // e.g. "18:00" or "06:00 PM"
  endTime: string;         // e.g. "19:00" or "07:00 PM"
  slotId: string;          // Identifier for slot (e.g., "slot-1800")
  price: number;
  currency: 'EGP' | 'USD';
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  cancellationReason?: string;
  refundOption?: RefundOption;
  refundAmount?: number;
  createdAt: string;       // ISO 8601 string
  updatedAt: string;       // ISO 8601 string
}

// ==========================================
// 7. ACTION & PAYLOAD DTO INTERFACES
// ==========================================

export interface CreateVenuePayload extends Omit<Venue, 'id' | 'createdAt' | 'updatedAt' | 'rating' | 'reviewCount'> {
  rating?: number;
  reviewCount?: number;
}

export interface UpdateVenuePayload extends Partial<CreateVenuePayload> {}

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  email?: string;
  favoritePosition: string;
  status: CustomerStatus;
  initialBalance?: number;
}

export interface UpdateCustomerPayload extends Partial<Omit<CreateCustomerPayload, 'initialBalance'>> {}

export interface CreateSystemUserPayload {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
}

export interface UpdateSystemUserPayload extends Partial<CreateSystemUserPayload> {}

export interface CreateBookingPayload {
  venueId: string;
  customerId: string;
  date: string;
  startTime: string;
  endTime: string;
  slotId: string;
  price: number;
  paymentMethod: PaymentMethod;
}

export interface ProcessRefundPayload {
  bookingId: string;
  refundOption: RefundOption;
  refundAmount: number;
  reason: string;
  processedBy: string;
}

export interface AdminPayoutPayload {
  customerId: string;
  amount: number;
  notes: string;
  processedBy: string;
}

// ==========================================
// 8. SHARED PERSISTENT STORAGE STATE SCHEMA
// ==========================================

export interface SharedStorageData {
  app_v1_venues: Venue[];
  app_v1_customers: Customer[];
  app_v1_users: SystemUser[];
  app_v1_wallets: Wallet[];
  app_v1_transactions: WalletTransaction[];
  app_v1_bookings: Booking[];
  app_v1_active_customer_id: string;
}
```

---

## 4. Key Design Decisions & Validation Rationale

1. **Status Enforcement Compliance**:
   - `CustomerStatus` enum exactly mirrors Requirement R2 and R6 business rules:
     - `Active`: Unrestricted access across Dashboard and Mobile App.
     - `On Hold`: Triggers alert banner during checkout/booking.
     - `Suspended`: Strictly blocks booking creation & wallet transactions via modal popup.
     - `Inactive`: Archived state prompting re-verification.

2. **Audit Logging & Financial Integrity**:
   - `WalletTransaction` captures signed amounts (`+` for credit, `-` for debits/payouts), `balanceAfter` snapshot, and `createdBy` metadata to ensure total transparency for Admin Payouts (R2) and Booking Refunds (R4/R6).

3. **Nest.js Entity Alignment**:
   - Nested pricing (`PricingInfo`, `CustomPricingRate`) and working hours (`WorkingHours`) match Nest.js DTO object shapes, allowing straightforward server migration if needed.

---

## 5. Summary for Implementers

- **Target File Locations**:
  - `D:/test-mobile-app/dashboard/src/types/index.ts`
  - `D:/test-mobile-app/types/index.ts`
- **Dependency**: Zero external library dependencies required. Pure TypeScript definitions.
