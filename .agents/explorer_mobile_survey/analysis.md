# Mobile App Codebase Survey & Deep-Dive Analysis

**Author**: Mobile App Codebase Explorer  
**Date**: 2026-08-24  
**Target App**: Expo SDK 54 / React Native 0.81+ Mobile Client (`D:/test-mobile-app`)  
**Scope**: Requirements R1 (Remove Cash & Auto-deduct Wallet), R2 (Multi-Slot Booking), R3 (Minimum Deposit Display), R4 (Fix Already Booked Slots Bug), and Build/Test Setup.

---

## Executive Summary

This investigation surveys the React Native / Expo mobile application codebase (`test-mobile-app`) to document all existing components, hooks, services, state management, types, and utilities associated with the booking and payment lifecycle. The survey identifies the exact locations requiring updates, details the root causes of current bugs (notably the date/time slot lockout defect), and outlines concrete technical designs for implementing multi-slot reservations, automated wallet auto-deduction, minimum deposit display, and robust timezone-safe slot locking.

---

## 1. Project Architecture & Directory Map

```
D:/test-mobile-app/
├── app/
│   ├── (auth)/                    # Auth flow screens (login, verify, profile-setup)
│   ├── _layout.tsx                # Root navigation layout, QueryClientProvider, AuthProvider
│   ├── index.tsx                  # Home screen / Venue Feed
│   ├── pitch/[id].tsx             # Pitch Details & Booking Screen (Main Checkout Flow)
│   ├── profile.tsx                # Customer Profile, Wallet, and Bookings tab
│   └── player-card.tsx            # FIFA-style Player Passport
├── features/
│   ├── bookings/
│   │   ├── api/useBookingsQuery.ts         # React Query hooks for bookings
│   │   ├── components/
│   │   │   ├── BookingResultModal.tsx      # Post-booking confirmation & pass modal
│   │   │   ├── BookingSummaryFooter.tsx    # Sticky checkout bottom bar
│   │   │   ├── CustomerBookingsList.tsx    # Bookings list with ticket & cancel modal
│   │   │   ├── DateSelector.tsx            # Horizontal date picker carousel
│   │   │   ├── PaymentMethodSelector.tsx   # Legacy payment method radio selector (R1 Target)
│   │   │   └── SlotPicker.tsx              # Grid of hourly time slots (R2 Target)
│   │   ├── hooks/
│   │   │   └── useBookingFlow.ts           # Central booking orchestration hook (R1, R2, R3, R4)
│   │   ├── schemas/booking.schema.ts       # Zod validation schemas for bookings
│   │   └── utils/dateSlotGenerator.ts      # Generates 30-day hourly slots from venue hours (R4)
│   └── venues/
│       ├── api/useVenuesQuery.ts           # React Query hooks for venues
│       ├── components/
│       │   ├── VenueAmenities.tsx          # Amenity badges
│       │   ├── VenueCard.tsx               # Feed venue card item
│       │   └── VenueHeader.tsx             # Pitch details hero carousel & info
│       └── schemas/venue.schema.ts         # Zod schema for Venue entity (R3 Target)
├── components/
│   ├── payment/PaymobWebViewCheckout.tsx   # Modal WebView for Paymob Intention checkout
│   ├── ui/                                 # AppText, Button, Badge, Card, Input
│   └── QRCodeWidget.tsx                    # Native SVG QR generator
├── context/
│   ├── AuthContext.tsx                     # Auth token, customer session, pending bookings
│   ├── LanguageContext.tsx                 # i18n, RTL, currency and date formatting
│   └── ThemeContext.tsx                    # Dark/Light theme colors
├── services/
│   ├── api/
│   │   ├── apiClient.ts                    # Fetch wrapper with JWT headers & error handling
│   │   ├── bookingApi.ts                   # REST endpoints: create, pay, availability, cancel
│   │   ├── venueApi.ts                     # REST endpoints: getVenues, getVenueById
│   │   ├── walletApi.ts                    # REST endpoints: getMyWallet, transactions
│   │   └── socketService.ts                # Socket.io client: slot_locked, slot_released, booking_confirmed
│   └── paymobService.ts                    # Native SDK & WebView configuration flags
├── types/index.ts                          # Shared TypeScript interfaces & enums
└── package.json                            # Expo SDK 54.0.35, React 19.1.0, React Native 0.81.5
```

---

## 2. Requirement-by-Requirement Investigation

