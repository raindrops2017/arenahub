# Project: Sports Venue Payment & Booking Flow Modernization

## Architecture
Multi-tier architecture covering:
1. **NestJS Backend (`nest-server/`)**:
   - Modules: `VenueModule`, `BookingModule`, `PaymentModule`, `CouponModule`, `WalletModule`.
   - Database: MongoDB with Mongoose entities (`Venue`, `Booking`, `Payment`, `User`).
   - Payment Integration: Paymob intentions & HMAC webhook verification.
2. **React Native / Expo Mobile Client (`app/`, `features/`, `components/`, `services/`)**:
   - Stack: Expo SDK 54, React Native 0.81.5, TanStack React Query v5, NativeWind v5 / Tailwind CSS.
   - State & Hooks: `useBookingFlow.ts`, `dateSlotGenerator.ts`, `authContext.tsx`.
   - Booking Flow: `app/pitch/[id].tsx`, `SlotPicker.tsx`, `BookingSummaryFooter.tsx`, `PaymobWebViewCheckout.tsx`.
3. **Admin Dashboard (`dashboard/`)**:
   - Stack: Vite, React 19, React Router v7, TanStack Query v5, Tailwind CSS v4.
   - Components: `VenueFormModal.tsx`, `VenueDetailModal.tsx`, `VenuesPage.tsx`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1: Remove Cash & Auto-Deduct Wallet | Auto-deduct `min(walletBalance, totalDue)`. Pay remainder via Paymob. Skip Paymob if zero remainder. Remove payment method selector. | M3 | ORIGINAL_REQUEST.md §R1 |
| 2 | R2: Multi-Slot Booking (Mobile UI) | Select multiple non-continuous or continuous slots on same date in `SlotPicker`. Pass slot array to checkout. | M3 | ORIGINAL_REQUEST.md §R2 |
| 3 | R2: Multi-Slot Booking (Backend & GroupId) | Accept array of slots in `CreateBookingDto`, lock all slots, create `Booking` documents with shared `groupId`, single Paymob session. | M1 | ORIGINAL_REQUEST.md §R2 |
| 4 | R3: Minimum Deposit (Backend Entity & DTOs) | Add `minimumDepositAmount` to `Venue` entity & DTOs. Calculate required deposit `slots.length * minimumDepositAmount`. Add `partially_paid` to `PaymentStatusEnum`. | M1 | ORIGINAL_REQUEST.md §R3 |
| 5 | R3: Minimum Deposit (Dashboard UI) | Add `minimumDepositAmount` input field to `VenueFormModal` and display in `VenueDetailModal`. | M2 | ORIGINAL_REQUEST.md §R3 |
| 6 | R3: Minimum Deposit (Mobile UI) | Display required deposit vs total cost in booking summary footer; apply wallet deduction to deposit amount. | M3 | ORIGINAL_REQUEST.md §R3 |
| 7 | R4: Fix Booked Slots Bug | Fix multi-hour interval lockout `[startTime, endTime)` and timezone-safe date normalization in `useBookingFlow.ts` and `dateSlotGenerator.ts`. | M3 | ORIGINAL_REQUEST.md §R4 |
| 8 | R5: Fix Venue Creation Bug | Add `existingImages`, `keepImages`, `removedImages`, `deleteImages` optional string arrays to `CreateVenueDto` and `UpdateVenueDto`. | M1 | ORIGINAL_REQUEST.md §R5 |
| 9 | R5: Dashboard Venue Creation Compatibility | Ensure `VenueFormModal` payload correctly submits new and existing images without validation errors. | M2 | ORIGINAL_REQUEST.md §R5 |
| 10 | E2E Testing Suite (Tiers 1-4) | Comprehensive automated test suite for R1-R5 across backend, mobile logic, and dashboard. | E2E-Track | ORIGINAL_REQUEST.md Acceptance Criteria |
| 11 | Adversarial Hardening (Tier 5) | White-box stress tests, race conditions, edge-case coverage audit. | M4 | Project Architecture & Robustness |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Requirement-driven test suite (Tiers 1-4) publishing `TEST_READY.md` | none | DONE |
| M1 | Backend Core (R2, R3, R5) | `Booking` groupId, multi-slot `createBooking`, `Venue.minimumDepositAmount`, `CreateVenueDto.existingImages`, `PaymentStatusEnum.partially_paid`, Paymob webhook group matching | none | DONE |
| M2 | Dashboard Updates (R3, R5) | `VenueFormModal` & `VenueDetailModal` minimum deposit field, payload validation compatibility | M1 contracts | DONE |
| M3 | Mobile Client Flow (R1, R2, R3, R4) | Multi-slot `SlotPicker`, wallet auto-deduct, remove cash selector, deposit display, multi-hour slot lockout & date parsing fix | M1 contracts | DONE |
| M4 | Final Integration & E2E Verification | Phase 1: 100% E2E test pass (Tiers 1-4). Phase 2: Adversarial coverage hardening (Tier 5). | E2E, M1, M2, M3 | DONE |

