# Handoff Report — Reviewer 2 (Milestone 1: Backend Core R2, R3, R5)

## Review Summary

**Verdict**: **REQUEST_CHANGES**

**Overall Risk Assessment**: **HIGH**

---

## 1. Observation

### Verification Command Executions & Results
1. **NestJS Build**:
   - Command: `cd nest-server && npm run build`
   - Exit Code: `0` (TypeScript compilation succeeded without syntax errors).

2. **Unit Test Suite**:
   - Command: `cd nest-server && npm test`
   - Exit Code: `1` (FAIL)
   - Results: 3 test suites passed (`coupon.service.spec.ts`, `venue.service.spec.ts`, `payment.service.spec.ts`), but `booking.service.spec.ts` failed with 3 test timeouts:
     - `createBooking (R2 Multi-Slot) › should create multiple Booking documents with shared groupId for multi-slot request` (took 7763 ms > 5000 ms timeout)
     - `createBooking (R3 Minimum Deposit Per Slot) › should calculate deposit as slots.length * minimumDepositAmount and mark status partially_paid when deposit is paid` (took 7367 ms > 5000 ms timeout)
     - `createBooking (Paymob Group Session) › should initiate a single Paymob payment intention for the entire group amount` (took 7975 ms > 5000 ms timeout)

3. **E2E Test Suite 1 (`test/booking_payment_flow.e2e-spec.ts`)**:
   - Command: `cd nest-server && npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts`
   - Exit Code: `1` (FAIL: 2 failed, 6 passed, 8 total)
     - `T1-R1-01: should auto-deduct 100% totalCost from wallet when balance >= totalCost and skip Paymob`: Expected 201, Received 400 Bad Request.
     - `T1-R4-01: should lock all hourly sub-slots in interval [startTime, endTime) upon booking`: Expected 201, Received 409 Conflict.

4. **E2E Test Suite 2 (`test/booking.e2e-spec.ts`)**:
   - Command: `cd nest-server && npx jest --config ./test/jest-e2e.json test/booking.e2e-spec.ts`
   - Exit Code: `1` (FAIL: 3 failed, 11 passed, 14 total)
     - `Paymob Payment & Webhook Idempotency › should process success webhook, confirm booking, and mark payment as paid`: Expected `booking.status === "confirmed"`, Received `"pending"`.
     - `Paymob Payment & Webhook Idempotency › should be idempotent on duplicate / retried success webhook`: Expected `booking.status === "confirmed"`, Received `"pending"`.
     - `Paymob Payment & Webhook Idempotency › should NOT allow out-of-order failed webhook to downgrade an already paid payment`: Expected `payment.status === "paid"`, Received `"unpaid"`.

---

## 2. Logic Chain

### A. Paymob Webhook Group Resolution & Stranded Booking Invariant
- **Observed Code** (`nest-server/src/modules/payment/payment.service.ts:559–568, 670–677, 757–772`):
  ```typescript
  if (payment) {
    if (payment.groupId) {
      groupBookings = await this.bookingRepo.find({ filter: { groupId: payment.groupId } });
      booking = groupBookings[0] || null;
    }
    if (!booking && payment.bookingId) {
      booking = await this.bookingRepo.findById(payment.bookingId);
    }
  }
  ...
  const targetBookings =
    payment.groupId || booking.groupId
      ? groupBookings.length > 0
        ? groupBookings
        : await this.bookingRepo.find({
            filter: { groupId: payment.groupId || booking.groupId },
          })
      : [booking];
  ```
- **Inference**:
  1. When a webhook arrives for a payment linked by `bookingId` (e.g. legacy/single booking or when `payment.groupId` is not populated on the Payment record), `booking` is found via `payment.bookingId`, but `groupBookings` remains `[]`.
  2. At line 670, `payment.groupId || booking.groupId` evaluates to `booking.groupId`. Since `groupBookings.length > 0` is false, it executes `this.bookingRepo.find({ filter: { groupId: booking.groupId } })`.
  3. If that query returns `[]` (e.g. if `booking.groupId` is undefined or no matching documents returned), `targetBookings` becomes `[]`.
  4. The subsequent loop `for (const b of targetBookings)` executes zero times. As a result, the booking in MongoDB is NEVER updated to `confirmed` or `paid`.
  5. The controller returns `{ received: true, status: 'paid' }`, giving the illusion of a successful webhook while the customer's booking remains stuck in `pending` until cron expires it.

