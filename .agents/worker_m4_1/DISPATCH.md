## 2026-08-25T12:14:30Z

You are worker_m4_1, the backend implementation and hardening specialist for Milestone 4.
Your working directory is D:/test-mobile-app/.agents/worker_m4_1.
Original user request is at D:/test-mobile-app/.agents/ORIGINAL_REQUEST.md.
Project architecture & decomposition is at D:/test-mobile-app/PROJECT.md.
Test infrastructure specs are at D:/test-mobile-app/TEST_INFRA.md.
Challenger failure report is at D:/test-mobile-app/.agents/challenger_m4_2/handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You own `nest-server/src/modules/booking/`, `nest-server/src/common/services/redis/`, and `nest-server/src/modules/wallet/`.

OBJECTIVE & REQUIRED FIXES:
1. Initialize your workspace (DISPATCH.md, BRIEFING.md, progress.md).
2. Database-level partial unique index:
   In `nest-server/src/modules/booking/entities/booking.entity.ts`, add a compound unique index:
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
3. In-memory lock fallback in RedisService:
   In `nest-server/src/common/services/redis/redis.service.ts`, when Redis client is offline / not available (`!this.isAvailable()`), implement an in-memory lock mechanism using an async mutex / lock map with TTL expiration and release support, ensuring concurrent requests in the local process properly serialize on the lock key instead of bypassing locks with unconditional `true`.
4. Transaction error handling in BookingService:
   In `nest-server/src/modules/booking/booking.service.ts`, ensure duplicate key errors (MongoDB code 11000 / E11000) during booking insertion are caught during transaction commit and mapped to `new ConflictException('One or more selected slots were just booked by another user. Please try again.')`.
5. Run and verify all 5 NestJS E2E test suites:
   - `cd nest-server && npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts`
   - `cd nest-server && npx jest --config ./test/jest-e2e.json test/booking.e2e-spec.ts`
   - `cd nest-server && npx jest --config ./test/jest-e2e.json test/adversarial_challenge_m1.e2e-spec.ts`
   - `cd nest-server && npx jest --config ./test/jest-e2e.json test/adversarial_challenge_m2.e2e-spec.ts`
   - `cd nest-server && npx jest --config ./test/jest-e2e.json test/adversarial_challenge_m4.e2e-spec.ts`
6. Write your complete handoff report to `D:/test-mobile-app/.agents/worker_m4_1/handoff.md` and message orchestrator_5 when done.
