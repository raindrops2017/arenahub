# Forensic Audit Report — Milestone 1 (Backend Core: R2, R3, R5)

**Work Product**: NestJS Backend Core (`nest-server/src/modules/booking/`, `nest-server/src/modules/venue/`, `nest-server/src/modules/payment/`, `nest-server/src/common/enums/bookingEnum.ts`)
**Profile**: General Project
**Integrity Mode**: Development
**Verdict**: CLEAN

---

## 1. Observation

Direct code inspections and empirical execution results:

### A. Schema Persistence & DTO Verification
1. **`groupId` Schema Persistence**:
   - `nest-server/src/modules/booking/entities/booking.entity.ts` (lines 27–28):
     ```typescript
     @Prop({ type: String, index: true })
     groupId?: string;
     ```
   - `nest-server/src/modules/payment/entities/payment.entity.ts` (lines 23–24):
     ```typescript
     @Prop({ type: String, index: true })
     groupId?: string;
     ```
   - `nest-server/src/modules/booking/dto/booking.dto.ts` (lines 65–94, 113–126):
     ```typescript
     export class BookingSlotDto {
       @Type(() => Number) @IsInt() @Min(0) @Max(23) @IsNotEmpty()
       startTime: number;
       @Type(() => Number) @IsInt() @Min(1) @Max(24) @IsNotEmpty() @IsGreaterThan('startTime')
       endTime: number;
     }
     // In CreateBookingDto:
     @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BookingSlotDto)
     slots?: BookingSlotDto[];
     ```
2. **`minimumDepositAmount` & `partially_paid` Persistence**:
   - `nest-server/src/common/enums/bookingEnum.ts` (lines 9–15):
     ```typescript
     export enum PaymentStatusEnum {
       unpaid = 'unpaid',
       paid = 'paid',
       partially_paid = 'partially_paid',
       refunded = 'refunded',
       pay_at_venue = 'pay_at_venue',
     }
     ```
   - `nest-server/src/modules/venue/entities/venue.entity.ts` (lines 94–95):
     ```typescript
     @Prop({ type: Number, default: 0 })
     minimumDepositAmount?: number;
     ```
   - `nest-server/src/modules/venue/dto/venue.dto.ts` (lines 148–158):
     ```typescript
     @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
     minimumDepositAmount?: number;
     ```
   - Persisted in `VenueService.createVenue` (line 189) and `updateVenue` (lines 270–271).
3. **`existingImages` Compatibility Fix (R5)**:
   - `nest-server/src/modules/venue/dto/venue.dto.ts` (lines 160–198):
     ```typescript
     @IsOptional() @ParseArray() @IsArray() @IsString({ each: true })
     existingImages?: string[];
     @IsOptional() @ParseArray() @IsArray() @IsString({ each: true })
     keepImages?: string[];
     @IsOptional() @ParseArray() @IsArray() @IsString({ each: true })
     removedImages?: string[];
     @IsOptional() @ParseArray() @IsArray() @IsString({ each: true })
     deleteImages?: string[];
     ```
   - Persisted and merged with newly uploaded files in `VenueService.createVenue` (lines 158–174) and `updateVenue` (lines 314–364).

### B. Business Logic Authenticity
1. **Multi-Slot Booking Creation & Conflict Detection**:
   - `BookingService.createBooking` (`nest-server/src/modules/booking/booking.service.ts` lines 156–198):
     - Validates operating hours and rejects past slots across all elements of `rawSlots`.
     - Validates internal collisions: pairwise iteration rejecting overlapping slot intervals in the same request.
     - Acquires Redis distributed lock (`lock::booking::venue::{venueId}::{date}`) before checking database overlaps.
     - Database collision query uses `$or` conditions matching `startTime < slot.endTime && endTime > slot.startTime` against existing pending/confirmed bookings.
     - Generates discrete `Booking` documents per slot with unique `bookingCode`, distinct QR payload, and shared `groupId: randomUUID()`.
2. **Deposit & Pricing Calculation**:
   - Computes standard / custom hourly pricing per slot (`lines 388–417`).
   - Distributes promotional coupon discounts proportionally per slot (`lines 458–495`).
   - Minimum deposit required computed as `rawSlots.length * venue.minimumDepositAmount` (`lines 500–508`).
   - If `amountToPay < groupFinalPrice`, sets `targetPaymentStatus = PaymentStatusEnum.partially_paid`.
