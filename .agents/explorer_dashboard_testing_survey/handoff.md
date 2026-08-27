# Handoff Report: Dashboard Frontend & Global Testing Survey

**Working Directory**: `D:/test-mobile-app/.agents/explorer_dashboard_testing_survey/`  
**Date**: 2026-08-24  
**Author**: Dashboard & Testing Explorer  

---

## 1. Observation

Direct observations and citations across the codebase:

1. **Dashboard Frontend Location & Stack**:
   - Location: `D:/test-mobile-app/dashboard/`
   - Config: `dashboard/package.json` specifies Vite `^6.1.0`, React `^19.0.0`, `@tanstack/react-query` `^5.101.4`, `react-router` `^7.1.5`, and Tailwind CSS `^4.0.8`.
   - Modals and forms are located in `dashboard/src/components/venue/` (`VenueFormModal.tsx`, `VenueDetailModal.tsx`, `DeleteVenueModal.tsx`).
   - Venue page is located at `dashboard/src/pages/VenuesPage.tsx`.

2. **Dashboard Venue Creation `existingImages` Issue (R5)**:
   - In `dashboard/src/components/venue/VenueFormModal.tsx` (lines 264–275):
     ```typescript
     // Send Kept / Remaining Existing Images to Backend
     formData.append("existingImages", JSON.stringify(existingImages));
     existingImages.forEach((img) => {
       formData.append("keepImages", img);
     });
     ```
   - In `nest-server/src/modules/venue/dto/venue.dto.ts` (lines 40–156):
     - `CreateVenueDto` only defines: `venueName`, `address`, `sportsType`, `locationAlt`, `locationLang`, `amenities`, `startWorkingHours`, `endWorkingHours`, `defaultHourPrice`, `customHourPrices`, and `isActive`.
     - `existingImages` and `keepImages` are omitted from `CreateVenueDto`, while they are defined in `UpdateVenueDto` (lines 185–225).
     - Under NestJS `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` configured in `nest-server/test/booking.e2e-spec.ts` (line 50) and production bootstrap, sending `existingImages` on venue creation throws a `400 Bad Request` validation error.

3. **`minimumDepositAmount` Absence Across Dashboard & Backend (R3)**:
   - In `dashboard/src/types/index.ts` (lines 68–104), `interface Venue` does not define `minimumDepositAmount`.
   - In `dashboard/src/components/venue/VenueFormModal.tsx`, there is no state variable, no input field, and no form data appended for `minimumDepositAmount`.
   - In `dashboard/src/components/venue/VenueDetailModal.tsx`, only `defaultHourPrice` and `customHourPrices` are rendered (lines 146–178).
   - In `nest-server/src/modules/venue/entities/venue.entity.ts` (lines 52–111), `class Venue` lacks `@Prop() minimumDepositAmount`.
   - In `nest-server/src/modules/venue/dto/venue.dto.ts`, neither `CreateVenueDto` nor `UpdateVenueDto` contains `minimumDepositAmount`.

4. **Cash Payment Selector & Wallet Auto-Deduction in Mobile (R1)**:
   - In `features/bookings/components/PaymentMethodSelector.tsx` (lines 59–66), `PaymentMethodEnum.cash` is explicitly rendered as a selectable radio option.
   - In `features/bookings/hooks/useBookingFlow.ts` (lines 37–39, 217–235), `paymentMethod` defaults to `wallet` and prompts an alert to switch to Cash or Card if `walletBalance < price`. It does not automatically split the transaction between wallet and Paymob.
   - In `app/pitch/[id].tsx` (line 107), `<PaymentMethodSelector />` is rendered inside the main booking scroll view.

5. **Single-Slot vs Multi-Slot Group Booking (R2)**:
   - In `features/bookings/components/SlotPicker.tsx` (lines 9–14, 73), `selectedSlotTime?: string` accepts a single slot string and `onSelectSlot` selects one slot.
   - In `features/bookings/hooks/useBookingFlow.ts` (line 36), state is `const [selectedSlot, setSelectedSlot] = useState<HourlySlot | null>(null);`.
   - In `nest-server/src/modules/booking/dto/booking.dto.ts` (lines 70–97), `CreateBookingDto` accepts a single `startTime: number` and `endTime: number`.
   - In `nest-server/src/modules/booking/entities/booking.entity.ts` (lines 20–80), `groupId` is not present on the schema.
   - In `nest-server/src/common/enums/bookingEnum.ts` (lines 9–14), `PaymentStatusEnum` only defines `unpaid`, `paid`, `refunded`, `pay_at_venue`, missing `partially_paid`.

6. **Existing Test Infrastructure**:
   - `nest-server/test/booking.e2e-spec.ts` (1,037 lines): Comprehensive NestJS Supertest suite verifying wallet atomic transactions, idempotency locks, coupon calculations, and Paymob webhooks.
   - `__tests__/verify_m1_challenger_stress.js` & `verify_m1_invariants.js`: Invariant verification scripts testing mockStore and mobile storageService logic.
   - `dashboard/package.json`: Contains `"test": "jest"` / lint scripts, but no dedicated Cypress or Playwright framework.