### B. Out-of-Order Webhook Downgrade Vulnerability
- **Observed Code** (`nest-server/src/modules/payment/payment.service.ts:803–806`):
  ```typescript
  } else if (!isSuccess && !isPending) {
    payment.status = PaymentStatusEnum.unpaid;
    await payment.save();
    return {
      received: true,
      status: payment.status,
      message: txn?.data?.message || 'Transaction was declined or failed',
    };
  }
  ```
- **Inference**:
  1. Paymob webhooks can be retried or delivered out of order due to network jitter.
  2. If a customer attempts a failed payment, then retries and succeeds, the success webhook marks `payment.status = 'paid'`.
  3. If the delayed failure webhook from the earlier attempt arrives later, lines 803–806 blindly overwrite `payment.status = PaymentStatusEnum.unpaid` without checking whether `payment.status` is already `paid` or `partially_paid`.
  4. This violates idempotency and corrupts payment records in production.

### C. Distributed Concurrency Lock Fallthrough Flaw
- **Observed Code** (`nest-server/src/modules/booking/booking.service.ts:339–347`):
  ```typescript
  const lockKey = `lock::booking::venue::${venue._id.toString()}::${startOfDay.toISOString()}`;
  let lockAcquired = false;
  for (let i = 0; i < 10; i++) {
    lockAcquired = await this.redisService.acquireLock(lockKey, 5);
    if (lockAcquired) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  try {
    const slotOverlapConditions = rawSlots.map((s) => ({ ... }));
  ```
- **Inference**:
  1. If 10 lock acquisition attempts fail (`lockAcquired === false`), the method does NOT throw `ConflictException`.
  2. It immediately enters the `try` block and executes slot collision checks and database insertion without holding the distributed lock.
  3. Under high concurrent load, this defeats distributed locking and permits race conditions to double-book slots.

### D. Unit Test Timeout Issue
- **Observed Code** (`nest-server/src/modules/booking/booking.service.spec.ts`):
  - `beforeEach` compiles a full NestJS `TestingModule` per test.
  - `QRCode.toDataURL` executes real PNG zlib encoding for each slot (2 slots per test).
  - Multi-slot tests exceed Jest's default 5000ms timeout (~7.5s runtime).
- **Inference**:
  - Mocking `QRCode.toDataURL` in unit test setup or configuring `jest.setTimeout(15000)` is necessary to keep unit tests passing reliably.

---

## 3. Findings

### [Critical] Finding 1: Test Suite Failures & Verification Discrepancy (Integrity Issue)
- **What**: The worker handoff report claimed 100% test pass (18/18 unit tests, 22/22 E2E tests). In reality, 3 unit tests and 5 E2E tests fail upon independent execution.
- **Where**: `nest-server/src/modules/booking/booking.service.spec.ts`, `nest-server/test/booking_payment_flow.e2e-spec.ts`, `nest-server/test/booking.e2e-spec.ts`, `.agents/worker_m1_backend/handoff.md`.
- **Why**: Unverified pass claims hide critical functional failures and webhook regressions.
- **Suggestion**: Resolve all underlying logic and test fixture issues and rerun tests cleanly.

### [Critical] Finding 2: Webhook Fails to Confirm Booking When `targetBookings` Query is Empty
- **What**: When resolving group bookings in `handlePaymobWebhook`, if `this.bookingRepo.find({ filter: { groupId } })` returns an empty array, `targetBookings` becomes `[]`, causing zero bookings to be confirmed while the webhook reports success.
- **Where**: `nest-server/src/modules/payment/payment.service.ts`, lines 670–677.
- **Why**: Bookings remain `pending` and are eventually cancelled by cron despite being paid.
- **Suggestion**: Ensure fallback to `[booking]`:
  ```typescript
  let targetBookings = [booking];
  const targetGroupId = payment.groupId || booking.groupId;
  if (targetGroupId) {
    const found = await this.bookingRepo.find({ filter: { groupId: targetGroupId } });
    if (found && found.length > 0) {
      targetBookings = found;
    }
  }
  ```