### R1. Remove Cash & Auto-Deduct Wallet Balance

#### Current Implementation Analysis
- **`features/bookings/components/PaymentMethodSelector.tsx`**:
  - Renders a 3-option radio group: `PaymentMethodEnum.wallet` ("Digital Wallet"), `PaymentMethodEnum.paymob` ("Credit/Debit Card"), and `PaymentMethodEnum.cash` ("Pay at Venue").
  - Disables the wallet option if `walletBalance < totalPrice`.
- **`app/pitch/[id].tsx`** (lines 10, 107–112):
  - Imports and mounts `PaymentMethodSelector` directly into the scrollable booking container.
  - Passes `paymentMethod` and `setPaymentMethod` from `useBookingFlow`.
- **`features/bookings/hooks/useBookingFlow.ts`** (lines 37–39, 218–235):
  - Manages `paymentMethod` state (defaults to `PaymentMethodEnum.wallet`).
  - In `handleBookNow`:
    ```ts
    if (paymentMethod === PaymentMethodEnum.wallet && walletBalance < price) {
      Alert.alert('Insufficient Wallet Balance', ...);
      return;
    }
    ```
  - Dispatches `bookingApi.createBooking` with the user-selected `paymentMethod`.
  - If `paymentMethod === PaymentMethodEnum.paymob`, triggers Paymob modal; otherwise directly marks transaction as `SUCCESS`.

#### Target State & Implementation Design
1. **Remove `PaymentMethodSelector.tsx`**:
   - Delete or unmount `PaymentMethodSelector` from `app/pitch/[id].tsx`.
   - Remove user manual selection of payment methods.
2. **Automated Wallet Deduction Logic**:
   - Compute `totalDue = totalBookingAmount` (or `requiredDeposit` if R3 applies).
   - Compute `walletDeduction = Math.min(walletBalance, totalDue)`.
   - Compute `remainingPaymobAmount = totalDue - walletDeduction`.
   - **Case A: `remainingPaymobAmount === 0` (100% Wallet Covered)**:
     - `paymentMethod` is set to `PaymentMethodEnum.wallet`.
     - `bookingApi.createBooking` is dispatched.
     - Direct confirmation (no Paymob session needed).
     - Result modal displays `SUCCESS` immediately.
   - **Case B: `remainingPaymobAmount > 0` (Partial or Zero Wallet)**:
     - `paymentMethod` is set to `PaymentMethodEnum.paymob`.
     - `bookingApi.createBooking` is dispatched.
     - Backend creates booking and returns Paymob Intention `clientSecret` and `publicKey` for the remainder (`remainingPaymobAmount`).
     - `PaymobWebViewCheckout` launches for the remaining balance.
3. **UI Cost Breakdown**:
   - Update `BookingSummaryFooter.tsx` (or a dedicated cost summary card) to clearly show:
     - Total Pitch Amount (e.g. `500 EGP`)
     - Wallet Deduction (e.g. `-200 EGP` if balance is 200 EGP)
     - Amount Due via Card / Paymob (e.g. `300 EGP` or `0 EGP - Fully Covered`)

---

### R2. Multi-Slot Booking

#### Current Implementation Analysis
- **`features/bookings/components/SlotPicker.tsx`**:
  - `SlotPickerProps` accepts `selectedSlotTime?: string` (single string) and `onSelectSlot: (slot: TimeSlot) => void`.
  - Highlights a slot if `selectedSlotTime === slot.time`.
  - Clicking a slot replaces the single active selection.
- **`features/bookings/hooks/useBookingFlow.ts`**:
  - State: `const [selectedSlot, setSelectedSlot] = useState<HourlySlot | null>(null);`.
  - `currentPrice = selectedSlot?.price ?? venue.defaultHourPrice;`.
  - In `handleBookNow`: sends single slot payload:
    ```ts
    {
      venueId: venue._id || venue.id,
      date: currentDate.date,
      startTime: selectedSlot.startHour24,
      endTime: selectedSlot.endHour24,
      ...
    }
    ```
- **`services/api/bookingApi.ts` & `types/index.ts`**:
  - `CreateBookingPayload` defines `startTime: number; endTime: number;` for a single slot.

