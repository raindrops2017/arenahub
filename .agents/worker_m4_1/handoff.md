# Backend Implementation & Hardening Report: Milestone 4

**Agent**: `worker_m4_1`  
**Role**: Backend Implementation & Hardening Specialist (implementer, qa, specialist)  
**Date**: 2026-08-25  
**Working Directory**: `D:/test-mobile-app/.agents/worker_m4_1`  
**Verdict**: **COMPLETE / READY_FOR_CHALLENGE**

---

## 1. Observation

### 1.1 Root Cause of Initial Challenger Defect (T5-CONCUR-02)
- Challenger `challenger_m4_2` discovered that during multi-slot overlapping booking races across different users (`Group A [{11,12},{12,13}]` vs `Group B [{12,13},{13,14}]`) in offline Redis mode:
  1. `RedisService.acquireLock()` returned `true` unconditionally when Redis was offline, allowing concurrent requests to bypass serialization.
  2. MongoDB multi-document transactions only detect write conflicts when modifying existing documents; inserting separate new documents on the same slot did not conflict at the database level because `BookingSchema` lacked a compound unique partial index on `{ venueId, date, startTime }`.
  3. Consequently, both Group A and Group B succeeded with HTTP 201, causing slot `[12, 13)` to be double-booked.

### 1.2 Implemented Changes
Three primary hardening layers were implemented:

1. **Database-Level Compound Partial Unique Index** (`nest-server/src/modules/booking/entities/booking.entity.ts`):
   ```typescript
   BookingSchema.index(
     { venueId: 1, date: 1, startTime: 1 },
     {
       unique: true,
       partialFilterExpression: {
         status: { $in: [BookingStatusEnum.confirmed, BookingStatusEnum.pending] },
       },
     },
   );
   ```

2. **In-Memory Mutex Lock & KV Fallback in `RedisService`** (`nest-server/src/common/services/redis/redis.service.ts`):
   - Added process-wide `static readonly inMemoryLocks = new Map<string, InMemoryLock>()` and `inMemoryKV = new Map<string, InMemoryKV>()`.
   - Implemented `acquireInMemoryLock(key, ttlSeconds)` and `releaseInMemoryLock(key)`.
   - When Redis is unavailable or fails, `acquireLock` uses the in-memory lock map with TTL expiration and release support, serializing concurrent requests in the local process.
   - When Redis is unavailable, `setValue`, `getValue`, `delKey`, `exist`, `ttl`, `expire`, `Keys`, and `inc` seamlessly fall back to the in-memory store.

3. **Transaction Duplicate Key Error Handling & Index Sync** (`nest-server/src/modules/booking/booking.service.ts`):
   - Implemented `OnModuleInit` to invoke `bookingModel.syncIndexes()` on startup, ensuring the partial unique index is registered in MongoDB.
   - Added `isDuplicateKeyError(error)` to detect MongoDB error codes 11000, 11001, WriteConflict (112), and `TransientTransactionError`.
   - Wrapped slot document creation (`this.bookingRepo.create`), payment transaction commit (`session.commitTransaction()`), and compensating execution (`processGroupPaymentCompensating`) to catch duplicate key collisions, perform wallet refunds if debited, clean up slot holds, and throw `new ConflictException('One or more selected slots were just booked by another user. Please try again.')`.

### 1.3 Test Suite Execution Results (59 / 59 E2E Tests + 18 / 18 Unit Tests Passed)
1. **`test/adversarial_challenge_m4.e2e-spec.ts`**:
   - Result: `PASS test/adversarial_challenge_m4.e2e-spec.ts (20.059 s)` - **12 passed, 12 total**
   - **T5-CONCUR-01**: PASSED (8 parallel requests on identical slot -> 1 winner, 7 receive 409 conflict, wallet debited once).
   - **T5-CONCUR-02**: PASSED (Multi-slot group overlapping race -> 1 winner got 2 slots, loser got 0 slots, 0 orphan bookings, loser wallet untouched).
   - **T5-STAT-01 - T5-STAT-03**: PASSED (Deposit status transitions: partially_paid vs paid vs zero-deposit venue).
   - **T5-CALC-01**: PASSED (Multi-slot deposit calculation with custom hourly pricing).
   - **T5-WH-01 - T5-WH-02**: PASSED (Paymob webhook multi-slot group updates and idempotent replay).
   - **T5-DTO-01 - T5-DTO-04**: PASSED (Strict DTO validation and whitelist filtering).

