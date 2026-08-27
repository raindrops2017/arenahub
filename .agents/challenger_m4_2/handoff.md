# Empirical Adversarial Challenge Report: Milestone 4 (Master E2E & Tier 5 Hardening)

**Agent**: `challenger_m4_2`  
**Role**: Empirical Challenger (critic, specialist)  
**Date**: 2026-08-25  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Baseline NestJS E2E Test Suites Execution (47 / 47 Passed)
All four baseline E2E test suites mandated for Milestone 4 were executed directly against the backend test server:

1. **`test/booking_payment_flow.e2e-spec.ts`**:
   - Command: `npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts`
   - Result: `PASS test/booking_payment_flow.e2e-spec.ts (73.146 s)` - **8 passed, 8 total**
   - Verified: Whitelist validation on `existingImages` and `keepImages`, wallet auto-deduction, multi-hour interval lockout, multi-slot group booking `groupId` assignment, and venue `minimumDepositAmount` configuration.

2. **`test/booking.e2e-spec.ts`**:
   - Command: `npx jest --config ./test/jest-e2e.json test/booking.e2e-spec.ts`
   - Result: `PASS test/booking.e2e-spec.ts (27.738 s)` - **14 passed, 14 total**
   - Verified: Wallet payment atomicity under 3 failure injection scenarios, request-level booking idempotency with identical keys, fingerprint mismatch rejection, Redis crash recovery, and Paymob out-of-order webhook protection.

3. **`test/adversarial_challenge_m1.e2e-spec.ts`**:
   - Command: `npx jest --config ./test/jest-e2e.json test/adversarial_challenge_m1.e2e-spec.ts`
   - Result: `PASS test/adversarial_challenge_m1.e2e-spec.ts (21.641 s)` - **11 passed, 11 total**
   - Verified: Minimum deposit calculations (`slots.length * deposit`), deposit cap logic, zero-deposit venues, Paymob webhook deposit transitions, and strict DTO sanitization on `POST /venue`.

4. **`test/adversarial_challenge_m2.e2e-spec.ts`**:
   - Command: `npx jest --config ./test/jest-e2e.json test/adversarial_challenge_m2.e2e-spec.ts`
   - Result: `PASS test/adversarial_challenge_m2.e2e-spec.ts (4.794 s)` - **14 passed, 14 total**
   - Verified: Dashboard `normalizeVenue` parity across deposit variations and image URLs, `CreateVenueDto` / `UpdateVenueDto` class-validator constraints (`@Min(0)`), live HTTP venue creation and PATCH updates, and client validation simulation.

---

### 1.2 Tier 5 Adversarial Stress Suite Execution (`test/adversarial_challenge_m4.e2e-spec.ts`)
- Command: `npx jest --config ./test/jest-e2e.json test/adversarial_challenge_m4.e2e-spec.ts`
- Result: **11 passed, 1 failed, 12 total**