#### Target State & Implementation Design
1. **`SlotPicker.tsx` Multi-Selection**:
   - Update props to accept `selectedSlots: HourlySlot[]` and `onToggleSlot: (slot: HourlySlot) => void`.
   - A slot is selected if `selectedSlots.some(s => s.startHour24 === slot.startHour24)`.
   - Pressing an available slot toggles its inclusion in the array (supports non-continuous slots, e.g., 18:00–19:00 and 21:00–22:00 on the same date).
   - Display a badge counter when multiple slots are selected (e.g. "2 slots selected").
2. **`useBookingFlow.ts` State Transition**:
   - Replace `selectedSlot` with `selectedSlots: HourlySlot[]` (initialized to `[]`).
   - When switching dates (`selectedDateIndex` changes), reset `selectedSlots` to `[]` (since slots must be on the same date).
   - Compute `totalCost = selectedSlots.reduce((acc, slot) => acc + (slot.price ?? venue.defaultHourPrice), 0)`.
   - In `handleBookNow`:
     - Validate `if (selectedSlots.length === 0) Alert.alert('Select Slots', 'Please select at least one time slot.');`.
     - Call updated `bookingApi.createBooking` passing the array of slots:
       ```ts
       slots: selectedSlots.map(s => ({
         startTime: s.startHour24,
         endTime: s.endHour24,
       }))
       ```
       (along with `date`, `venueId`, `idempotencyKey`).
3. **Checkout UI Updates**:
   - `BookingSummaryFooter`:
     - Summarize selected slots: e.g. "2 Slots: 06:00 PM, 09:00 PM".
     - Display combined total amount.
     - Disable confirm button if `selectedSlots.length === 0`.
   - `BookingResultModal`:
     - List all booked slot times and display the shared `groupId` / `bookingCode`.

---

### R3. Minimum Deposit Display

#### Current Implementation Analysis
- **`types/index.ts`** (`Venue` interface, lines 88–107):
  - Missing `minimumDepositAmount?: number;`.
- **`features/venues/schemas/venue.schema.ts`** (`VenueSchema`, lines 45–120):
  - Missing `minimumDepositAmount` in both preprocessor and schema definition.
- **`types/index.ts`** (`PaymentStatusEnum`, lines 34–39):
  - Currently defines `unpaid`, `paid`, `refunded`, `pay_at_venue`. Missing `partially_paid`.
- **Checkout & Summary Components**:
  - Currently only calculate and display full `totalPrice`.

#### Target State & Implementation Design
1. **Schema & Type Additions**:
   - In `types/index.ts`:
     - Add `minimumDepositAmount?: number;` to `Venue`.
     - Add `partially_paid = 'partially_paid'` to `PaymentStatusEnum`.
     - Add `groupId?: string;` to `Booking`.
   - In `features/venues/schemas/venue.schema.ts`:
     - In preprocessor: `minimumDepositAmount: typeof raw.minimumDepositAmount === 'number' ? raw.minimumDepositAmount : undefined,`.
     - In Zod schema: `minimumDepositAmount: z.number().optional(),`.
2. **Deposit Calculation in `useBookingFlow.ts`**:
   - `hasDeposit = typeof venue.minimumDepositAmount === 'number' && venue.minimumDepositAmount > 0;`
   - `totalMatchPrice = selectedSlots.reduce((sum, s) => sum + (s.price ?? venue.defaultHourPrice), 0);`
   - `requiredDepositAmount = hasDeposit ? selectedSlots.length * venue.minimumDepositAmount! : totalMatchPrice;`
   - `remainingVenueBalance = totalMatchPrice - requiredDepositAmount;`
   - Apply wallet deduction against `requiredDepositAmount`:
     - `walletDeduction = Math.min(walletBalance, requiredDepositAmount);`
     - `paymobAmount = requiredDepositAmount - walletDeduction;`
3. **UI Representation**:
   - `BookingSummaryFooter.tsx` & Pitch Details:
     - Total Pitch Fee: `formatCurrency(totalMatchPrice)`
     - Required Deposit: `formatCurrency(requiredDepositAmount)` (highlighted with badge)
     - Wallet Deduction: `- formatCurrency(walletDeduction)`
     - Pay Now (via Card): `formatCurrency(paymobAmount)`
     - Pay Later at Venue: `formatCurrency(remainingVenueBalance)` (if `remainingVenueBalance > 0`)

---

### R4. Fix Already Booked Slots Bug

#### Deep-Dive Root Cause Analysis

A thorough trace through `dateSlotGenerator.ts`, `useBookingFlow.ts`, `services/api/bookingApi.ts`, and backend `booking.service.ts` revealed **three distinct defect mechanisms** causing booked/held slots to remain available or misalign in the mobile UI:

