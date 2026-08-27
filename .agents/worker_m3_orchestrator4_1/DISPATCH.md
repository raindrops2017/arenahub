## 2026-08-25T06:15:06Z
You are worker_m3_1 for Milestone 3 (Mobile Client Flow: R1, R2, R3, R4).
Your working directory is D:/test-mobile-app/.agents/worker_m3_orchestrator4_1.

Read:
- D:/test-mobile-app/.agents/ORIGINAL_REQUEST.md
- D:/test-mobile-app/PROJECT.md
- D:/test-mobile-app/TEST_READY.md
- D:/test-mobile-app/__tests__/e2e_booking_payment_suite.js
- D:/test-mobile-app/.agents/explorer_m3_orchestrator4_1/analysis.md
- D:/test-mobile-app/.agents/explorer_m3_orchestrator4_2/analysis.md
- D:/test-mobile-app/.agents/explorer_m3_orchestrator4_3/analysis.md
- D:/test-mobile-app/features/bookings/utils/dateSlotGenerator.ts
- D:/test-mobile-app/features/bookings/hooks/useBookingFlow.ts
- D:/test-mobile-app/features/bookings/components/SlotPicker.tsx
- D:/test-mobile-app/features/bookings/components/BookingSummaryFooter.tsx
- D:/test-mobile-app/features/bookings/components/PaymentMethodSelector.tsx
- D:/test-mobile-app/app/pitch/[id].tsx
- D:/test-mobile-app/services/api/bookingApi.ts
- D:/test-mobile-app/types/index.ts
- D:/test-mobile-app/features/venues/schemas/venue.schema.ts

Write Ownership:
- `features/bookings/utils/dateSlotGenerator.ts`
- `features/bookings/hooks/useBookingFlow.ts`
- `features/bookings/components/SlotPicker.tsx`
- `features/bookings/components/BookingSummaryFooter.tsx`
- `features/bookings/components/PaymentMethodSelector.tsx`
- `app/pitch/[id].tsx`
- `services/api/bookingApi.ts`
- `types/index.ts`
- `features/venues/schemas/venue.schema.ts`

Tasks to Implement:
1. **R1: Remove Cash & Auto-Deduct Wallet**:
   - Completely remove `PaymentMethodSelector` from imports and rendering in `app/pitch/[id].tsx`.
   - In `useBookingFlow.ts` and `app/pitch/[id].tsx`: Auto-deduct `walletDeduction = Math.min(walletBalance, targetAmountToPay)`.
   - If `remainderToPay === 0`, skip Paymob and process booking directly with wallet. If `remainderToPay > 0`, process remainder via Paymob.
2. **R2: Multi-Slot Selection**:
   - In `features/bookings/components/SlotPicker.tsx`: Support multiple slot selections (`selectedSlots: HourlySlot[]`, `onToggleSlot: (slot: HourlySlot) => void`, clear selection, badge counters). Support non-continuous and continuous slots on the same date.
   - In `useBookingFlow.ts`: Manage `selectedSlots` array.
   - In `services/api/bookingApi.ts` and `app/pitch/[id].tsx`: Pass `slots: selectedSlots.map(s => ({ startTime: s.startTime, endTime: s.endTime }))` to the backend booking endpoint.
3. **R3: Minimum Deposit Per Slot**:
   - In `features/bookings/components/BookingSummaryFooter.tsx` and `app/pitch/[id].tsx`:
     Calculate `requiredDeposit = venue.minimumDepositAmount ? selectedSlots.length * venue.minimumDepositAmount : totalCost`.
     Display required deposit vs total cost when `minimumDepositAmount > 0` and `< totalCost`.
     Show wallet deduction and remaining card/Paymob amount.
4. **R4: Fix Already Booked Slots Bug**:
   - In `features/bookings/utils/dateSlotGenerator.ts` and `features/bookings/hooks/useBookingFlow.ts`:
     - Interval Lockout: For each booking in `[startTime, endTime)`, mark all hours `h` from `startTime` to `endTime - 1` as booked/unavailable.
     - Timezone Date Parsing: Use timezone-safe date normalization (`YYYY-MM-DD` string matching) so that bookings match the selected date regardless of local UTC offset.
5. **Types & Schemas**:
   - Update `types/index.ts` and `features/venues/schemas/venue.schema.ts` to include `minimumDepositAmount`, `groupId`, `partially_paid`, `slots`.
6. **Build & Test Verification**:
   - Run `npx tsc --noEmit` to verify 0 TypeScript errors across the mobile codebase.
   - Run `node __tests__/run_all_e2e.js` and `node __tests__/e2e_booking_payment_suite.js` to verify all 60 tests pass.
   - Run backend tests `cd nest-server && npm test` and dashboard `cd dashboard && npm run build` to ensure zero cross-module regressions.
