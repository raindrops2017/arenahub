# Mobile App Codebase Survey — Handoff Report

**Agent**: Mobile App Codebase Explorer (`explorer_mobile_survey`)  
**Timestamp**: 2026-08-24T16:15:30Z  
**Type**: Hard Handoff  

---

## 1. Observation

Direct file observations from `D:/test-mobile-app`:

1. **R1: Payment Selection & Wallet Balance**:
   - `features/bookings/components/PaymentMethodSelector.tsx` (lines 29–67): Renders radio buttons for `wallet`, `paymob`, and `cash`. Disables wallet if `walletBalance < totalPrice`.
   - `app/pitch/[id].tsx` (lines 10, 107–112): Mounts `<PaymentMethodSelector selectedMethod={paymentMethod} onSelectMethod={setPaymentMethod} walletBalance={walletBalance} totalPrice={currentPrice} />`.
   - `features/bookings/hooks/useBookingFlow.ts` (lines 37–39, 218–235): Manages `paymentMethod` state and warns with `Alert.alert('Insufficient Wallet Balance')` if wallet is selected with balance below price. `bookingApi.createBooking` receives this single `paymentMethod`.
2. **R2: Single Slot vs Multi-Slot**:
   - `features/bookings/components/SlotPicker.tsx` (lines 8–14, 73, 103): `SlotPickerProps` defines `selectedSlotTime?: string` and `onSelectSlot: (slot: TimeSlot) => void`. Selecting a slot highlights only one slot.
   - `features/bookings/hooks/useBookingFlow.ts` (lines 36, 194–215): State is `selectedSlot: HourlySlot | null`. `handleBookNow` sends single `startTime: selectedSlot.startHour24, endTime: selectedSlot.endHour24`.
   - `services/api/bookingApi.ts` (lines 16–30): `createBooking` accepts `CreateBookingPayload` with scalar `startTime: number` and `endTime: number`.
3. **R3: Minimum Deposit**:
   - `types/index.ts` (lines 88–107): `Venue` interface lacks `minimumDepositAmount`. `PaymentStatusEnum` (lines 34–39) lacks `partially_paid`.
   - `features/venues/schemas/venue.schema.ts` (lines 45–120): `VenueSchema` does not include or validate `minimumDepositAmount`.
   - `BookingSummaryFooter.tsx` (lines 9–26, 45–66): Displays only `totalPrice`.
4. **R4: Date/Time Slot Availability Bug**:
   - `features/bookings/hooks/useBookingFlow.ts` (lines 105–113):
     ```ts
     bookingApi.getAvailability(venueId).then((unavailable) => {
       const initialLocks: Record<string, boolean> = {};
       unavailable.forEach((b) => {
         const d = typeof b.date === 'string' ? b.date.split('T')[0] : new Date(b.date).toISOString().split('T')[0];
         const slotKey = `${d}_${b.startTime}`;
         initialLocks[slotKey] = true;
       });
       setLockedSlots((prev) => ({ ...prev, ...initialLocks }));
     });
     ```
     When a booking spans multiple hours (e.g. 18 to 20), only hour `18` is locked (`b.startTime`). Hour `19` is completely omitted and remains clickable in the UI.
   - `features/bookings/hooks/useBookingFlow.ts` (lines 118, 125, 137): Socket listeners for `onSlotLocked` and `onSlotReleased` only key on `${data.date.split('T')[0]}_${data.startTime}`, suffering the exact same multi-hour truncation defect.
   - `features/bookings/utils/dateSlotGenerator.ts` (lines 50–59): Uses local device date parsing (`d.getFullYear()`, `d.getMonth() + 1`, `d.getDate()`) whereas backend returns UTC midnight strings (`YYYY-MM-DDT00:00:00.000Z`).
5. **Build & Test State**:
   - `npx tsc --noEmit`: Exits with code 0 (clean TypeScript check).
   - `npm run lint` (`expo lint`): Exits with code 0 (0 errors, 6 unused var warnings).

---

## 2. Logic Chain

1. **R1 (Remove Cash & Auto-deduct Wallet)**:
   - *Observation*: PaymentMethodSelector gives users a manual choice and blocks checkout when wallet balance is partial.
   - *Reasoning*: Removing PaymentMethodSelector eliminates manual choice. Auto-calculating `walletDeduction = min(walletBalance, totalDue)` ensures wallet funds are always utilized first.
   - *Inference*: If `remainingPaymob = totalDue - walletDeduction === 0`, direct booking is triggered with zero external payment needed. If `remainingPaymob > 0`, Paymob WebView is launched for the remaining balance.
