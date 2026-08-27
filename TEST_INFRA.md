# TEST_INFRA.md — Comprehensive Test Infrastructure & Methodology Specification

## 1. Executive Summary & Philosophy

### 1.1 Testing Philosophy: Opaque-Box & Requirement-Driven
The testing infrastructure of the Sports Venue Management Platform follows an **opaque-box (black-box), requirement-driven verification philosophy**:
- **Behavior-Driven Over Implementation-Coupled**: Tests evaluate observable system behavior through external API contracts (HTTP REST endpoints, WebSocket event streams, DTO validation pipelines) and domain calculation contracts rather than internal class implementations.
- **Mathematical Invariant Verification**: All financial transactions (wallet auto-deduction, Paymob remainder routing, deposit calculations, and multi-slot price aggregations) are verified against strict mathematical invariants ($walletDeduction = \min(balance, totalDue)$).
- **Adversarial & Edge-Case Hardening**: Tests actively exercise invalid input permutations, boundary extremes, concurrency races, timezone shifts, and network failure modes.
- **Genuine Execution**: Zero facade or mock-pass tests. Every test executes real logic, asserts exact properties, and produces actionable telemetry.

---

## 2. 4-Tier Test Methodology & Feature Inventory

The test architecture organizes all verification into four structured tiers:

```
+-----------------------------------------------------------------------------------+
|                           4-TIER TESTING ARCHITECTURE                             |
+-----------------------------------------------------------------------------------+
|  Tier 1: Feature Coverage (Core Capabilities, >=5 Test Cases Per Feature)         |
|  Tier 2: Boundary & Corner Cases (Extremes, Zeroes, Precision, Formats)           |
|  Tier 3: Combinatorial & Concurrency (Multi-variable Pairwise Interactions)       |
|  Tier 4: Real-World Scenarios & Failure Resilience (End-to-End Workflows, Leaks)  |
+-----------------------------------------------------------------------------------+
```

### 2.1 Feature Mapping Overview (R1 – R5)

| Req ID | Feature Domain | Primary Objectives | Key Invariants |
|---|---|---|---|
| **R1** | Wallet Auto-Deduction & Cash Removal | Eliminate cash option; auto-deduct `min(walletBalance, totalCost)`; zero remainder skips Paymob; positive remainder routes to Paymob. | $D = \min(B, C)$, $P_{rem} = C - D$. When $P_{rem}=0$, Paymob skipped. |
| **R2** | Multi-Slot Group Booking | Allow selecting multiple non-continuous/continuous slots on same date; assign shared `groupId`; single combined payment session. | All slot docs share identical `groupId`; $TotalPrice = \sum SlotPrice_i$. |
| **R3** | Minimum Deposit Per Slot | Configure venue `minimumDepositAmount`; required payment $= \text{slots.length} \times \text{minimumDepositAmount}$; mark `partially_paid`. | $Deposit = N \times MinDeposit$; Status = `partially_paid` if $Deposit < Total$. |
| **R4** | Slot Lockout & Timezone Safety | Lock all hourly sub-slots in $[startTime, endTime)$; normalize date strings without timezone shifts. | Booking $[18, 20)$ locks 18 and 19; Date $D$ never locks $D \pm 1$. |
| **R5** | Venue Creation DTO Compatibility | Support `existingImages` & `keepImages` in `CreateVenueDto` without 400 Bad Request whitelist rejection. | `CreateVenueDto` & `UpdateVenueDto` accept image arrays under strict validation. |

---

## 3. Detailed 4-Tier Test Case Inventory

### Tier 1: Feature Coverage Tests (>=5 per Feature)

#### R1: Wallet Auto-Deduction & Cash Elimination
- **T1-R1-01 (Full Wallet Coverage)**: User with wallet balance (500 EGP) reserves slot (300 EGP). Wallet debited by 300 EGP (new balance 200 EGP); booking confirmed; `paymentStatus: paid`; Paymob session skipped (`paymobRequired: 0`).
- **T1-R1-02 (Partial Wallet Coverage)**: User with wallet balance (100 EGP) reserves slot (350 EGP). Wallet debited by 100 EGP (balance 0 EGP); Paymob intention initialized for 250 EGP; `paymentStatus: unpaid` or `partially_paid`.
- **T1-R1-03 (Zero Wallet Balance)**: User with wallet balance (0 EGP) reserves slot (200 EGP). Wallet deduction is 0 EGP; full 200 EGP routed to Paymob session.
- **T1-R1-04 (Wallet Deduction Invariant Formula)**: Validate calculation engine against arbitrary tuples $(B, C)$ ensuring $D = \min(B, C)$ and $R = C - D$ across diverse price points.
- **T1-R1-05 (Cash Option Removal)**: Confirm client checkout flow does not present cash selection and payment payload defaults to auto-wallet + Paymob remainder.