```
+-----------------------------------------------------------------------------------+
| DEFECT 1: Multi-Hour Interval Lock Gap                                            |
| Backend booking spans hours 18 to 20. getAvailability returns { startTime: 18,    |
| endTime: 20 }. useBookingFlow executes: initialLocks[`${d}_${b.startTime}`] = true|
| -> ONLY hour 18 is locked! Hour 19 remains available in the UI!                   |
+-----------------------------------------------------------------------------------+
| DEFECT 2: Timezone Shift in b.date String Normalization                           |
| Backend stores Date as UTC midnight (e.g. 2026-08-25T00:00:00.000Z).              |
| dateSlotGenerator constructs local dates (d.getFullYear(), d.getMonth(), etc.).   |
| Calling new Date(b.date).toISOString().split('T')[0] vs b.date.split('T')[0]      |
| causes 1-day date offset shifts in local timezones (e.g. GMT+2 / GMT+3).          |
+-----------------------------------------------------------------------------------+
| DEFECT 3: Socket Event Incomplete Key Invalidation                                |
| socketService 'slot_locked' and 'slot_released' only modify data.startTime,       |
| omitting [startTime ... endTime - 1] intermediate hourly slots.                   |
+-----------------------------------------------------------------------------------+
```

#### Code Evidence

1. **`useBookingFlow.ts` (lines 105–113)**:
   ```ts
   bookingApi.getAvailability(venueId).then((unavailable) => {
     const initialLocks: Record<string, boolean> = {};
     unavailable.forEach((b) => {
       const d = typeof b.date === 'string' ? b.date.split('T')[0] : new Date(b.date).toISOString().split('T')[0];
       const slotKey = `${d}_${b.startTime}`; // ❌ BUG: Only locks single start hour, ignores multi-hour range
       initialLocks[slotKey] = true;
     });
     setLockedSlots((prev) => ({ ...prev, ...initialLocks }));
   });
   ```

2. **`useBookingFlow.ts` Socket Listeners (lines 115–132)**:
   ```ts
   const unsubLocked = socketService.onSlotLocked((data: SlotEventData) => {
     if (data.venueId === venueId) {
       const slotKey = `${data.date.split('T')[0]}_${data.startTime}`; // ❌ BUG: Single start hour only
       setLockedSlots((prev) => ({ ...prev, [slotKey]: true }));
     }
   });
   ```

3. **`dateSlotGenerator.ts` (lines 50–59)**:
   ```ts
   const now = new Date();
   for (let i = 0; i < daysAhead; i++) {
     const d = new Date(now);
     d.setDate(now.getDate() + i);
     // If now has non-zero time and DST changes or boundary is crossed, isoDate shifts
     const day = String(d.getDate()).padStart(2, "0");
     const month = MONTH_NAMES[d.getMonth()];
     const year = d.getFullYear();
     const isoDate = `${year}-${String(d.getMonth() + 1).padStart(2, "0")}-${day}`;
   ```

#### Clean, Timezone-Safe Solution Design

1. **Canonical Date String Formatter**:
   ```ts
   export function normalizeDateToYYYYMMDD(dateInput: string | Date): string {
     if (!dateInput) return '';
     if (typeof dateInput === 'string') {
       // Extract YYYY-MM-DD directly from ISO string without passing through new Date()
       const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
       if (match) return `${match[1]}-${match[2]}-${match[3]}`;
     }
     const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
     const year = d.getUTCFullYear();
     const month = String(d.getUTCMonth() + 1).padStart(2, '0');
     const day = String(d.getUTCDate()).padStart(2, '0');
     return `${year}-${month}-${day}`;
   }
   ```

2. **Full-Interval Hour Expansion Helper**:
   ```ts
   export function buildSlotLockKeys(
     dateStr: string | Date,
     startHour: number,
     endHour?: number
   ): string[] {
     const cleanDate = normalizeDateToYYYYMMDD(dateStr);
     const start = Number(startHour);
     const end = typeof endHour === 'number' && endHour > start ? Number(endHour) : start + 1;
     const keys: string[] = [];
     for (let h = start; h < end; h++) {
       keys.push(`${cleanDate}_${h}`);
     }
     return keys;
   }
   ```