2. **`test/booking_payment_flow.e2e-spec.ts`**:
   - Result: `PASS test/booking_payment_flow.e2e-spec.ts (7.564 s)` - **8 passed, 8 total**

3. **`test/booking.e2e-spec.ts`**:
   - Result: `PASS test/booking.e2e-spec.ts (10.516 s)` - **14 passed, 14 total**

4. **`test/adversarial_challenge_m1.e2e-spec.ts`**:
   - Result: `PASS test/adversarial_challenge_m1.e2e-spec.ts (10.062 s)` - **11 passed, 11 total**

5. **`test/adversarial_challenge_m2.e2e-spec.ts`**:
   - Result: `PASS test/adversarial_challenge_m2.e2e-spec.ts (2.637 s)` - **14 passed, 14 total**

6. **Unit Test Suite (`npm test`)**:
   - Result: `PASS (2.362 s)` - **18 passed, 18 total** (4 test suites)

---

## 2. Logic Chain

1. **Defense-in-Depth Layer 1 (Distributed / Local Mutex Lock)**:
   - When a booking request arrives, `BookingService` computes `lockKey = lock::booking::venue::${venueId}::${date}`.
   - If Redis is available, it acquires a distributed Redis lock.
   - If Redis is offline, `RedisService` falls back to `acquireInMemoryLock()`.
   - The first request acquires the lock and enters the critical section. The second concurrent request fails to acquire the lock and enters a retry loop (50ms intervals).
   - The first request creates the bookings, commits, and releases the lock in `finally`.
   - When the second request acquires the lock, it queries MongoDB for existing reservations on that venue/date, observes the newly confirmed/pending slot, and throws `ConflictException` before attempting any database writes or wallet debits.

2. **Defense-in-Depth Layer 2 (Database Partial Unique Index & Transaction Catch)**:
   - In the event of multi-process deployments running without distributed locking or network partitioning:
   - MongoDB enforces the partial unique index `{ venueId: 1, date: 1, startTime: 1 }` where status is `confirmed` or `pending`.
   - Any second insert or transaction commit on an overlapping slot triggers MongoDB error 11000.
   - `BookingService` catches error 11000 via `isDuplicateKeyError()`, rolls back the transaction, refunds the wallet if debited, cleans up any created slot records, and returns HTTP 409 `ConflictException('One or more selected slots were just booked by another user. Please try again.')`.

3. **In-Memory Lock Cleanup**:
   - The in-memory lock uses both explicit release (`releaseLock`) and automatic `setTimeout` expiration with `unref()` to avoid memory leaks or hanging Node.js event loops during test execution.

---

## 3. Caveats

- **Multi-Instance Production Deployments**: For multi-instance horizontal scaling in production, `REDIS_URI` should be configured to ensure distributed synchronization across separate Node.js containers. If Redis becomes temporarily partitioned, the database-level partial unique index in MongoDB provides the authoritative guarantee preventing duplicate bookings.
- **Index Creation on Existing Databases**: `BookingService.onModuleInit()` calls `syncIndexes()`. In an existing production database with historical duplicates, `syncIndexes()` should be preceded by a migration to resolve legacy duplicate records if any exist.

---

## 4. Conclusion

All objectives specified in the dispatch and challenger findings have been fully resolved and empirically verified:
- MongoDB partial unique index added and active.
- In-memory lock fallback with serialization implemented in `RedisService`.
- Transaction duplicate key error handling implemented in `BookingService`.
- All 5 NestJS E2E test suites (59/59 tests) and all unit test suites (18/18 tests) pass with 100% success rate.
- TypeScript build succeeds with 0 errors.

---

## 5. Verification Method

To independently verify this implementation:

1. **Build the server**:
   ```powershell
   cd D:/test-mobile-app/nest-server
   npm run build
   ```

2. **Run all 5 E2E test suites**:
   ```powershell
   cd D:/test-mobile-app/nest-server
   npx jest --config ./test/jest-e2e.json test/adversarial_challenge_m4.e2e-spec.ts
   npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts
   npx jest --config ./test/jest-e2e.json test/booking.e2e-spec.ts
   npx jest --config ./test/jest-e2e.json test/adversarial_challenge_m1.e2e-spec.ts
   npx jest --config ./test/jest-e2e.json test/adversarial_challenge_m2.e2e-spec.ts
   ```

3. **Run unit tests**:
   ```powershell
   cd D:/test-mobile-app/nest-server
   npm test
   ```