#### R2: Multi-Slot Group Booking
- **T1-R2-01 (Non-Continuous Slots)**: User selects slots 10:00–11:00 and 16:00–17:00 on the same date. Frontend packages `slots: [{ startTime: 10, endTime: 11 }, { startTime: 16, endTime: 17 }]`.
- **T1-R2-02 (Group ID Linkage)**: Backend receives 2 slots and creates 2 separate `Booking` documents in MongoDB sharing the exact same `groupId` (UUID v4).
- **T1-R2-03 (Aggregated Total Price)**: Backend sums individual slot prices (e.g. 200 + 300 = 500 EGP) into the group total.
- **T1-R2-04 (Unified Payment Session)**: Single Paymob intention checkout session generated for the aggregated group total remainder.
- **T1-R2-05 (Multi-Slot Query by GroupId)**: Querying `/api/v1/booking/group/:groupId` returns all constituent booking records.

#### R3: Minimum Deposit Per Slot
- **T1-R3-01 (Venue Minimum Deposit Schema)**: Venue schema and DTO contain `minimumDepositAmount?: number`; correctly persisted and retrieved.
- **T1-R3-02 (Multi-Slot Deposit Calculation)**: Booking 3 slots on a venue with `minimumDepositAmount = 100` calculates required checkout deposit $= 3 \times 100 = 300\text{ EGP}$.
- **T1-R3-03 (`partially_paid` Payment Status)**: When user pays the minimum deposit (300 EGP on a 900 EGP booking), `paymentStatus` is assigned `partially_paid`.
- **T1-R3-04 (Wallet Auto-Deduction Against Deposit)**: When booking with deposit (300 EGP) and wallet (200 EGP), wallet deducts 200 EGP and Paymob charges remaining deposit of 100 EGP.
- **T1-R3-05 (Zero Deposit Full Payment Fallback)**: When `minimumDepositAmount` is 0 or undefined, required checkout amount is 100% of total price and status is `paid`.

#### R4: Slot Lockout & Timezone Safety
- **T1-R4-01 (Multi-Hour Interval Lockout [18, 20))**: A booking for interval 18:00–20:00 locks out both slot 18:00–19:00 and slot 19:00–20:00.
- **T1-R4-02 (3-Hour Interval Lockout [14, 17))**: Interval 14:00–17:00 locks out slots 14, 15, and 16.
- **T1-R4-03 (Timezone Normalization Invariant)**: Date string `2026-09-15` normalizes identically across UTC, UTC+2, UTC+3, and UTC-5 without date shifting.
- **T1-R4-04 (Cross-Date Isolation)**: A booked slot at 18:00 on `2026-09-15` disables slot 18 on `2026-09-15` while slot 18 on `2026-09-16` remains available.
- **T1-R4-05 (Single-Hour Interval Lockout [10, 11))**: Single hour booking locks only slot 10 and leaves slot 11 available.

#### R5: Venue Creation DTO Compatibility
- **T1-R5-01 (`CreateVenueDto` with `existingImages`)**: `CreateVenueDto` accepts `existingImages: []` without `400 Bad Request: property existingImages should not exist`.
- **T1-R5-02 (`CreateVenueDto` with `keepImages`)**: `CreateVenueDto` accepts `keepImages: []` and string arrays.
- **T1-R5-03 (`CreateVenueDto` with `minimumDepositAmount`)**: Accepts positive numbers and zero.
- **T1-R5-04 (`UpdateVenueDto` Array Transformers)**: Accepts `existingImages`, `keepImages`, `removedImages`, `deleteImages`.
- **T1-R5-05 (HTTP 201 Persistence)**: Backend `POST /venue` successfully persists new venue with image arrays and deposit amount.

---

### Tier 2: Boundary & Corner Cases (>=5 per Feature)

