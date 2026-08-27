# Handoff Report — Challenger 1: Milestone 1 (Backend Core: R2, R3, R5)

**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Invariant Test Suite Execution
- **Command**: `node __tests__/e2e_booking_payment_suite.js`
  - **Result**: Passed 60 / 60 tests (100%). Validates multi-slot summation, minimum deposit per slot formulas, date normalization, and `CreateVenueDto` whitelisted keys.
- **Command**: `node __tests__/challenger_m1_backend_stress.js`
  - **Result**: Passed 10 / 10 tests (100%). Validates multi-slot non-continuous custom pricing, proportional penny-exact coupon allocation (no penny loss), multi-slot interval conflict collision logic, and idempotency request fingerprinting.

### 1.2 Empirical Defect 1: Standalone MongoDB Double-Debit Vulnerability in `BookingService.processGroupPayment`
- **File**: `nest-server/src/modules/booking/booking.service.ts` (lines 663–740)
- **Command**:
  ```bash
  cd nest-server && npx jest --config ./test/jest-e2e.json -t "should deduct wallet balance" test/booking.e2e-spec.ts
  ```
- **Verbatim Error**:
  ```
  FAIL test/booking.e2e-spec.ts
  ● Production Audit Suite: Wallet Atomicity, Booking Idempotency & Paymob Webhooks › A. Wallet Payment Atomicity & Invariant Proof › should deduct wallet balance, confirm booking, and create transaction record atomically in a MongoDB transaction

    expect(received).toBe(expected) // Object.is equality

    Expected: 300
    Received: 200

      229 |         filter: { userId: new Types.ObjectId(adminUserId) },
      230 |       });
    > 231 |       expect(updatedWallet?.balance).toBe(300);
          |                                      ^
  ```
- **Code Observation in `nest-server/src/modules/booking/booking.service.ts`**:
  ```typescript
  if (paymentMethod === PaymentMethodEnum.wallet) {
    let session: ClientSession | null = null;
    try {
      session = await this.connection.startSession();
      session.startTransaction();
    } catch {
      session = null;
    }

    if (session) {
      try {
        await this.walletService.payForBooking(
          user._id,
          amountToPay,
          createdBookings[0]._id.toString(),
          session, // <--- Passes session to findOneAndUpdate
        );
        ...
        await session.commitTransaction(); // <--- Throws MongoServerError: Transaction numbers are only allowed on a replica set member or mongos
      } catch (txnError: any) {
        ...
        const isReplicaSetError = txnError?.code === 20 || ...;
        if (isReplicaSetError) {
          return await this.processGroupPaymentCompensating({ ... }); // <--- Calls walletService.payForBooking A SECOND TIME without session!
        }
        throw txnError;
      }
    }
  }
  ```

### 1.3 Empirical Defect 2: E2E Test Suite Timeout & Test Cascading Collisions
- **Command**:
  ```bash
  cd nest-server && npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts
  ```
- **Verbatim Error**:
  ```
  FAIL test/booking_payment_flow.e2e-spec.ts (26.988 s)
    × T1-R4-01: should lock all hourly sub-slots in interval [startTime, endTime) upon booking (8315 ms)
      thrown: "Exceeded timeout of 5000 ms for a test."
    × T1-R2-01: should accept slots array in CreateBookingDto and assign groupId (208 ms)
      expect(received).toContain(expected)
      Expected value: 400
      Received array: [201, 200]
  ```
- **Root Cause**: In `booking_payment_flow.e2e-spec.ts`, test `T1-R4-01` executes 4 sequential HTTP booking requests with QR generation and lock checks taking ~8.3s, which exceeds Jest's default 5000ms timeout. When aborted mid-flight, Redis locks and DB entries remain dirty, causing subsequent test `T1-R2-01` to fail with HTTP 400.

### 1.4 Empirical Defect 3: `__tests__/verify_m1_challenger_stress.js` Node Execution Failure
- **Command**: `node __tests__/verify_m1_challenger_stress.js`
- **Verbatim Error**:
  ```
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'D:\test-mobile-app\dashboard\src\data\mockStore' imported from D:\test-mobile-app\__tests__\verify_m1_challenger_stress.js
  ```
- When run with `npx tsx`, `storageService.ts` attempts to `require('./assets/images/fallback_ad_banner.jpg')`, failing with `SyntaxError: Invalid or unexpected token`.

---

## 2. Logic Chain