---

## 2. Logic Chain

1. **R5 Root Cause**:
   - Observation 2 demonstrates that the dashboard form `VenueFormModal.tsx` unilaterally appends `existingImages` to the `FormData` on both create and edit actions.
   - Observation 2 also proves `CreateVenueDto` lacks `existingImages`.
   - Therefore, any request from the dashboard to create a venue fails schema validation when `forbidNonWhitelisted: true` is enabled on the NestJS global validation pipe.
   - Inference: Adding `@IsOptional() @ParseArray() @IsArray() @IsString({ each: true }) existingImages?: string[];` to `CreateVenueDto` immediately unblocks venue creation.

2. **R3 Minimum Deposit Chain**:
   - Observation 3 shows `minimumDepositAmount` is absent in database schemas, DTOs, dashboard forms, and mobile schemas.
   - Adding `@Prop({ type: Number, default: 0 }) minimumDepositAmount?: number;` to `venue.entity.ts` and corresponding DTO decorators enables persistence.
   - Updating `VenueFormModal.tsx` and `VenueDetailModal.tsx` allows venue administrators to configure and view deposit requirements per slot.
   - Inference: Booking creation logic can then calculate required payment as `slots.length * (venue.minimumDepositAmount || slotPrice)` and assign `PaymentStatusEnum.partially_paid`.

3. **R1 Wallet & Cash Flow Simplification**:
   - Observation 4 shows manual selection of payment method (including Cash) creates friction and fails the requirement to auto-deduct wallet balances.
   - By eliminating `PaymentMethodSelector.tsx` from `app/pitch/[id].tsx`, the booking flow calculates `walletDeduction = Math.min(walletBalance, totalDue)` and `paymobRemainder = totalDue - walletDeduction`.
   - Inference: If `paymobRemainder === 0`, Paymob session is skipped and booking is confirmed immediately; otherwise, Paymob intention WebView launches for the remainder.

4. **R2 Multi-Slot Architecture**:
   - Observation 5 shows the current system is constrained to a single `(startTime, endTime)` pair.
   - By converting `SlotPicker.tsx` to maintain `selectedSlots: HourlySlot[]` and updating `CreateBookingDto` / `booking.service.ts` to accept an array of slots, the backend can create multiple `Booking` documents sharing a generated `groupId`.
   - Inference: The total amount across all slots in the group is paid in a single Paymob session.

---

## 3. Caveats

- **Paymob SDK vs WebView**: The mobile app codebase supports both `paymob-reactnative-sdk` and `PaymobWebViewCheckout.tsx`. The active mode uses WebView intentions (`USE_PAYMOB_WEBVIEW = true`).
- **Dashboard Testing Runner**: The dashboard frontend does not have an active Jest or Playwright test runner configured in its local `dashboard/package.json`. Invariant tests are currently executed via Node scripts in `__tests__/`.
- **Database Indexing**: Introducing `groupId` in `Booking` schema should include an index (`BookingSchema.index({ groupId: 1 })`) to support efficient group querying and status updates.

---

## 4. Conclusion

The dashboard frontend and testing infrastructure are structurally well-organized, with clear separation between UI, API services, and shared types. The exact points of friction for requirements R1–R5 have been identified and mapped:
1. **R1**: Remove `PaymentMethodSelector.tsx`, implement automatic `min(wallet, total)` split.
2. **R2**: Implement multi-selection in `SlotPicker.tsx`, add `groupId` and slot array processing in backend.
3. **R3**: Add `minimumDepositAmount` across backend `Venue` entity/DTOs, dashboard `VenueFormModal`/`VenueDetailModal`, and mobile deposit display with `partially_paid` status.
4. **R4**: Normalize date ISO strings across UTC/local conversions in `useBookingFlow.ts` and `dateSlotGenerator.ts`.
5. **R5**: Add `existingImages` and `keepImages` optional array decorators to `CreateVenueDto`.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Backend E2E Test Suite**:
   ```powershell
   cd D:\test-mobile-app\nest-server
   npm run test:e2e
   ```
   *Expected*: Existing 1,037-line test suite executes and passes against the test database.

2. **Verify Mobile Invariant Test Suites**:
   ```powershell
   cd D:\test-mobile-app
   node __tests__/verify_m1_challenger_stress.js
   node __tests__/verify_m1_invariants.js
   node __tests__/verify_m1_mobile_invariants.js
   ```
   *Expected*: Invariant assertions report passing status for storage, wallet, and booking models.

3. **Verify Dashboard Compilation**:
   ```powershell
   cd D:\test-mobile-app\dashboard
   npm run build
   ```
   *Expected*: TypeScript compiler and Vite bundle successfully without type errors.

4. **Inspect Key File Locations**:
   - `dashboard/src/components/venue/VenueFormModal.tsx`
   - `nest-server/src/modules/venue/dto/venue.dto.ts`
   - `nest-server/src/modules/venue/entities/venue.entity.ts`
   - `features/bookings/hooks/useBookingFlow.ts`
   - `features/bookings/components/SlotPicker.tsx`