2. **R2 (Multi-Slot Booking)**:
   - *Observation*: `SlotPicker` and `useBookingFlow` store a single `selectedSlot` string/object.
   - *Reasoning*: Supporting non-continuous slots on the same date requires `selectedSlots: HourlySlot[]` state with array toggle semantics.
   - *Inference*: The checkout footer aggregates prices across all selected slots (`reduce`), and the API client passes the slot array to the backend group booking endpoint.
3. **R3 (Minimum Deposit Display)**:
   - *Observation*: `Venue` schema and checkout components only handle full hourly price without deposit logic.
   - *Reasoning*: Adding `minimumDepositAmount` to `Venue` and `VenueSchema` allows `useBookingFlow` to calculate `requiredDeposit = selectedSlots.length * venue.minimumDepositAmount`.
   - *Inference*: The UI can clearly present both total match cost and required deposit due immediately, and wallet auto-deduction applies directly to the required deposit.
4. **R4 (Already Booked Slots Bug)**:
   - *Observation*: Backend bookings for range 18..20 return `startTime: 18, endTime: 20`, but mobile locks only key `${d}_18`.
   - *Reasoning*: Any slot at hour 19 is not matched against `lockedSlots` and displays as available, causing 409 Conflict errors when clicked.
   - *Inference*: Expanding keys for all hours `for (let h = startTime; h < endTime; h++)` and using a canonical date formatter (`normalizeDateToYYYYMMDD`) completely eliminates both the multi-hour lock omission and timezone drift.

---

## 3. Caveats

- **Backend Group Booking Contract**: The mobile app survey assumes the NestJS backend `POST /api/v1/booking` will accept an array of slots (e.g. `{ venueId, date, slots: [{ startTime, endTime }], idempotencyKey }`) and return either single booking or group booking with `groupId`.
- **Paymob Intention for Group**: When `remainingPaymobAmount > 0`, the backend will generate one single Paymob intention for the entire group amount (or total deposit required).
- **Date Boundary across Midnights**: In `dateSlotGenerator.ts`, dates are constrained to a single calendar day per selection; selecting multiple slots across different dates is explicitly prohibited by design (resetting selection on date tab switch).

---

## 4. Conclusion

The mobile application architecture is modular and well-structured, built on Expo SDK 54, React Native 0.81.5, TanStack Query v5, and NativeWind v5. The four requested enhancements (R1, R2, R3, R4) can be implemented cleanly and safely across:
1. `features/bookings/components/PaymentMethodSelector.tsx` (removed from flow).
2. `features/bookings/components/SlotPicker.tsx` (updated for multi-selection).
3. `features/bookings/hooks/useBookingFlow.ts` (centralized auto-deduct, multi-slot state, deposit calculation, and multi-hour key expansion).
4. `features/bookings/utils/dateSlotGenerator.ts` (canonical date string extraction & interval key expansion).
5. `features/bookings/components/BookingSummaryFooter.tsx` (deposit & wallet cost breakdown).
6. `types/index.ts` and `features/venues/schemas/venue.schema.ts` (updated schemas & enums).

Full architectural details, code examples, and analysis are recorded in `D:/test-mobile-app/.agents/explorer_mobile_survey/analysis.md`.

---

## 5. Verification Method

To verify the mobile application codebase independently:
1. **TypeScript Static Analysis**:
   ```bash
   cd D:/test-mobile-app
   npx tsc --noEmit
   ```
   (Must exit 0 with 0 diagnostic errors).
2. **ESLint Code Quality**:
   ```bash
   cd D:/test-mobile-app
   npm run lint
   ```
   (Must exit 0).
3. **Inspect Implementation Files**:
   - Check `features/bookings/components/PaymentMethodSelector.tsx` is removed from `app/pitch/[id].tsx`.
   - Check `features/bookings/hooks/useBookingFlow.ts` contains `min(walletBalance, totalCost)` auto-deduction.
   - Check `features/bookings/components/SlotPicker.tsx` accepts and toggles `selectedSlots: HourlySlot[]`.
   - Check `features/venues/schemas/venue.schema.ts` contains `minimumDepositAmount`.
   - Check `features/bookings/hooks/useBookingFlow.ts` expands `[startTime ... endTime - 1]` for `lockedSlots`.
