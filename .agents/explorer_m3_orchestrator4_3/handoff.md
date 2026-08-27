# Handoff Report: Milestone 3 (Mobile Client Flow Investigation)

## 1. Observation

Direct observations from the local codebase and execution environment:

1. **`app/pitch/[id].tsx`**:
   - Lines 10 & 107–112: `PaymentMethodSelector` is imported and mounted inside the scroll view:
     ```tsx
     <PaymentMethodSelector
       selectedMethod={paymentMethod}
       onSelectMethod={setPaymentMethod}
       walletBalance={walletBalance}
       totalPrice={currentPrice}
     />
     ```
   - Lines 61–62 & 100–101: Only single `selectedSlot` is managed and passed to `SlotPicker` (`selectedSlotTime={selectedSlot?.time}`).
   - Lines 116–123: `BookingSummaryFooter` receives only single `totalPrice={currentPrice}` and `selectedSlotTime={selectedSlot?.time}`.

2. **`features/bookings/components/PaymentMethodSelector.tsx`**:
   - Lines 29–67: Renders radio buttons for `PaymentMethodEnum.wallet`, `PaymentMethodEnum.paymob`, and `PaymentMethodEnum.cash`.
   - Line 48: Disables the wallet option if `walletBalance < totalPrice`.

3. **`features/bookings/components/SlotPicker.tsx`**:
   - Lines 8–14: `SlotPickerProps` accepts single `selectedSlotTime?: string` and `onSelectSlot: (slot: TimeSlot & { id?: string }) => void`.
   - Lines 73–98: `isSelected = selectedSlotTime === slot.time`. Clicking a slot invokes `onSelectSlot(slot)` which replaces the single active slot.

4. **`features/bookings/components/BookingSummaryFooter.tsx`**:
   - Lines 9–17: `BookingSummaryFooterProps` takes `totalPrice: number` and `selectedSlotTime?: string`.
   - Lines 45–66: Renders only a single total amount (`formatCurrency(totalPrice)`). No minimum deposit breakdown or wallet auto-deduction breakdown.

5. **`features/bookings/hooks/useBookingFlow.ts`**:
   - Lines 36–39: States `selectedSlot` (single `HourlySlot | null`) and `paymentMethod` (`PaymentMethodEnum`).
   - Lines 105–113: `bookingApi.getAvailability` initial lockout only locks single hour key `${d}_${b.startTime}` instead of iterating through multi-hour interval `[b.startTime, b.endTime)`.
   - Lines 118, 125, 137: Socket listeners `onSlotLocked`, `onSlotReleased`, and `onBookingConfirmed` also only lock single hour `${data.startTime}`.
   - Lines 218–235: If `paymentMethod === wallet` and `walletBalance < price`, displays an `Alert` asking user to switch to Paymob or Cash.
   - Lines 241–251: Calls `bookingApi.createBooking` with single `startTime: selectedSlot.startHour24` and `endTime: selectedSlot.endHour24`.

6. **`types/index.ts` & `features/venues/schemas/venue.schema.ts`**:
   - In `types/index.ts`: `PaymentStatusEnum` lacks `partially_paid`; `Venue` lacks `minimumDepositAmount?: number;`; `Booking` lacks `groupId?: string;`; `CreateBookingPayload` lacks `slots?: Array<{ startTime: number; endTime: number }>`.
   - In `features/venues/schemas/venue.schema.ts`: `VenueSchema` preprocess normalization and zod definition omit `minimumDepositAmount`.

7. **TypeScript Check**:
   - Running `npx tsc --noEmit` at `D:/test-mobile-app` completed with **exit code 0** (0 errors currently).

---

## 2. Logic Chain

1. **R1 (Remove Cash & Auto-Deduct Wallet)**:
   - *Observation*: `PaymentMethodSelector.tsx` gives users a manual choice and contains `cash` payment option. `useBookingFlow.ts` alerts users if wallet is partial.
   - *Requirement*: Cash must be removed; wallet funds must be auto-applied up to $\min(\text{walletBalance}, \text{depositDue})$; remaining balance must go to Paymob.
   - *Inference*: `PaymentMethodSelector.tsx` must be removed from `app/pitch/[id].tsx` and deprecated. In `useBookingFlow.ts`, `walletDeduction` and `paymobRemainder` must be computed automatically, skipping Paymob when remainder is zero.

