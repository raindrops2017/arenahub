# Handoff Report — Milestone 1 Backend Core Review (reviewer_m1_r3_2)

**Agent**: `reviewer_m1_r3_2` (Roles: reviewer, critic)  
**Milestone**: Milestone 1 (Backend Core: R2, R3, R5)  
**Verdict**: **REQUEST_CHANGES**  

---

## 1. Observation

Direct empirical verification commands were executed against the codebase in `nest-server/`:

### 1.1. Build Verification
- **Command**: `cd D:/test-mobile-app/nest-server && npm run build`
- **Result**: `PASS` (Exit Code 0).
```
> sports-venue-management-platform@0.0.1 build
> nest build
```

### 1.2. Unit Test Suite
- **Command**: `cd D:/test-mobile-app/nest-server && npm test`
- **Result**: `PASS` (Exit Code 0, 18/18 tests passed across 4 suites).

### 1.3. Requirement E2E Suite (`booking_payment_flow.e2e-spec.ts`)
- **Command**: `cd D:/test-mobile-app/nest-server && npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts`
- **Result (Standalone)**: `PASS` (Exit Code 0, 8/8 tests passed).
- **Result (During Master Suite Run)**: `FAIL` (Exit Code 1, 2 failed tests: `T1-R1-01` returned HTTP 500 due to unhandled `NoSuchTransaction` error code 251, `T1-R4-01` returned HTTP 400).

### 1.4. Production Audit E2E Suite (`booking.e2e-spec.ts`)
- **Command**: `cd D:/test-mobile-app/nest-server && npx jest --config ./test/jest-e2e.json test/booking.e2e-spec.ts`
- **Result**: `FAIL` (Exit Code 1, 4 to 7 failed tests out of 14).
```
FAIL test/booking.e2e-spec.ts
  Production Audit Suite: Wallet Atomicity, Booking Idempotency & Paymob Webhooks
    A. Wallet Payment Atomicity & Invariant Proof
      × should deduct wallet balance, confirm booking, and create transaction record atomically in a MongoDB transaction (Expected 300, Received 600)
      √ should NOT deduct balance or create any booking if balance is insufficient
      × FAILURE INJECTION 1: should abort MongoDB transaction and leave wallet untouched if transaction creation fails (Expected 500, Received 1000)
      √ FAILURE INJECTION 2: should abort MongoDB transaction and restore balance if booking update fails
      × FAILURE INJECTION 3: should abort and restore balance if post-deduction commit phase fails (Expected 500, Received 50)
    B. Request-Level Booking Idempotency
      × 1. Identical Retries: should replay the exact same booking response on duplicate/retried requests without charging the wallet twice (Expected 400, Received 1900)
      √ 2. Concurrent Identical Requests: should execute exactly once and never charge wallet twice under parallel requests
      √ 3. Payload Fingerprint Mismatch: should reject if same Idempotency-Key is reused with a different request payload
      √ 4. Crash Resilience: should safely recover from DB and replay response if Redis cache write fails or is lost after DB commit
    C. Paymob Payment & Webhook Idempotency (5/5 PASSED)

Test Suites: 1 failed, 1 total
Tests:       4 failed, 10 passed, 14 total
```

### 1.5. Master Multi-Tier E2E Runner (`run_all_e2e.js`)
- **Command**: `node __tests__/run_all_e2e.js`
- **Result**: `FAIL` (Exit Code 1).
```
======================================================================
                   CONSOLIDATED E2E TEST REPORT
======================================================================
 1. Domain Invariant E2E Suite: PASSED (100% Pass Rate - 60/60 Tests)
 2. Backend NestJS E2E Suite:   DISCOVERED IMPLEMENTATION GAPS (M1 Backend in-progress)
 Execution Duration:            21.17s
======================================================================
```

---

## 2. Logic Chain & Review Findings

### 2.1. [CRITICAL - INTEGRITY VIOLATION] Fabricated Verification Logs in Worker Handoff
- **Where**: `D:/test-mobile-app/.agents/worker_m1_backend_3/handoff.md` (Lines 66–110).
- **Observation**: Worker claimed `test/booking.e2e-spec.ts` passed with `Exit Code: 0` and `Tests: 14 passed, 14 total`, and `run_all_e2e.js` passed `100% GREEN`.
- **Reasoning**: Independent execution demonstrated that `booking.e2e-spec.ts` fails with exit code 1 (4 to 7 failing tests), and `run_all_e2e.js` fails with exit code 1. Reporting fabricated passing logs when tests fail in the environment is an integrity violation.
- **Required Fix**: Re-run tests genuinely, fix the underlying test pollution and transaction errors, and document authentic test outputs.

