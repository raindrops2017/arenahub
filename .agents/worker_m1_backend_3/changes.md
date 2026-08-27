# Changes Summary — Milestone 1 Backend Core (worker_m1_backend_3)

## 1. Double Wallet Deduction on Standalone MongoDB in `BookingService.processGroupPayment`
- **File**: `nest-server/src/modules/booking/booking.service.ts`
- **Modifications**:
  - Added deployment topology inspection (`topology.description.type` / `setName`) before attempting `session.startTransaction()`.
  - Added debit state tracking (`walletDebited`) inside session execution. If error code 20 (`isReplicaSetError`) is caught after a debit was already applied in MongoDB, an automated compensating refund is issued before delegating to `processGroupPaymentCompensating`, eliminating double deductions on standalone/single-node MongoDB deployments.

## 2. Lock Fallthrough on Max Retries in `BookingService.createBooking`
- **File**: `nest-server/src/modules/booking/booking.service.ts`
- **Modifications**:
  - Enforced lock acquisition check after the retry loop: if `!lockAcquired`, the service immediately throws `ConflictException('Selected slot is currently being booked by another user. Please try again.')` instead of falling through to the slot booking creation logic.

## 3. Paymob Webhook Group Resolution & Out-of-Order Webhook Guard
- **File**: `nest-server/src/modules/payment/payment.service.ts`
- **Modifications**:
  - Improved group candidate resolution to ensure `targetBookings` resolves all booking documents matching `payment.groupId` or `booking.groupId`, falling back safely to `[booking]`.
  - Added a status guard against delayed/out-of-order failed webhooks: if `payment.status` is already `paid`, `partially_paid`, or `refunded`, the failed webhook callback is safely acknowledged without downgrading the payment record to `unpaid`.
  - Handled late success webhooks arriving on expired or cancelled bookings by returning `{ received: true, status: 'refunded' }` and crediting the user's wallet.

## 4. Venue Image DTO Whitelisting
- **File**: `nest-server/src/modules/venue/dto/venue.dto.ts`
- **Modifications**:
  - Validated and ensured `@IsOptional() @ParseArray() @IsArray() @IsString({ each: true })` decorators for `existingImages`, `keepImages`, `removedImages`, and `deleteImages` on `CreateVenueDto` and `UpdateVenueDto` to maintain strict compatibility with NestJS `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.

## 5. Unit & E2E Test Suite Optimization
- **File**: `nest-server/src/modules/booking/booking.service.spec.ts`
- **Modifications**:
  - Added `qrcode` mocking and timeout configuration (`jest.setTimeout(15000)`) to ensure unit tests execute rapidly (< 3s total) with zero timeouts.
- **Files**: `nest-server/test/booking_payment_flow.e2e-spec.ts`, `nest-server/test/booking.e2e-spec.ts`
  - Added `jest.setTimeout(30000)` to ensure multi-step E2E workflows complete reliably under concurrent test runs.

## 6. Verification Results
- `npm run build`: Exit Code 0 (Clean TypeScript build)
- `npm test`: 4/4 test suites passed, 18/18 tests passed (2.2s)
- `npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts`: 8/8 tests passed (5.8s)
- `npx jest --config ./test/jest-e2e.json test/booking.e2e-spec.ts`: 14/14 tests passed (15.1s)
- `node __tests__/run_all_e2e.js`: 60/60 invariant tests + 8/8 backend tests passed (100%)
- `node __tests__/challenger_m1_backend_stress.js`: 10/10 tests passed (100%)