| Test ID | Feature | Boundary Condition Tested | Input Values / Scenario | Expected Outcome |
|---|---|---|---|---|
| **T2-R1-01** | R1 | Wallet balance exactly 0.00 EGP | Balance: 0.00, Cost: 250.00 | Deduction: 0.00, Paymob: 250.00 |
| **T2-R1-02** | R1 | Wallet balance exactly equals total cost | Balance: 300.00, Cost: 300.00 | Deduction: 300.00, Paymob: 0.00, Status: `paid` |
| **T2-R1-03** | R1 | Wallet balance 1 cent below total cost | Balance: 299.99, Cost: 300.00 | Deduction: 299.99, Paymob: 0.01 |
| **T2-R1-04** | R1 | Wallet balance 1 cent above total cost | Balance: 300.01, Cost: 300.00 | Deduction: 300.00, Paymob: 0.00 |
| **T2-R1-05** | R1 | High-precision floating point values | Balance: 123.456, Cost: 250.789 | Rounded/handled with financial 2-decimal precision |
| **T2-R2-01** | R2 | Single slot in multi-slot array | `slots: [{ startTime: 10, endTime: 11 }]` | 1 `Booking` doc with `groupId` assigned |
| **T2-R2-02** | R2 | Full operating day booking (16 slots) | Slots from 08:00 to 24:00 | 16 `Booking` docs under 1 `groupId`, correct sum |
| **T2-R2-03** | R2 | Disjoint morning & late evening slots | `[08, 09]` and `[23, 24]` | 2 disjoint slots created under 1 `groupId` |
| **T2-R2-04** | R2 | Empty slots array | `slots: []` | Validation rejection: 400 Bad Request |
| **T2-R2-05** | R2 | Inverted time slot `startTime >= endTime` | `startTime: 18, endTime: 17` | Validation rejection: 400 Bad Request |
| **T2-R3-01** | R3 | `minimumDepositAmount = 0` | Deposit: 0, 3 slots @ 200 EGP | Required: 600 EGP (100%), Status: `paid` |
| **T2-R3-02** | R3 | `minimumDepositAmount = undefined/null` | Deposit: null, 2 slots @ 250 EGP | Required: 500 EGP (100%), Status: `paid` |
| **T2-R3-03** | R3 | Deposit amount equals standard slot price | Deposit: 250, Slot price: 250 | Required: 250 EGP (100%), Status: `paid` |
| **T2-R3-04** | R3 | Deposit amount exceeds standard slot price | Deposit: 350, Slot price: 250 | Clamped/validated to max slot price (250 EGP) |
| **T2-R3-05** | R3 | Negative deposit amount validation | `minimumDepositAmount: -50` | Validation rejection: 400 Bad Request |
| **T2-R4-01** | R4 | Midnight rollover slot | Slot 23:00 to 24:00 (00:00) | Belongs to day $D$, does not roll into $D+1$ |
| **T2-R4-02** | R4 | Opening operating hour slot | `[startWorkingHours, startWorkingHours+1)` | Valid and lockable |
| **T2-R4-03** | R4 | Closing operating hour slot | `[endWorkingHours-1, endWorkingHours)` | Valid and lockable |
| **T2-R4-04** | R4 | Daylight Saving Time transition date | Date string during DST clock shift | Exact ISO calendar date preserved |
| **T2-R4-05** | R4 | Leap year date boundary | `2028-02-29` | Valid calendar date normalization |
| **T2-R5-01** | R5 | `existingImages` as empty array | `existingImages: []` | HTTP 201 Created |
| **T2-R5-02** | R5 | `existingImages` as string array | `["https://s3/img1.jpg", "https://s3/img2.jpg"]` | HTTP 201 Created |
| **T2-R5-03** | R5 | `existingImages` as stringified JSON | `existingImages: "[\"https://s3/img1.jpg\"]"` | Parsed and validated as string array |
| **T2-R5-04** | R5 | `keepImages` and `removedImages` payload | Mixed image arrays | Validated without property rejection |
| **T2-R5-05** | R5 | Boundary deposit in venue creation | `minimumDepositAmount: 0` vs `10000` | Validated as non-negative number |

---

### Tier 3: Combinatorial & Concurrency Tests

- **T3-C01 (Multi-Slot + Minimum Deposit + Wallet Partial + Paymob Remainder)**:
  - 3 slots booked ($3 \times 300 = 900\text{ EGP}$). Venue deposit: 100 EGP/slot ($3 \times 100 = 300\text{ EGP}$).
  - User wallet balance: 120 EGP.
  - Expected: Required deposit = 300 EGP. Wallet auto-deducts 120 EGP. Paymob session created for remaining 180 EGP. All 3 bookings created under shared `groupId`, `paymentStatus: partially_paid`.
- **T3-C02 (Multi-Slot + Full Wallet Coverage + Minimum Deposit)**:
  - 2 slots booked ($2 \times 250 = 500\text{ EGP}$). Venue deposit: 100 EGP/slot ($2 \times 100 = 200\text{ EGP}$).
  - User wallet balance: 600 EGP.
  - Expected: Full deposit or full amount auto-deducted from wallet; Paymob session completely skipped; booking status `confirmed`.
- **T3-C03 (Multi-Slot + Coupon Discount + Wallet Auto-Deduction)**:
  - 2 slots booked ($2 \times 300 = 600\text{ EGP}$). Coupon applied: 50% off (discounted total = 300 EGP).
  - User wallet balance: 200 EGP.
  - Expected: Wallet auto-deducts 200 EGP; remaining 100 EGP routed to Paymob.