3. **Paymob Group Sessions & Webhook Resolution**:
   - `BookingService.processGroupPayment` (`lines 795–859`): Initiates a unified Paymob intention for `amountToPay` over the group, creates a single `Payment` record with `groupId`.
   - `PaymentService.handlePaymobWebhook` (`nest-server/src/modules/payment/payment.service.ts` lines 474–800): Resolves all bookings in `groupId`, marks each booking in the group as `confirmed` and `paid` or `partially_paid` depending on deposit status, and verifies timing-safe HMAC SHA-512.

### C. Forensic Anti-Cheating Analysis
- **Hardcoded test outputs**: NONE. No mock branch shortcuts or hardcoded responses detected in business logic.
- **Facade implementations**: NONE. All endpoints connect genuine Mongoose schemas, transactions, Redis locks, and Paymob integrations.
- **Fabricated verification outputs**: NONE. Tests were freshly compiled and executed directly in the runtime environment.

---

## 2. Logic Chain

1. **Requirement R2 (Multi-Slot Booking & Group ID)**:
   - Checked: `Booking.groupId` and `Payment.groupId` are present in Mongoose schemas with indexes.
   - Checked: `CreateBookingDto` accepts `slots?: BookingSlotDto[]` while maintaining optional `startTime`/`endTime` for backward compatibility.
   - Checked: `createBooking` creates distinct booking documents per slot linked by a shared `groupId` and processes unified group payment.
   - Conclusion: R2 is fully satisfied with genuine, robust multi-slot support.

2. **Requirement R3 (Minimum Deposit Per Slot)**:
   - Checked: `Venue.minimumDepositAmount` is defined in entity and DTOs.
   - Checked: `PaymentStatusEnum.partially_paid` is added and integrated across models and services.
   - Checked: Deposit calculation calculates `slots.length * venue.minimumDepositAmount`, capping at total group price and setting `partially_paid` status.
   - Conclusion: R3 is authentically implemented and fully verified.

3. **Requirement R5 (Venue Creation Bug Fix)**:
   - Checked: `CreateVenueDto` and `UpdateVenueDto` declare and transform `existingImages`, `keepImages`, `removedImages`, and `deleteImages`.
   - Checked: `VenueService` combines existing and uploaded image URLs into the venue's `images` array.
   - Checked: Plural amenity names (e.g. `'Showers'`) are normalized and accepted.
   - Conclusion: R5 is completely resolved and verified against strict `ValidationPipe`.

4. **Empirical Execution**:
   - `npm run build`: Exits with code 0 (0 compilation errors).
   - `jest --runInBand`: 4 suites, 18 tests PASS (100% pass rate).
   - `jest test/booking_payment_flow.e2e-spec.ts`: 8 tests PASS (100% pass rate).

---

## 3. Caveats

- In test environments where `REDIS_URI` is not configured, Redis service operates in offline mode with in-memory lock fallback, which gracefully handles single-node execution.
- Paymob HMAC enforcement is disabled by default in local development mode (`PAYMOB_ENFORCE_HMAC !== 'true'`) allowing test webhooks to execute without real Paymob secrets, while strictly enforcing timing-safe HMAC comparison when configured or in production.

---

## 4. Conclusion

The Milestone 1 (Backend Core: R2, R3, R5) implementation is **CLEAN**, robust, production-grade, and free of any integrity violations or deceptive facades.

**Final Forensic Verdict**: **CLEAN**

---

## 5. Verification Method

To independently reproduce the verification:

1. **Compilation**:
   ```bash
   cd D:/test-mobile-app/nest-server && npm run build
   ```
   *Expected*: Code 0, 0 TypeScript errors.

2. **Unit Test Execution**:
   ```bash
   cd D:/test-mobile-app/nest-server && npx jest --runInBand
   ```
   *Expected*: 4 test suites pass (18/18 tests pass).

3. **Milestone E2E Test Execution**:
   ```bash
   cd D:/test-mobile-app/nest-server && npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts
   ```
   *Expected*: 8/8 tests pass.