## Interface Contracts

### Backend ↔ Mobile / Dashboard Booking Creation Contract
- **Endpoint**: `POST /api/v1/booking`
- **Request Payload**:
  ```typescript
  interface CreateBookingDto {
    venueId: string;
    date: string; // ISO date string or YYYY-MM-DD
    slots?: Array<{ startTime: number; endTime: number }>; // Preferred multi-slot
    startTime?: number; // Legacy backwards-compatible single slot
    endTime?: number;   // Legacy backwards-compatible single slot
    idempotencyKey?: string;
    couponCode?: string;
    notes?: string;
  }
  ```
- **Response**:
  ```typescript
  interface BookingCreationResponse {
    success: boolean;
    groupId?: string;
    bookings: Array<{
      _id: string;
      venueId: string;
      date: string;
      startTime: number;
      endTime: number;
      totalPrice: number;
      status: string;
      paymentStatus: 'unpaid' | 'paid' | 'partially_paid' | 'refunded' | 'pay_at_venue';
      groupId?: string;
    }>;
    payment?: {
      paymentId: string;
      paymentStatus: string;
      walletDeduction: number;
      paymobRequired: number;
      paymentKey?: string;
      clientSecret?: string;
      redirectionUrl?: string;
    };
  }
  ```

### Backend ↔ Dashboard Venue DTO Contract
- **CreateVenueDto & UpdateVenueDto**:
  ```typescript
  class CreateVenueDto {
    venueName: string;
    address: string;
    sportsType: SportsTypeEnum;
    locationAlt: number;
    locationLang: number;
    amenities?: string[];
    startWorkingHours: number;
    endWorkingHours: number;
    defaultHourPrice: number;
    customHourPrices?: Array<{ hour: number; price: number }>;
    minimumDepositAmount?: number; // Optional, defaults to 0
    existingImages?: string[];     // Optional array of string URLs
    keepImages?: string[];         // Optional array of string URLs
    removedImages?: string[];      // Optional array of string URLs
    deleteImages?: string[];       // Optional array of string URLs
    isActive?: boolean;
  }
  ```

## Code Layout
- `nest-server/src/modules/booking/`: Booking controller, service, DTOs, entity.
- `nest-server/src/modules/venue/`: Venue controller, service, DTOs, entity.
- `nest-server/src/modules/payment/`: Payment controller, service, Paymob integration.
- `nest-server/src/common/enums/bookingEnum.ts`: `PaymentStatusEnum`, `BookingStatusEnum`.
- `dashboard/src/components/venue/`: `VenueFormModal.tsx`, `VenueDetailModal.tsx`.
- `dashboard/src/types/index.ts`: Dashboard TypeScript interfaces.
- `features/bookings/`: Mobile booking components (`SlotPicker.tsx`, `BookingSummaryFooter.tsx`), hooks (`useBookingFlow.ts`), utils (`dateSlotGenerator.ts`).
- `features/venues/`: Mobile venue schemas (`venue.schema.ts`).
- `services/api/bookingApi.ts`: Mobile API client.
- `types/index.ts`: Mobile TypeScript definitions.