#### Verified Passing Invariants (11 / 12 Tests):
- **T5-CONCUR-01**: 8 parallel simultaneous booking requests on the exact same slot -> Exactly 1 succeeded, 7 received 409 conflict, MongoDB contained strictly 1 confirmed booking, wallet debited exactly once (5000 -> 4800 EGP).
- **T5-STAT-01**: Multi-slot group reservation (3 slots @ 300 EGP = 900 EGP, deposit 80/slot = 240 EGP) correctly assigned `PaymentStatusEnum.partially_paid` and `BookingStatusEnum.confirmed` to all 3 booking documents, with wallet debited strictly 240 EGP (1000 -> 760 EGP).
- **T5-STAT-02**: Multi-slot group reservation where deposit per slot exceeded slot price (1 slot @ 150 EGP, deposit 500) capped the deposit to total price and assigned `PaymentStatusEnum.paid` (NOT `partially_paid`).
- **T5-STAT-03**: Zero-deposit venue (minimumDepositAmount = 0) required full payment (400 EGP) and assigned `PaymentStatusEnum.paid`.
- **T5-CALC-01**: 3-slot reservation on venue with custom hour prices (hour 17=150, hour 18=200, hour 19=150 -> total 500 EGP, deposit 80/slot) computed deposit strictly as `3 * 80 = 240 EGP`, debited 240 EGP from wallet, and tracked `totalDue = 500 EGP`.
- **T5-WH-01**: Multi-slot group Paymob webhook matched `groupId` and updated ALL booking documents in the group to `partially_paid` and `confirmed`. Replayed 5 times idempotently without corrupting state.
- **T5-WH-02**: Multi-slot group Paymob webhook for full amount updated ALL booking documents in the group to `paid` and `confirmed`.
- **T5-DTO-01**: `POST /venue` successfully accepted `existingImages` (array, JSON string, CSV) and `keepImages` with 201 Created.
- **T5-DTO-02**: `PATCH /venue/:id` successfully accepted `keepImages`, `removedImages`, `deleteImages`, and `minimumDepositAmount`.
- **T5-DTO-03**: `POST /venue` strictly rejected non-whitelisted foreign properties with 400 Bad Request.
- **T5-DTO-04**: `POST /venue` and `PATCH /venue/:id` strictly rejected negative `minimumDepositAmount` with 400 Bad Request.

---

### 1.3 Empirical Concurrency Vulnerability Observation (T5-CONCUR-02)

#### Verbatim Jest Failure Output:
```
  ● Tier 5 Adversarial Master Integration & Concurrency Stress Suite (M4) › 1. High-Concurrency & Multi-Slot Atomic Lock/Rollback Stress › T5-CONCUR-02: Multi-Slot Group Overlapping Race (Group A [{11,12},{12,13}] vs Group B [{12,13},{13,14}]) -> Atomic win/loss with zero orphan bookings

    expect(received).toBe(expected) // Object.is equality

    Expected: 1
    Received: 2

      334 |       console.log('T5-CONCUR-02 Results summary: successCount=', successCount, 'conflictCount=', conflictCount);
      335 |
    > 336 |       expect(successCount).toBe(1);
          |                            ^
      337 |       expect(conflictCount).toBe(1);
      338 |
      339 |       // Verify winner got both 2 slots, loser got 0 slots

      at Object.<anonymous> (adversarial_challenge_m4.e2e-spec.ts:336:28)
```

#### Code Locations:
1. **`nest-server/src/modules/booking/booking.service.ts` (lines 339–351)**:
```typescript
const lockKey = `lock::booking::venue::${venue._id.toString()}::${startOfDay.toISOString()}`;
let lockAcquired = false;
for (let i = 0; i < 10; i++) {
  lockAcquired = await this.redisService.acquireLock(lockKey, 5);
  if (lockAcquired) break;
  await new Promise((resolve) => setTimeout(resolve, 50));
}
```
2. **`nest-server/src/common/services/redis/redis.service.ts` (lines 177–192)**:
```typescript
async acquireLock(key: string, ttlSeconds: number = 5): Promise<boolean> {
  if (!this.isAvailable()) return true;
  try {
    const res = await withTimeout(
      this.client!.set(key, 'locked', {
        NX: true,
        EX: ttlSeconds,
      }),
      'OK',
    );
    return res === 'OK';
  } catch {
    // If redis is unavailable or errors, return true so system gracefully falls back
    return true;
  }
}
```
3. **`nest-server/src/modules/booking/entities/booking.entity.ts` (line 85)**:
```typescript
export const BookingSchema = SchemaFactory.createForClass(Booking);
BookingSchema.index({ userId: 1, idempotencyKey: 1 }, { sparse: true });
```

---

## 2. Logic Chain