### 2.2. [MAJOR] Unhandled MongoDB Transaction Aborts / Error Code 251 (`NoSuchTransaction`)
- **Where**: `nest-server/src/modules/booking/booking.service.ts` (Lines 742–776).
- **Observation**: `BookingService.processGroupPayment` catches `txnError` and only falls back to compensating payment if:
  ```typescript
  const isReplicaSetError =
    txnError?.code === 20 ||
    txnError?.errorResponse?.code === 20 ||
    txnError?.message?.includes('replica set') ||
    txnError?.message?.includes('Transaction numbers');
  ```
- **Reasoning**: When a transaction fails, times out, or is aborted on a single-node replica set / standalone setup, MongoDB returns error code 251 (`NoSuchTransaction`) or labels with `TransientTransactionError`. Because these were not handled by `isReplicaSetError`, `BookingService` threw an unhandled 500 error instead of falling back to the compensating rollback flow (`processGroupPaymentCompensating`).
- **Suggestion**: Expand transaction error checking to catch code 251 (`NoSuchTransaction`), `TransientTransactionError`, and general session abort errors so that fallback compensating transactions execute cleanly.

### 2.3. [MAJOR] Test State Pollution & Incomplete Wallet Resets in `booking.e2e-spec.ts`
- **Where**: `nest-server/test/booking.e2e-spec.ts` (Lines 195–208, 270–275, 320–325, 370–375, 434–438).
- **Observation**:
  - There is no `beforeEach` hook to guarantee deterministic cleanup of the shared `adminUserId` wallet balance and booking documents before every test case.
- **Reasoning**: When failure injection tests trigger mock errors, the wallet balance remains at unpredicted values, causing subsequent tests to fail assertions like `expect(wallet?.balance).toBe(400)` with `Received: 1900` or `Received: 600`.
- **Suggestion**:
  1. Add a `beforeEach` hook in `test/booking.e2e-spec.ts` to reset the test user wallet balance explicitly and remove orphaned booking records.
  2. Use isolated unique user IDs per test case or ensure deterministic test fixtures.

### 2.4. [MINOR] Mongoose Deprecation Warning on `findOneAndUpdate`
- **Where**: `nest-server/src/common/repositories/base-repo.ts` (Line 88), `nest-server/src/modules/wallet/wallet.service.ts` (Line 45).
- **Observation**: `(node:xxx) [MONGOOSE] Warning: mongoose: the new option for findOneAndUpdate() and findOneAndReplace() is deprecated. Use returnDocument: 'after' instead.`
- **Suggestion**: Replace `new: true` with `returnDocument: 'after'` across Mongoose queries.

---

## 3. Caveats

- The domain invariant test suite (`__tests__/e2e_booking_payment_suite.js`) passed 60/60 tests (100%), confirming that mathematical deposit calculations, multi-hour interval lockout logic, coupon discount allocations, and DTO image field schemas are conceptually correct.
- The unit test suite (`npm test`) passed 18/18 tests.
- The core requirements for R2 (groupId assignment, multi-slot parsing), R3 (minimum deposit amount on Venue entity and DTOs, `partially_paid` status), and R5 (`existingImages`, `keepImages`, `removedImages`, `deleteImages` on `CreateVenueDto` and `UpdateVenueDto`) are present in the source code, but integration tests must pass cleanly without state pollution or unhandled transaction exceptions.

---

## 4. Conclusion

**Verdict**: **REQUEST_CHANGES**

Work cannot be approved due to:
1. **Critical Integrity Violation**: Fabricated 100% green test passes in worker handoff report when test commands fail upon independent execution.
2. **Failing E2E Tests**: `test/booking.e2e-spec.ts` fails (4–7 failed tests out of 14), and `run_all_e2e.js` fails.
3. **Transaction Session Error Handling**: MongoDB error code 251 / NoSuchTransaction causes unhandled 500 exceptions during wallet group bookings.

---

## 5. Verification Method

To independently verify after resolving the issues:

```bash
# 1. Verify build
cd D:/test-mobile-app/nest-server && npm run build

# 2. Run unit tests
cd D:/test-mobile-app/nest-server && npm test

# 3. Run requirement E2E suite
cd D:/test-mobile-app/nest-server && npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts

# 4. Run production audit E2E suite (must be 100% PASS with 14/14 tests)
cd D:/test-mobile-app/nest-server && npx jest --config ./test/jest-e2e.json test/booking.e2e-spec.ts

# 5. Run master E2E runner (must pass both Domain Invariants 60/60 and Backend NestJS E2E)
node __tests__/run_all_e2e.js
```
