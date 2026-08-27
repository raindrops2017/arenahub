# Handoff Report — Empirical Challenger 1 (Milestone 1 Backend Core)

**Agent**: `challenger_m1_r3_1` (Roles: critic, specialist)  
**Milestone**: Milestone 1 (Backend Core: R2, R3, R5)  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

Direct empirical test execution revealed that while TypeScript builds and unit tests pass, the E2E integration test suites and atomicity failure injection harnesses **FAIL** with multiple unhandled exceptions and broken invariants.

### 1.1. TypeScript Compilation & Unit Tests
- **`npm run build`**: PASSED (Exit Code: 0)
- **`npm test`**: PASSED (4 suites, 18 tests passed)
- **`node __tests__/challenger_m1_backend_stress.js`**: PASSED (10/10 math & logical invariants passed)

### 1.2. Requirement E2E Suite Failure (`booking_payment_flow.e2e-spec.ts`)
- **Command**: `cd D:/test-mobile-app/nest-server && npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts`
- **Result**: `FAIL (4 failed, 4 passed, 8 total)`
- **Verbatim Failure 1 (`T1-R1-01`)**:
```
  ● E2E Test Suite: Requirements R1 - R5 (Tiers 1 - 4) › Requirement R1: Wallet Auto-Deduction & Payment Method Elimination › T1-R1-01: should auto-deduct 100% totalCost from wallet when balance >= totalCost and skip Paymob

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 50

      244 |         filter: { userId: new Types.ObjectId(adminUserId) },
      245 |       });
    > 246 |       expect(wallet?.balance).toBe(200);
```
- **Verbatim Failure 2 (`T1-R1-02`)**:
```
  ● E2E Test Suite: Requirements R1 - R5 (Tiers 1 - 4) › Requirement R1: Wallet Auto-Deduction & Payment Method Elimination › T1-R1-02: should reject booking when wallet balance is insufficient for full wallet payment

    expect(received).toBe(expected) // Object.is equality

    Expected: 400
    Received: 201
```
- **Verbatim Failure 3 (`T1-R4-01`)**:
```
  ● E2E Test Suite: Requirements R1 - R5 (Tiers 1 - 4) › Requirement R4: Multi-Hour Interval Lockout & Timezone Safety › T1-R4-01: should lock all hourly sub-slots in interval [startTime, endTime) upon booking

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 409
```
- **Verbatim Failure 4 (`T1-R2-01`)**:
```
  ● E2E Test Suite: Requirements R1 - R5 (Tiers 1 - 4) › Requirements R2 & R3: Multi-Slot Group Bookings & Minimum Deposits › T1-R2-01: should accept slots array in CreateBookingDto and assign groupId

    expect(received).toContain(expected) // indexOf

    Expected value: 500
    Received array: [201, 200]
```

### 1.3. Production Audit Suite Failure (`booking.e2e-spec.ts`)
- **Command**: `cd D:/test-mobile-app/nest-server && npx jest --config ./test/jest-e2e.json test/booking.e2e-spec.ts`
- **Result**: `FAIL (8 failed, 6 passed, 14 total)`
- **Verbatim Failures**:
  - `A. Wallet Payment Atomicity`: Expected: 300, Received: 800 (failed at line 232)
  - `FAILURE INJECTION 1`: Expected: 500, Received: 300 (failed at line 305)
  - `FAILURE INJECTION 2`: Expected: 500, Received: 2000 (failed at line 355)
  - `FAILURE INJECTION 3`: Expected: 500, Received: 300 (failed at line 416)
  - `C. Paymob Payment & Webhook Idempotency`: Initial booking returned `409 Conflict` instead of `201`, cascading failures to subsequent webhook tests.

### 1.4. Master E2E Runner Failure (`run_all_e2e.js`)
- **Command**: `node __tests__/run_all_e2e.js`
- **Output**:
```
[Nest] ERROR [ExceptionsHandler] MongoServerError: Transaction with { txnNumber: 15 } has been aborted.
    at BookingService.processGroupPayment (D:\test-mobile-app\nest-server\src\modules\booking\booking.service.ts:697:11)
  errorLabelSet: Set(1) { 'TransientTransactionError' },
  code: 251,
  codeName: 'NoSuchTransaction'

2. Backend NestJS E2E Suite: DISCOVERED IMPLEMENTATION GAPS (M1 Backend in-progress)
```

---

## 2. Logic Chain

1. **Transaction Abort Exception Crash (`code: 251 NoSuchTransaction`)**:
   - In `nest-server/src/modules/booking/booking.service.ts` (lines 685-754):
     When running inside a MongoDB session, if an internal query aborts the transaction (e.g. an upsert race in `getOrCreateWallet`), MongoDB aborts the transaction on the server and attaches `errorLabelSet: ['TransientTransactionError']` and `code: 251`.
   - In `processGroupPayment`, the catch block only checks `txnError?.code === 20 || txnError?.message?.includes('replica set')`. It does NOT catch `code 251` or `TransientTransactionError`, causing the server to throw an unhandled 500 error instead of falling back to compensating transactions.

2. **Compensating Rollback / Failure Injections in `booking.e2e-spec.ts`**:
   - In `booking.e2e-spec.ts` (lines 278-420), failure injection tests simulate database write failures on transaction ledger writes and booking updates.
   - Because the session is active, the abort handling failed to restore the pre-transaction wallet balance, violating the atomicity invariant.

3. **Test State Pollution & Slot Collisions**:
   - `test/booking_payment_flow.e2e-spec.ts` and `test/booking.e2e-spec.ts` use hardcoded dates and slot intervals without per-test cleanup hooks (`beforeEach`).
   - Consequently, repeated runs or sequential test executions collide on the same date/slot, triggering `409 Conflict` (`Selected time slot is already booked or reserved for this venue`) and causing false test rejections.

---

## 3. Caveats

- Mathematical calculations for multi-slot custom pricing, proportional coupon discount splits, and DTO whitelist validation (`existingImages`, `keepImages`, `minimumDepositAmount`) are logically sound and verified.
- The failures stem specifically from runtime transaction lifecycle handling under failure injection and test suite state persistence.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

The backend implementation currently cannot be approved because:
1. `BookingService.processGroupPayment` crashes with unhandled `MongoServerError: Transaction with { txnNumber } has been aborted` (`code: 251`) when transaction errors occur.
2. Atomicity invariant failure injection tests in `test/booking.e2e-spec.ts` fail (8 tests failing).
3. E2E requirements suite `test/booking_payment_flow.e2e-spec.ts` fails (4 tests failing).
4. `run_all_e2e.js` reports backend implementation gaps.

---

## 5. Verification Method

Execute the following commands to independently reproduce:

```bash
# 1. Run Requirement E2E Suite (Observe 4 test failures)
cd D:/test-mobile-app/nest-server && npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts

# 2. Run Production Audit Suite (Observe 8 test failures)
cd D:/test-mobile-app/nest-server && npx jest --config ./test/jest-e2e.json test/booking.e2e-spec.ts

# 3. Run Consolidated E2E Runner (Observe transaction abort crash and failure report)
node __tests__/run_all_e2e.js
```