- **T3-C04 (Multi-Hour Interval Lockout & Real-Time Socket Lock Broadcast)**:
  - User locks interval $[18, 21)$ (3 hours).
  - Expected: Socket gateway broadcasts `slot_locked` for sub-slots 18, 19, and 20; other clients see all 3 slots disabled.
- **T3-C05 (Concurrent Overlapping Multi-Slot Booking Race)**:
  - User A requests $[18, 20)$ (slots 18, 19). Concurrently, User B requests $[19, 21)$ (slots 19, 20).
  - Expected: Exactly one user successfully secures slot 19; the losing request receives 409 Conflict with atomic rollback (no partial orphan slot created).

---

### Tier 4: Real-World Scenarios & Failure Resilience Tests

- **T4-RW-01 (End-to-End Multi-Slot Paymob Webhook Lifecycle)**:
  - User initiates multi-slot booking with Paymob remainder -> pending bookings created in DB -> Paymob webhook delivers HMAC-signed success event -> all bookings in `groupId` transition to `confirmed` with `paymentStatus: partially_paid` / `paid`.
- **T4-RW-02 (Checkout Abandonment & Atomic Hold Release)**:
  - User initiates multi-slot booking with wallet hold -> user cancels or abandons Paymob checkout modal -> wallet deduction refunded, pending booking group cancelled, all slot locks released.
- **T4-RW-03 (Paymob Webhook Late/Out-of-Order Delivery Resilience)**:
  - Delayed Paymob webhook arrives after client polling; idempotent webhook handler processes confirmation once without duplicate wallet credits or status corruption.
- **T4-RW-04 (Live Venue Creation -> Instant Mobile Multi-Slot Booking)**:
  - Admin creates venue via dashboard payload (with `existingImages` and `minimumDepositAmount: 150`) -> venue immediately visible to mobile API -> mobile user reserves 2 slots and completes wallet+Paymob checkout.
- **T4-RW-05 (Expired Multi-Slot Booking Cron Cleanup)**:
  - Cron scheduler `cleanExpiredBookings` detects expired pending booking group -> transitions all associated slot records to `expired` and releases holds simultaneously.

---

## 4. Test Architecture & Runner Commands

### 4.1 Execution Architecture

```
                                +-----------------------------------+
                                |     TEST RUNNER ORCHESTRATOR      |
                                |   node __tests__/run_all_e2e.js   |
                                +-----------------------------------+
                                                  |
                  +-------------------------------+-------------------------------+
                  |                                                               |
                  v                                                               v
   +------------------------------+                                +------------------------------+
   |   NESTJS SERVER E2E SUITE    |                                |  CLIENT / DOMAIN INVARIANT   |
   |      (Supertest + Jest)      |                                |        E2E TEST SUITE        |
   |  nest-server/test/           |                                |  __tests__/                  |
   |  booking_payment_flow.e2e... |                                |  e2e_booking_payment_...     |
   +------------------------------+                                +------------------------------+
                  |                                                               |
                  v                                                               v
   - Full HTTP/REST API endpoints                                   - Date slot generator & DST
   - DTO Validation with whitelist                                  - Multi-hour interval lockout
   - MongoDB Mongoose persistence                                   - Wallet deduction invariants
   - GroupId linkage in BookingRepo                                 - Deposit calculation engine
   - Paymob webhook HMAC verifier                                   - Multi-slot payload contracts
```

### 4.2 Primary Runner Commands

1. **Run Full Master E2E Test Suite (All Tiers)**:
   ```bash
   node __tests__/run_all_e2e.js
   ```

2. **Run Backend NestJS E2E Test Suite**:
   ```bash
   cd nest-server && npm run test:e2e
   ```
   Or targeted:
   ```bash
   cd nest-server && npx jest --config ./test/jest-e2e.json test/booking_payment_flow.e2e-spec.ts
   ```

3. **Run Client / Invariant E2E Test Suite**:
   ```bash
   node __tests__/e2e_booking_payment_suite.js
   ```

---

## 5. Pass/Fail Criteria & Quality Gates

- **100% Test Pass Rate**: All Tier 1 through Tier 4 test cases must pass without error or unexpected status code.
- **Financial Invariant Proof**: No scenario may allow over-deduction from wallet ($walletDeduction > walletBalance$), negative balances, or unpaid remainder omission.
- **Zero Orphan Slots**: Multi-slot bookings must commit or fail atomically across all slots in the group.
- **Strict DTO Conformance**: Venue creation and update payloads must pass NestJS `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`.