1. **Redis Fallback Mode**: When Redis is offline (`REDIS_URI` not configured or connection down), `RedisService.acquireLock()` defaults to returning `true` unconditionally (Observation 1.3 #2).
2. **Read-Check-Write Gap**: In `BookingService.createBooking()` (Observation 1.3 #1), the overlap detection logic executes a pre-query:
   `existingBookings = await this.bookingRepo.find({ filter: { venueId, date, $or: slotOverlapConditions } })`.
3. **Concurrent Execution**: When two distinct users concurrently request overlapping multi-slot reservations (e.g. Group A: `[{11, 12}, {12, 13}]` and Group B: `[{12, 13}, {13, 14}]`):
   - Request A executes `find()` and observes 0 confirmed/pending bookings on slot `[12, 13)`.
   - Request B executes `find()` simultaneously and also observes 0 confirmed/pending bookings on slot `[12, 13)`.
4. **Non-Conflicting Multi-Document Inserts in MongoDB**:
   - Request A creates two new `Booking` documents with `groupId: UUID-A`.
   - Request B creates two new `Booking` documents with `groupId: UUID-B`.
   - In MongoDB, multi-document transactions only detect write conflicts when modifying existing documents; inserting separate new documents does NOT conflict unless prevented by a database-level unique constraint.
5. **Absence of Unique Slot Constraint**: `BookingSchema` contains only an index on `{ userId: 1, idempotencyKey: 1 }` (Observation 1.3 #3). It lacks a unique partial index or constraint on confirmed/pending slots (e.g. `{ venueId: 1, date: 1, startTime: 1 }` where status is in `['confirmed', 'pending']`).
6. **Resulting Defect**: Both Group A and Group B succeed with HTTP 201 (Observation 1.3 #1), and slot `[12, 13)` is **DOUBLE-BOOKED** in the database.

---

## 3. Caveats

1. **Redis Operational Dependency**: If a Redis cluster is running and healthy with strict distributed locking enabled, `acquireLock` serializes requests per venue and date. However, the backend currently possesses no fail-safe fallback (in-memory lock or database unique constraint) when Redis is unavailable, restarts, or during network partitions.
2. **Single-Slot vs Multi-Slot Races**: In T5-CONCUR-01 (8 identical single-slot requests from the same user), the idempotency handling / sequential execution serialized them sufficiently, but multi-slot overlapping interval requests across different users (T5-CONCUR-02) consistently expose the double-booking race condition.

---

## 4. Conclusion & Actionable Verdict

### Verdict: **REQUEST_CHANGES**

While requirements R1, R2, R3, R4, and R5 are functionally validated across all 4 baseline E2E test suites (47/47 passing) and 11 Tier 5 adversarial stress tests, the backend has a critical concurrency flaw under multi-slot overlapping booking races when Redis is in offline/fallback mode.

### Required Changes for Approval:
1. **Database-Level Partial Unique Index**: Add a partial compound unique index on `BookingSchema` in `nest-server/src/modules/booking/entities/booking.entity.ts`:
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
2. **In-Memory Lock Fallback in `RedisService`**: When Redis is in offline mode (`!this.isAvailable()`), maintain an in-memory asynchronous mutex/lock map (`Map<string, Promise<void>>`) instead of returning `true` unconditionally, ensuring local single-process concurrency safety.
3. **Transaction Rollback Catch Handler**: In `BookingService.createBooking()`, catch MongoDB duplicate key error (`E11000 duplicate key error collection`) and map it cleanly to `new ConflictException('One or more selected slots were just booked by another user. Please try again.')`.

---

## 5. Verification Method

To independently reproduce and verify this report:

1. Run the 4 baseline E2E suites:
   ```powershell
   cd D:/test-mobile-app/nest-server
   npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts
   npx jest --config ./test/jest-e2e.json test/booking.e2e-spec.ts
   npx jest --config ./test/jest-e2e.json test/adversarial_challenge_m1.e2e-spec.ts
   npx jest --config ./test/jest-e2e.json test/adversarial_challenge_m2.e2e-spec.ts
   ```
2. Run the Tier 5 Adversarial Master Stress Suite:
   ```powershell
   cd D:/test-mobile-app/nest-server
   npx jest --config ./test/jest-e2e.json test/adversarial_challenge_m4.e2e-spec.ts
   ```
3. Observe test `T5-CONCUR-02` fail with `Expected: 1, Received: 2` (both overlapping groups booked slot `[12, 13)`).
