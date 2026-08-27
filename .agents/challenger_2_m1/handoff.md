# Empirical Challenge Report — Milestone 1 (Backend Core: R2, R3, R5)

**Challenger**: Challenger 2 (Empirical Adversarial Challenger)  
**Verdict**: **APPROVE**  
**Date**: 2026-08-24  

---

## 1. Observation

Direct empirical observations from executing verification commands and inspecting the codebase:

### 1.1 Minimum Deposit Calculation (`slots.length * venue.minimumDepositAmount`)
- In `nest-server/src/modules/booking/booking.service.ts` (lines 500–508):
  ```typescript
  if (
    venue.minimumDepositAmount !== undefined &&
    venue.minimumDepositAmount !== null &&
    venue.minimumDepositAmount > 0
  ) {
    const depositRequired =
      rawSlots.length * venue.minimumDepositAmount;
    amountToPay = Math.min(depositRequired, groupFinalPrice);
    isDepositOnly = amountToPay < groupFinalPrice;
  }
  ```
- In `nest-server/src/modules/payment/payment.service.ts` (lines 93–106):
  ```typescript
  if (
    venue?.minimumDepositAmount !== undefined &&
    venue?.minimumDepositAmount !== null &&
    venue.minimumDepositAmount > 0
  ) {
    const depositRequired =
      targetBookings.length * venue.minimumDepositAmount;
    paymentAmount = Math.min(depositRequired, totalGroupFinalPrice);
    isDepositOnly = paymentAmount < totalGroupFinalPrice;
  }
  const targetPaymentStatus = isDepositOnly
    ? PaymentStatusEnum.partially_paid
    : PaymentStatusEnum.paid;
  ```
- **Scenario A (Deposit < Total Price)**: Tested in `adversarial_challenge_m1.e2e-spec.ts` (CH-01) with 3 slots @ 200 EGP (total 600 EGP) and deposit of 50 EGP/slot.
  - Calculated `depositRequired = 3 * 50 = 150 EGP`.
  - `amountToPay = 150 EGP`, `isDepositOnly = true`.
  - HTTP 201 response returned `payment.amount: 150`, `payment.totalDue: 600`, `payment.isDeposit: true`, and `payment.status: partially_paid`.
  - MongoDB database verification confirmed all 3 booking records transitioned to `status: confirmed` and `paymentStatus: partially_paid`.
  - Wallet balance debited exactly 150 EGP (from 500 to 350 EGP).
- **Scenario B (Deposit >= Total Price / Clamping Boundary)**: Tested in `adversarial_challenge_m1.e2e-spec.ts` (CH-02) with 1 slot @ 150 EGP and venue deposit of 500 EGP.
  - Calculated `depositRequired = 1 * 500 = 500 EGP`, `amountToPay = Math.min(500, 150) = 150 EGP`.
  - `isDepositOnly = (150 < 150) = false`.
  - HTTP 201 response returned `payment.amount: 150`, `payment.isDeposit: false`, and `payment.status: paid`.
  - Booking correctly marked as `paid` (NOT `partially_paid`), preventing incorrect deposit flags when the entire booking cost is paid upfront.
- **Scenario C (Zero/Null Deposit)**: Tested in `adversarial_challenge_m1.e2e-spec.ts` (CH-03). 2 slots @ 250 EGP = 500 EGP. `amountToPay = 500 EGP`, status is `paid`.

### 1.2 Payment Status Transitions (`partially_paid` vs `paid`)
- In `nest-server/src/common/enums/bookingEnum.ts` (line 12):
  ```typescript
  export enum PaymentStatusEnum {
    unpaid = 'unpaid',
    paid = 'paid',
    partially_paid = 'partially_paid',
    refunded = 'refunded',
    pay_at_venue = 'pay_at_venue',
  }
  ```
- In `nest-server/src/modules/payment/payment.service.ts` (lines 678–686):
  ```typescript
  const totalGroupDue = targetBookings.reduce(
    (sum, b) => sum + (b.finalPrice ?? b.totalPrice ?? 0),
    0,
  );
  const isDeposit = payment.amount < totalGroupDue;
  const targetPaymentStatus = isDeposit
    ? PaymentStatusEnum.partially_paid
    : PaymentStatusEnum.paid;
  ```
- **Scenario A (Paymob Webhook Deposit Transition)**: Tested in `adversarial_challenge_m1.e2e-spec.ts` (CH-04).
  - Webhook callback for deposit amount (100 EGP on 400 EGP booking) updated payment record and all associated group bookings to `partially_paid` and `confirmed`.
- **Scenario B (Paymob Webhook Full Payment Transition)**: Tested in `adversarial_challenge_m1.e2e-spec.ts` (CH-05).
  - Webhook callback for full amount (250 EGP on 250 EGP booking) updated payment record and booking to `paid` and `confirmed`.

### 1.3 Strict NestJS ValidationPipe Testing (`POST /venue`)
- In `nest-server/src/modules/venue/dto/venue.dto.ts` (lines 150–198):
  - `minimumDepositAmount`: `@IsOptional() @IsNumber() @Min(0) @Type(() => Number)`
  - `existingImages`: `@IsOptional() @ParseArray() @IsArray() @IsString({ each: true })`
  - `keepImages`: `@IsOptional() @ParseArray() @IsArray() @IsString({ each: true })`
  - `removedImages`: `@IsOptional() @ParseArray() @IsArray() @IsString({ each: true })`
  - `deleteImages`: `@IsOptional() @ParseArray() @IsArray() @IsString({ each: true })`