3. **Refactored Availability & Socket Processing**:
   - In `getAvailability`:
     ```ts
     const initialLocks: Record<string, boolean> = {};
     unavailable.forEach((b) => {
       const keys = buildSlotLockKeys(b.date, b.startTime, b.endTime);
       keys.forEach(k => { initialLocks[k] = true; });
     });
     setLockedSlots((prev) => ({ ...prev, ...initialLocks }));
     ```
   - In `onSlotLocked`:
     ```ts
     const keys = buildSlotLockKeys(data.date, data.startTime, data.endTime);
     setLockedSlots((prev) => {
       const updated = { ...prev };
       keys.forEach(k => { updated[k] = true; });
       return updated;
     });
     ```
   - In `onSlotReleased`:
     ```ts
     const keys = buildSlotLockKeys(data.date, data.startTime, data.endTime);
     setLockedSlots((prev) => {
       const updated = { ...prev };
       keys.forEach(k => { delete updated[k]; });
       return updated;
     });
     ```

---

## 3. Mobile Build and Test Environment

### Package Configuration & Dependencies
- **Expo SDK**: `~54.0.35`
- **React**: `19.1.0`
- **React Native**: `0.81.5`
- **TypeScript**: `~5.9.2`
- **State & Networking**: `@tanstack/react-query ^5.101.4`, `zustand ^5.0.15`, `socket.io-client ^4.8.3`
- **Payments**: `react-native-webview 13.15.0`, `paymob-reactnative` (SDK)
- **UI & Styling**: `nativewind ^5.0.0-preview.4`, `tailwindcss ^4.3.3`, `class-variance-authority ^0.7.1`

### Build / Typecheck / Verification Scripts
- **TypeScript Typecheck**: `npx tsc --noEmit` -> Tested and passes with **0 errors**.
- **ESLint**: `npm run lint` (`expo lint`).
- **Dev Server**: `npm start` (`expo start`).

---

## 4. Summary of Required Modifications by File

| File Path | Current Status | Required Modifications |
|-----------|----------------|------------------------|
| `types/index.ts` | Missing deposit & group types | Add `minimumDepositAmount?: number` to `Venue`; add `partially_paid = 'partially_paid'` to `PaymentStatusEnum`; add `groupId?: string` to `Booking`; update `CreateBookingPayload` for multi-slot. |
| `features/venues/schemas/venue.schema.ts` | Missing `minimumDepositAmount` | Add `minimumDepositAmount: z.number().optional()` to preprocessor and schema. |
| `features/bookings/components/PaymentMethodSelector.tsx` | Active 3-option payment selector | Delete file or remove usage from booking flow (R1). |
| `features/bookings/components/SlotPicker.tsx` | Single slot picker | Convert to multi-slot selection with toggle handler and selection indicator (R2). |
| `features/bookings/utils/dateSlotGenerator.ts` | Local date generation with potential boundary flaws | Standardize timezone normalization, export `normalizeDateToYYYYMMDD` and `buildSlotLockKeys` (R4). |
| `features/bookings/hooks/useBookingFlow.ts` | Single slot, manual payment selection, single-hour socket locks | Implement auto-deduction wallet logic (R1), multi-slot state (R2), minimum deposit calculation (R3), and multi-hour slot interval locking (R4). |
| `features/bookings/components/BookingSummaryFooter.tsx` | Single price display | Display multi-slot summary, deposit breakdown, wallet deduction, and Paymob remainder (R1, R2, R3). |
| `features/bookings/components/BookingResultModal.tsx` | Single slot pass display | Display group booking details / multi-slot pass (R2). |
| `services/api/bookingApi.ts` | Single slot creation DTO | Update `createBooking` payload signature for multiple slots. |
| `app/pitch/[id].tsx` | Mounts `PaymentMethodSelector` | Remove `PaymentMethodSelector` import and JSX; pass multi-slot props to `SlotPicker` and `BookingSummaryFooter`. |

---

## 5. Architectural Recommendations & Risk Mitigation

1. **Zero-Remainder Wallet Booking**: When `walletBalance >= totalAmount` (or deposit), bypassing Paymob completely reduces latency and avoids opening unnecessary WebViews.
2. **Idempotency in Multi-Slot Booking**: Maintain the `idempotencyKey` UUID per group booking transaction to ensure retried requests cannot duplicate booking documents or double-charge wallets.
3. **Real-Time Synchronicity**: When a socket `slot_locked` event arrives, locking all hours in `[startTime ... endTime - 1]` guarantees that adjacent or multi-hour reservations cannot suffer race conditions.