1. **Multi-Slot & Group Pricing Logic (R2, R3, R5)**:
   - Verified that `CreateBookingDto` supports both `slots?: BookingSlotDto[]` and backward-compatible `startTime`/`endTime` integers.
   - Group pricing iterates across all requested slots, correctly evaluating custom hour prices or default hour prices.
   - Minimum deposit is calculated as `slots.length * venue.minimumDepositAmount` and clamped to `groupFinalPrice`. If deposit is less than total cost, `paymentStatus` is set to `PaymentStatusEnum.partially_paid`.
   - Proportional coupon discount allocation divides the discount proportionally with penny-exact rounding on the final slot (`groupDiscountAmount - allocatedDiscount`).
   - All invariant tests pass cleanly in `e2e_booking_payment_suite.js` and `challenger_m1_backend_stress.js`.

2. **Standalone Mongo Session Fallback Double Debit**:
   - In single-instance MongoDB environments (used in development, testing, and single-node setups), `session.startTransaction()` marks the session as active, but MongoDB does not enforce multi-document isolation without replica set clustering.
   - When `walletService.payForBooking(..., session)` executes `findOneAndUpdate({ balance: { $gte: amount } }, { $inc: { balance: -amount } })`, the deduction of 200 EGP commits immediately to the database.
   - When `session.commitTransaction()` is invoked, MongoDB driver throws `MongoServerError: Transaction numbers are only allowed on a replica set member`.
   - The catch block in `BookingService` catches this error as `isReplicaSetError` and calls `this.processGroupPaymentCompensating`, which executes `this.walletService.payForBooking` AGAIN without a session.
   - As a result, the user's wallet is debited twice (e.g. 500 - 200 - 200 = 100 EGP instead of 300 EGP).
   - This directly breaks financial correctness and wallet invariant atomicity.

3. **E2E Test Runner Timeouts**:
   - The NestJS E2E test suites do not configure `jest.setTimeout(30000)`.
   - Long-running multi-request tests (`T1-R4-01` in `booking_payment_flow.e2e-spec.ts` and concurrent tests in `booking.e2e-spec.ts`) exceed 5000ms and fail.

---

## 3. Caveats

- In a production environment with a configured MongoDB Replica Set (3+ nodes), `session.startTransaction()` and `commitTransaction()` succeed without entering `processGroupPaymentCompensating`. However, fallback compensating logic is designed specifically for non-replica set environments and MUST NOT double debit when activated.
- All core business schemas, DTOs, and controllers for R2, R3, and R5 are structurally sound and complete.

---

## 4. Conclusion & Required Changes

The Milestone 1 implementation is architecturally solid but **CANNOT BE APPROVED** until the following 2 issues are resolved:

### Action Items for Worker M1:
1. **Fix Standalone MongoDB Session Double-Debit Bug** in `nest-server/src/modules/booking/booking.service.ts`:
   - Either check replica set support prior to starting a transaction, or in `processGroupPayment`, do not attempt `session.startTransaction()` if MongoDB is not running as a replica set, OR if `payForBooking` was already executed in the try block, do not re-run `payForBooking` in `processGroupPaymentCompensating` without checking if the deduction already occurred.
2. **Fix E2E Test Suite Timeouts & State Isolation**:
   - In `nest-server/test/booking_payment_flow.e2e-spec.ts` and `nest-server/test/booking.e2e-spec.ts`, add `jest.setTimeout(30000);` in `beforeAll` to allow multi-step E2E tests to complete without timing out.
   - Ensure test slots/dates do not collide across tests in the same run.
3. **Verify All E2E Tests Pass 100%**:
   - `cd nest-server && npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts`
   - `cd nest-server && npx jest --config ./test/jest-e2e.json test/booking.e2e-spec.ts`

---

## 5. Verification Method

To independently reproduce and verify:

1. **Reproduce Double-Debit Bug**:
   ```bash
   cd nest-server && npx jest --config ./test/jest-e2e.json -t "should deduct wallet balance" test/booking.e2e-spec.ts
   ```
   *Expected Current Output*: Fails with `Expected: 300, Received: 200` (proving double deduction of 200 EGP).

2. **Reproduce E2E Test Suite Timeout**:
   ```bash
   cd nest-server && npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts
   ```
   *Expected Current Output*: Fails on `T1-R4-01` with `Exceeded timeout of 5000 ms`.

3. **Verify Invariant Suite**:
   ```bash
   node __tests__/challenger_m1_backend_stress.js
   node __tests__/e2e_booking_payment_suite.js
   ```
   *Expected Output*: All tests pass 100%.