- Tested across 6 adversarial validation tests in `adversarial_challenge_m1.e2e-spec.ts` (CH-06 through CH-11):
  - Array of strings `['https://...1', 'https://...2']` -> **HTTP 201 (0 errors)**.
  - JSON stringified array `'["https://...1", "https://...2"]'` -> **HTTP 201 (0 errors)**.
  - Comma-separated string with irregular whitespace `'  https://...1 ,  https://...2  '` -> **HTTP 201 (0 errors)**.
  - Empty array `[]` and whitespace `'   '` -> **HTTP 201 (0 errors)**.
  - Injected forbidden property `{ injectedForbiddenField: 'exploit_attempt' }` -> **HTTP 400 (`property injectedForbiddenField should not exist`)** strictly rejected by `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.
  - Negative `minimumDepositAmount: -50` -> **HTTP 400 (`minimumDepositAmount must not be less than 0`)** strictly rejected.

### 1.4 Test Suite Execution Telemetry
1. `nest-server/test/booking_payment_flow.e2e-spec.ts`:
   - Command: `npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts --runInBand --testTimeout=30000`
   - Result: **8 passed, 8 total** (Time: 9.65s).
2. `nest-server/test/adversarial_challenge_m1.e2e-spec.ts`:
   - Command: `npx jest --config ./test/jest-e2e.json test/adversarial_challenge_m1.e2e-spec.ts --runInBand --testTimeout=30000`
   - Result: **11 passed, 11 total** (Time: 11.75s).
3. `nest-server/test/booking.e2e-spec.ts`:
   - Command: `npx jest --config ./test/jest-e2e.json test/booking.e2e-spec.ts --runInBand --testTimeout=30000`
   - Result: **14 passed, 14 total** (Time: 22.38s).
4. Unit Tests (`npm test`):
   - Result: **18 passed, 18 total across 4 test suites** (coupon, venue, booking, payment).
5. Master Invariant Runner (`node __tests__/e2e_booking_payment_suite.js`):
   - Result: **60 passed, 60 total (100.0% pass rate)**.
6. TypeScript Compilation (`npm run build`):
   - Result: **Exit Code 0 (0 compilation errors)**.

---

## 2. Logic Chain

1. **Deposit Calculation Correctness (Observation §1.1)**:
   - For multi-slot bookings, the required deposit is calculated strictly as `rawSlots.length * venue.minimumDepositAmount`.
   - The formula clamps via `Math.min(depositRequired, groupFinalPrice)` so that when the deposit per slot exceeds the actual hourly price (e.g. Peak vs Off-peak custom rates or high deposit settings), the user is never overcharged beyond total price.
   - When clamped to total price, `isDepositOnly` evaluates to `false`, correctly setting `paid` status rather than `partially_paid`.
2. **State Transition Accuracy (Observation §1.2)**:
   - When a deposit is paid (via wallet or Paymob), all reservations linked by `groupId` transition to `confirmed` and `paymentStatus: partially_paid`.
   - When full payment is settled, all reservations linked by `groupId` transition to `confirmed` and `paymentStatus: paid`.
   - Paymob webhooks match by `groupId` or `transactionId` and atomically transition all child reservations within the group.
3. **DTO Schema & Sanitization Robustness (Observation §1.3)**:
   - The dashboard and third-party callers can submit `existingImages`, `keepImages`, `removedImages`, and `deleteImages` as either standard JSON arrays or multipart form-data CSV/JSON strings with arbitrary whitespace.
   - Custom `@ParseArray()` decorators normalize input into clean `string[]` before `class-validator` executes, completely eliminating HTTP 400 whitelist rejection errors while retaining strict `forbidNonWhitelisted: true` security protection.
4. **Empirical Proof Across Full Test Suite (Observation §1.4)**:
   - All 8 tests in `booking_payment_flow.e2e-spec.ts`, all 11 tests in `adversarial_challenge_m1.e2e-spec.ts`, all 14 tests in `booking.e2e-spec.ts`, and all 60 domain invariant tests pass 100% with live MongoDB queries and HTTP assertions.

---

## 3. Caveats

- **Test Concurrency / DB Isolation**: When running multiple Jest suites concurrently against the same local MongoDB database without distinct database names, tests that mutate the same admin user wallet or book overlapping hours on standard venues must be executed sequentially (`--runInBand`) to avoid collision. This is standard for integration suites sharing stateful databases and does not indicate a production logic issue.
- **Client-Side UI Scope**: Mobile UI components and dashboard modals are in scope for M2/M3. Backend API contracts and DTO validations are fully compatible and ready for frontend integration.

---

## 4. Conclusion

**Verdict: APPROVE**

Requirements **R2 (Multi-Slot Group Bookings)**, **R3 (Minimum Deposit & `partially_paid`)**, and **R5 (Venue Creation & DTO Whitelist Compatibility)** have been thoroughly stress-tested and empirically validated against live HTTP requests and MongoDB transactions. The implementation is robust, complete, and fully adheres to the specifications in `ORIGINAL_REQUEST.md` and `PROJECT.md`.

---

## 5. Verification Method

To independently reproduce and verify this assessment:

```bash
# 1. Verify NestJS TypeScript build
cd D:/test-mobile-app/nest-server && npm run build

# 2. Run NestJS Unit Tests
cd D:/test-mobile-app/nest-server && npm test

# 3. Run Backend E2E Test Suite (R1 - R5)
cd D:/test-mobile-app/nest-server && npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts --runInBand --testTimeout=30000

# 4. Run Adversarial Empirical Challenge Suite
cd D:/test-mobile-app/nest-server && npx jest --config ./test/jest-e2e.json test/adversarial_challenge_m1.e2e-spec.ts --runInBand --testTimeout=30000

# 5. Run Domain Invariant Suite (60 tests)
cd D:/test-mobile-app && node __tests__/e2e_booking_payment_suite.js
```
