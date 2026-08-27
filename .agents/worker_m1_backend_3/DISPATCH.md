## 2026-08-24T17:00:03Z
You are the Backend Worker for Milestone 1 (Backend Core: R2, R3, R5).
Your working directory is: D:/test-mobile-app/.agents/worker_m1_backend_3

MANDATORY FIRST STEP:
Read D:/test-mobile-app/.agents/ORIGINAL_REQUEST.md (timestamp 2026-08-24T16:08:07Z) and D:/test-mobile-app/PROJECT.md.
Also read the detailed review and challenge findings:
- D:/test-mobile-app/.agents/reviewer_1_m1/handoff.md
- D:/test-mobile-app/.agents/reviewer_2_m1/handoff.md
- D:/test-mobile-app/.agents/challenger_1_m1/handoff.md
- D:/test-mobile-app/TEST_READY.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
- nest-server/src/modules/booking/
- nest-server/src/modules/venue/
- nest-server/src/modules/payment/
- nest-server/src/common/enums/bookingEnum.ts
- nest-server/test/

REQUIRED WORK ITEMS:
1. Double Wallet Deduction on Standalone MongoDB in `BookingService.processGroupPayment`:
   - In `processGroupPayment`, before attempting `session.startTransaction()`, verify whether the MongoDB connection supports transactions (or catch error code 20). If `walletService.payForBooking` was executed with `session` and the transaction threw code 20, make sure `wallet.service.ts` or `processGroupPayment` rolls back / compensates the debit so calling `processGroupPaymentCompensating` does NOT charge the wallet a second time.
2. Lock Fallthrough on Max Retries in `BookingService.createBooking`:
   - If after all retry attempts `lockAcquired` is false, throw a `ConflictException` ('Selected slot is currently being booked by another user. Please try again.'). Never fall through to create the booking without the lock.
3. Paymob Webhook Group Resolution & Expired Hold Handling:
   - In `PaymentService.handlePaymobWebhook`:
     - Ensure candidate resolution properly queries and updates all bookings matching `groupId` or `bookingId`.
     - When hold is expired and refund is triggered, return `{ received: true, status: 'refunded' }`.
     - Guard against out-of-order failed webhooks downgrading already paid/confirmed bookings.
4. Venue DTO Whitelist Compatibility:
   - In `nest-server/src/modules/venue/dto/venue.dto.ts`, ensure `CreateVenueDto` and `UpdateVenueDto` have `@IsOptional() @IsArray() @IsString({ each: true }) existingImages?: string[];` as well as `keepImages?: string[];`, `removedImages?: string[];`, `deleteImages?: string[];`.
5. Unit & E2E Test Suite Green Execution:
   - In `booking.service.spec.ts`, adjust mock timings or timeouts so all unit tests complete rapidly and PASS with 0 timeouts.
   - Run and ensure 100% of tests pass across:
     - `cd D:/test-mobile-app/nest-server && npm run build`
     - `cd D:/test-mobile-app/nest-server && npm test`
     - `cd D:/test-mobile-app/nest-server && npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts`
     - `cd D:/test-mobile-app/nest-server && npx jest --config ./test/jest-e2e.json test/booking.e2e-spec.ts`
     - `node __tests__/run_all_e2e.js`

OUTPUT REQUIREMENTS:
- Write changes to D:/test-mobile-app/.agents/worker_m1_backend_3/changes.md
- Write handoff report to D:/test-mobile-app/.agents/worker_m1_backend_3/handoff.md with full execution logs of the build and test commands.
- Send a message to parent when done.