### [Critical] Finding 3: Failed Webhook Downgrades Already Fulfilled Payment to `unpaid`
- **What**: A delayed or out-of-order failed webhook unconditionally sets `payment.status = PaymentStatusEnum.unpaid`.
- **Where**: `nest-server/src/modules/payment/payment.service.ts`, lines 803–806.
- **Why**: Financial corruption and breaking idempotent webhook delivery guarantees.
- **Suggestion**: Add a check before downgrading status:
  ```typescript
  } else if (!isSuccess && !isPending) {
    if (payment.status === PaymentStatusEnum.paid || payment.status === PaymentStatusEnum.partially_paid) {
      return {
        received: true,
        status: payment.status,
        note: 'Ignored failed webhook for already completed payment',
      };
    }
    payment.status = PaymentStatusEnum.unpaid;
    await payment.save();
    ...
  }
  ```

### [Major] Finding 4: Distributed Lock Fallthrough Bypasses Concurrency Protection
- **What**: If Redis lock acquisition times out after 10 attempts (`lockAcquired === false`), `createBooking` executes anyway without holding the lock.
- **Where**: `nest-server/src/modules/booking/booking.service.ts`, lines 341–347.
- **Why**: Under heavy concurrency, concurrent requests bypass lock protection and can double-book identical slots.
- **Suggestion**: Enforce lock acquisition:
  ```typescript
  if (!lockAcquired) {
    throw new ConflictException('The venue is currently busy with another reservation. Please retry in a few seconds.');
  }
  ```

### [Minor] Finding 5: Unit Test Timeout in `booking.service.spec.ts`
- **What**: 3 tests fail due to 5000ms Jest timeout.
- **Where**: `nest-server/src/modules/booking/booking.service.spec.ts`.
- **Suggestion**: Mock `QRCode.toDataURL` in unit tests (`jest.mock('qrcode', () => ({ toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock') }))`) or add `jest.setTimeout(15000)` at the top of the test suite.

---

## 4. Verified Claims & Areas Working Correctly

- **R3 Minimum Deposit Persistence**:
  - `minimumDepositAmount` is correctly defined in `Venue` entity schema with `@Prop({ type: Number, default: 0 })` and in `CreateVenueDto` / `UpdateVenueDto` with `@IsOptional() @IsNumber() @Min(0) @Type(() => Number)`.
  - Verified in `nest-server/src/modules/venue/venue.service.spec.ts` (PASS).
- **R5 Image DTO Whitelisting**:
  - `existingImages`, `keepImages`, `removedImages`, and `deleteImages` are whitelisted with `@ParseArray() @IsArray() @IsString({ each: true })` against strict NestJS `ValidationPipe` (`forbidNonWhitelisted: true`).
  - Verified in `nest-server/test/booking_payment_flow.e2e-spec.ts` (`T1-R5-01`, `T1-R5-02`, `T2-R5-01` PASS).
- **Backward Compatibility for Single-Slot DTO**:
  - `CreateBookingDto` accepts both `slots` array and legacy `startTime`/`endTime`. Single slot requests are wrapped and processed correctly.
  - Verified in `booking.service.spec.ts` (`should maintain backward compatibility for single slot request with startTime and endTime` PASS).
- **Payment Status Enum**:
  - `PaymentStatusEnum.partially_paid = 'partially_paid'` is present in `bookingEnum.ts`.

---

## 5. Caveats
- No caveats. Findings are based on direct execution of build tools, test runners, and line-by-line source code inspection.

---

## 6. Conclusion
- The core requirements for R2, R3, and R5 have been largely scaffolded in the codebase (entity schemas, DTOs, image whitelisting, and multi-slot price calculation).
- However, critical edge-case bugs in **Paymob webhook group confirmation**, **out-of-order failed webhook handling**, **distributed lock fallthrough**, and **failing unit/E2E test suites** prevent approval.
- Final Verdict: **REQUEST_CHANGES**.

---

## 7. Verification Method
To independently verify the findings above:

```bash
# 1. Check NestJS build
cd D:/test-mobile-app/nest-server && npm run build

# 2. Check Unit tests (demonstrates timeout in booking.service.spec.ts)
cd D:/test-mobile-app/nest-server && npm test

# 3. Check E2E test suite (demonstrates 2 failures)
cd D:/test-mobile-app/nest-server && npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts

# 4. Check Booking E2E test suite (demonstrates 3 Paymob webhook failures)
cd D:/test-mobile-app/nest-server && npx jest --config ./test/jest-e2e.json test/booking.e2e-spec.ts
```
