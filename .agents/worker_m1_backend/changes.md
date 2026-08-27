# Changes Summary — Milestone 1 Backend Core (R2, R3, R5)

## 1. R2: Multi-Slot Booking & Group ID
- **`nest-server/src/modules/booking/entities/booking.entity.ts`**:
  - Added `@Prop({ type: String, index: true }) groupId?: string;` to group bookings reserved together in the same checkout session.
- **`nest-server/src/modules/booking/dto/booking.dto.ts`**:
  - Added `BookingSlotDto` with `startTime` and `endTime` (with `@isGreaterThan('startTime')`).
  - Added `@IsOptional() @ValidateNested({ each: true }) @Type(() => BookingSlotDto) slots?: BookingSlotDto[];` to `CreateBookingDto`.
  - Made legacy `startTime` and `endTime` optional to maintain backward compatibility for single-slot requests.
- **`nest-server/src/modules/payment/entities/payment.entity.ts`**:
  - Added `@Prop({ type: String, index: true }) groupId?: string;` to track payments covering multiple slots in a group. Made `bookingId` optional.
- **`nest-server/src/modules/booking/booking.service.ts`**:
  - Updated `computeRequestFingerprint` to handle both `slots` array and single slot formats for deterministic idempotency key computation.
  - Implemented multi-slot validation in `createBooking`:
    - Checks past slots and venue working hours for all slots.
    - Rejects internal collisions (overlapping slots within the same request).
    - Checks database collisions for all requested slots against existing confirmed/pending bookings.
    - Acquires Redis distributed lock across all requested slots.
    - Calculates total price and proportionally distributes discounts across all slots.
    - Generates a shared `groupId: randomUUID()` and creates individual `Booking` documents per slot (with unique `bookingCode` and `qrCode`).
    - Implemented `processGroupPayment` & `processGroupPaymentCompensating` to handle wallet deduction, cash marking, and Paymob payment intention for the entire group upfront.
    - Returns `{ groupId, bookings, booking, payment }` for backward compatibility.
- **`nest-server/src/modules/payment/payment.service.ts`**:
  - `createPayment`: Resolves all bookings by `booking.groupId` and processes payment for the whole group.
  - `markCashPaid`: Updates all bookings in the group to `status: confirmed, paymentStatus: paid`.
  - `refundPayment`: Refills user wallet and marks all group bookings as `cancelled` and `refunded`.
  - `handlePaymobWebhook`: Searches payments and bookings by `groupId` candidates; updates all bookings in the group to confirmed and paid/partially_paid on success.

## 2. R3: Minimum Deposit Per Slot
- **`nest-server/src/common/enums/bookingEnum.ts`**:
  - Added `partially_paid = 'partially_paid'` to `PaymentStatusEnum`.
- **`nest-server/src/modules/venue/entities/venue.entity.ts`**:
  - Added `@Prop({ type: Number, default: 0 }) minimumDepositAmount?: number;` to `Venue` schema.
- **`nest-server/src/modules/venue/dto/venue.dto.ts`**:
  - Added `@IsOptional() @IsNumber() @Min(0) @Type(() => Number) minimumDepositAmount?: number;` to `CreateVenueDto` and `UpdateVenueDto`.
- **`nest-server/src/modules/venue/venue.service.ts`**:
  - Persisted `minimumDepositAmount` in `createVenue` and `updateVenue`.
- **`nest-server/src/modules/booking/booking.service.ts` & `nest-server/src/modules/payment/payment.service.ts`**:
  - Calculated required deposit as `slots.length * venue.minimumDepositAmount` (capped at `groupFinalPrice`).
  - When `amountToPay < groupFinalPrice`, sets `paymentStatus: PaymentStatusEnum.partially_paid` and `status: BookingStatusEnum.confirmed`.

## 3. R5: Fix Venue Creation Bug (existingImages support)
- **`nest-server/src/modules/venue/dto/venue.dto.ts`**:
  - Whitelisted `existingImages`, `keepImages`, `removedImages`, `deleteImages` with `@ParseArray() @IsArray() @IsString({ each: true })` against strict NestJS `ValidationPipe` (`forbidNonWhitelisted: true`).
- **`nest-server/src/modules/venue/venue.service.ts`**:
  - Merged `existingImages` and `keepImages` into `images` array during `createVenue`.
  - Enhanced amenity matching in `createVenue` and `updateVenue` to support singular/plural variations (e.g. `'Showers'` -> `'Shower'`).

## 4. Tests Added & Verification Results
- **`nest-server/src/modules/venue/venue.service.spec.ts`**:
  - Verified venue creation with `existingImages`, `keepImages`, and `minimumDepositAmount`.
- **`nest-server/src/modules/booking/booking.service.spec.ts`**:
  - Verified multi-slot reservation with shared `groupId`.
  - Verified backward compatibility for single-slot request.
  - Verified internal slot collision rejection and database overlap collision rejection.
  - Verified minimum deposit per slot calculation and `partially_paid` payment status.
  - Verified Paymob group payment intention generation.
- **`nest-server/src/modules/payment/payment.service.spec.ts`**:
  - Verified Paymob webhook group resolution for full payment and partial deposit payments.
- **E2E Test Suites**:
  - `test/booking_payment_flow.e2e-spec.ts`: 8/8 tests PASS.
  - `test/booking.e2e-spec.ts`: 14/14 tests PASS.
  - Total unit tests: 18/18 tests PASS.
  - NestJS Build: `npm run build` PASS (0 compilation errors).