2. **R2 (Multi-Slot Booking UI)**:
   - *Observation*: `SlotPicker.tsx` and `useBookingFlow.ts` only support a single slot (`HourlySlot | null`).
   - *Requirement*: Users must be able to select multiple continuous or non-continuous slots on the same date.
   - *Inference*: `SlotPickerProps` must accept `selectedSlots: HourlySlot[]` and `onToggleSlot`. The UI must display selection badges/counters and a "Clear All" button. `useBookingFlow.ts` must send `slots: Array<{ startTime: number; endTime: number }>` to `POST /api/v1/booking`.

3. **R3 (Minimum Deposit Display)**:
   - *Observation*: `VenueSchema` does not expose `minimumDepositAmount`, and `BookingSummaryFooter.tsx` displays only single total price.
   - *Requirement*: When `venue.minimumDepositAmount > 0`, required deposit ($N \times \text{minimumDepositAmount}$) must be calculated and displayed alongside total booking price.
   - *Inference*: `VenueSchema` must parse `minimumDepositAmount`. `BookingSummaryFooter` must render the total cost, deposit required breakdown, and auto-applied wallet deduction.

4. **R4 (Booked Slots Bug Fix)**:
   - *Observation*: Current lockout logic only hashes `startTime`, leaving multi-hour bookings partially available.
   - *Requirement*: Booked slots spanning multiple hours must lock all hours in `[startTime, endTime)`.
   - *Inference*: Both `bookingApi.getAvailability` and socket event handlers must loop from `startTime` to `endTime - 1` and lock all corresponding hourly keys.

5. **Type Safety**:
   - *Observation*: `npx tsc --noEmit` currently passes, but `types/index.ts` and `venue.schema.ts` lack the new M1 fields (`slots`, `groupId`, `minimumDepositAmount`, `partially_paid`).
   - *Inference*: Updating these type definitions guarantees strict contract alignment without breaking existing code.

---

## 3. Caveats

1. **Network / Offline Mode**: Real-time slot locking depends on WebSocket connectivity via `socketService`. When offline, fallback relies on initial `getAvailability` REST API call.
2. **Date Scoping for Multi-Slot**: When a user switches to a different date in `DateSelector`, `selectedSlots` are reset to prevent cross-date slot selection (which is prohibited by backend validation).
3. **Partial Wallet + Paymob Split on Backend**: Backend `POST /api/v1/booking` accepts `paymentMethod: 'paymob' | 'wallet'`. When wallet covers 100%, mobile passes `'wallet'`. When wallet is 0 or partial, mobile passes `'paymob'`.

---

## 4. Conclusion

1. `PaymentMethodSelector.tsx` must be completely removed from imports and JSX rendering in `app/pitch/[id].tsx`. The file should be removed from the booking flow.
2. `SlotPicker.tsx` must be refactored to support multi-slot toggle selection, badges, slot counters, and clear selection action.
3. `BookingSummaryFooter.tsx` must display full cost vs deposit due and auto-applied wallet deductions.
4. `useBookingFlow.ts` must fix the multi-hour interval slot lockout bug and format the `slots` array payload for `POST /api/v1/booking`.
5. Mobile TypeScript interfaces (`types/index.ts`, `venue.schema.ts`, `context/AuthContext.tsx`) must be updated with `minimumDepositAmount`, `groupId`, `partially_paid`, and `slots`.

---

## 5. Verification Method

To independently verify the findings and proposed updates:

1. **TypeScript Typecheck**:
   ```bash
   cd D:/test-mobile-app
   npx tsc --noEmit
   ```
   *Expected Output*: Exits with code 0 (no compile errors).

2. **File Inspection**:
   - Verify `PaymentMethodSelector` is removed from `app/pitch/[id].tsx`:
     ```bash
     grep -rn "PaymentMethodSelector" app/pitch/\[id\].tsx
     ```
     *Expected Output*: No matches found.
   - Inspect `SlotPicker.tsx` multi-slot interface:
     ```bash
     grep -rn "selectedSlots" features/bookings/components/SlotPicker.tsx
     ```
   - Inspect `useBookingFlow.ts` interval lockout loop:
     ```bash
     grep -rn "endTime" features/bookings/hooks/useBookingFlow.ts
     ```

3. **E2E & Integration Verification**:
   - Run full booking flow test suite in `nest-server` to verify backend compatibility:
     ```bash
     cd D:/test-mobile-app/nest-server
     npm run test -- --testPathPattern="booking"
     ```
