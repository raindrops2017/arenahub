## 2026-08-24T16:16:31Z
You are the E2E Test Writer for the project.
Your working directory is: D:/test-mobile-app/.agents/test_writer_e2e

MANDATORY FIRST STEP:
Read D:/test-mobile-app/.agents/ORIGINAL_REQUEST.md (specifically 2026-08-24T16:08:07Z) and D:/test-mobile-app/PROJECT.md.
Also read survey findings in D:/test-mobile-app/.agents/explorer_dashboard_testing_survey/analysis.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All test implementations must be genuine, comprehensive, and executable. Do NOT write fake passing tests.

EXCLUSIVE WRITE OWNERSHIP:
- D:/test-mobile-app/TEST_INFRA.md
- D:/test-mobile-app/TEST_READY.md
- Test files in nest-server/test/ (e.g. nest-server/test/booking_payment_flow.e2e-spec.ts) or root __tests__/ (e.g. __tests__/e2e_booking_payment_suite.js)

OBJECTIVE & DELIVERABLES:
1. Design and write D:/test-mobile-app/TEST_INFRA.md detailing:
   - Test philosophy (opaque-box, requirement-driven)
   - Feature inventory mapped to 4-tier methodology (Tier 1: Feature Coverage >=5 per feature, Tier 2: Boundary/Corner >=5 per feature, Tier 3: Pairwise combinations, Tier 4: Real-world application scenarios)
   - Test architecture and runner commands
2. Implement executable automated test suites covering:
   - R1: Wallet auto-deduction (min(walletBalance, totalCost)), zero remainder skips Paymob, remainder triggers Paymob, cash selector absent.
   - R2: Multi-slot group booking (multiple non-continuous slots on same date, single groupId linking documents, single Paymob session for full group).
   - R3: Minimum deposit per slot (slots.length * minimumDepositAmount, paymentStatus marked partially_paid, mobile UI summary calculations).
   - R4: Booked/held slots lockout across multi-hour intervals [startTime, endTime) and timezone-safe date normalization (e.g. 18:00-20:00 locks both 18 and 19).
   - R5: Venue creation with existingImages & keepImages payload in CreateVenueDto avoiding 400 Bad Request validation errors.
3. Test Runner & Verification:
   - Ensure the test suites can be executed via a simple command (e.g. `npm run test:e2e` in nest-server or `node __tests__/run_all_e2e.js`).
   - Publish D:/test-mobile-app/TEST_READY.md when test suite is fully authored and ready with coverage table.
4. Report back with D:/test-mobile-app/.agents/test_writer_e2e/handoff.md and send message to parent.
