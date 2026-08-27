# Comprehensive Survey & Analysis: Dashboard Frontend & Global Testing Architecture

**Date**: 2026-08-24  
**Author**: Dashboard & Testing Explorer Agent  
**Scope**: `dashboard/`, `nest-server/`, mobile (`app/`, `features/`, `components/`), and global test suites (`__tests__/`, `nest-server/test/`)

---

## Executive Summary

This investigation surveys the dashboard frontend architecture, venue management workflows, API integration contracts, and the global testing infrastructure across the repository. It analyzes how requirements **R1 (Remove Cash & Auto-Wallet Deduct)**, **R2 (Multi-Slot Group Booking)**, **R3 (Minimum Deposit Per Slot)**, **R4 (Fix Already Booked Slots UI Lockout)**, and **R5 (Fix Venue Creation `existingImages` Bug)** manifest in the frontend UI, validation schemas, and backend DTOs, and establishes a comprehensive 4-tier test case inventory and E2E opaque-box testing blueprint.

---

## Part 1: Dashboard Frontend Architecture & Venue Workflows

### 1.1 Technology Stack & Directory Layout
- **Path**: `D:/test-mobile-app/dashboard/`
- **Framework**: Vite 6.1.0 + React 19.0.0 + TypeScript 5.7.2
- **Routing**: React Router v7 (`react-router` v7.1.5)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss` v4.0.8)
- **State & Networking**: TanStack React Query v5 (`@tanstack/react-query` v5.101.4), Native Fetch API client with automatic JWT token refresh (`apiClient.ts`), Socket.io client (`socket.io-client` v4.8.3)
- **Form Handling & UI**: Controlled React state components, Tailwind UI modals and dropzones (`react-dropzone` v14.3.5)

### 1.2 Venue Management Components & Pages
| File Path | Role & Purpose | Key Findings & Deficiencies |
|---|---|---|
| `dashboard/src/pages/VenuesPage.tsx` | Main venue catalogue, metrics summary, grid/table view, filter controls, CRUD actions trigger. | Fetches venues via `venueApi.getAllVenues()`. Renders metrics (total, active, sports types, average price). Lacks display of `minimumDepositAmount`. |
| `dashboard/src/components/venue/VenueFormModal.tsx` | Venue creation and edit modal form with multi-image S3 file uploads, operating hours, peak pricing rules, and amenities. | 1. **Sends `existingImages` on Create**: Line 264 appends `existingImages` and `keepImages` to `FormData` even during venue creation, causing NestJS `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` to reject creation with 400 Bad Request.<br>2. **Missing `minimumDepositAmount`**: No form input, no state variable, and no payload field for minimum deposit per slot. |
| `dashboard/src/components/venue/VenueDetailModal.tsx` | Read-only modal displaying venue hero image, gallery carousel, working hours, pricing rules, and amenities. | Displays default hourly rate and peak overrides, but does not display `minimumDepositAmount`. |
| `dashboard/src/components/venue/DeleteVenueModal.tsx` | Soft-delete confirmation modal. | Calls `venueApi.deleteVenue(id)`. Fully compliant. |
| `dashboard/src/services/api/venueApi.ts` | Axios/Fetch wrapper for `/venue` endpoints with `normalizeVenue` helper. | Normalizes raw backend objects into typed `Venue`. Does not currently map `minimumDepositAmount`. |
| `dashboard/src/types/index.ts` | Frontend TypeScript interface definitions matching NestJS schemas. | `interface Venue` (lines 68–104) is missing `minimumDepositAmount?: number;`. |

### 1.3 Detailed Gap Analysis: `minimumDepositAmount` & `existingImages`

#### A. Handling `existingImages` (R5)
- **Problem**: When a user creates a new venue from `VenueFormModal.tsx`, the form appends `formData.append("existingImages", JSON.stringify(existingImages))` and `formData.append("keepImages", img)`. In `nest-server/src/modules/venue/dto/venue.dto.ts`, `CreateVenueDto` only defines basic fields (`venueName`, `address`, `sportsType`, `locationAlt`, `locationLang`, `amenities`, `startWorkingHours`, `endWorkingHours`, `defaultHourPrice`, `customHourPrices`, `isActive`). When NestJS validates the payload with `forbidNonWhitelisted: true`, `existingImages` is rejected as an unrecognized property.
- **Resolution**:
  1. Add `@ApiPropertyOptional({ description: 'Optional array of existing image URLs to retain', type: [String] }) @IsOptional() @ParseArray() @IsArray() @IsString({ each: true }) existingImages?: string[];` to `CreateVenueDto` in `nest-server/src/modules/venue/dto/venue.dto.ts`.
  2. Add `keepImages?: string[]` to `CreateVenueDto` as well for complete multi-format compatibility.

#### B. Handling `minimumDepositAmount` (R3)
- **Problem**: Venue owners need to enforce a mandatory deposit per reserved slot (e.g. 100 EGP) instead of requiring full payment or allowing zero-deposit bookings. Currently, the field does not exist in the backend entity, DTOs, or dashboard UI.
- **Required Changes in Dashboard**:
  1. **`dashboard/src/types/index.ts`**:
     ```typescript
     export interface Venue {
       // ... existing fields
       defaultHourPrice: number;
       minimumDepositAmount?: number; // Added
       // ...
     }
     ```
  2. **`dashboard/src/components/venue/VenueFormModal.tsx`**:
     - Add state: `const [minimumDepositAmount, setMinimumDepositAmount] = useState<number | "">(0);`
     - Populate in `useEffect`: `setMinimumDepositAmount(Number(editingVenue.minimumDepositAmount ?? 0));`
     - Add numeric form input under "Operating Hours & Base Pricing" section:
       ```tsx
       <div>
         <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
           Min Deposit / Slot (EGP)
         </label>
         <input
           type="number"
           min="0"
           value={minimumDepositAmount}
           onChange={(e) => setMinimumDepositAmount(e.target.value === "" ? "" : Number(e.target.value))}
           placeholder="0 (Full payment required)"
           className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
         />
       </div>
       ```
     - Append to payload: `formData.append("minimumDepositAmount", String(Number(minimumDepositAmount || 0)));`
  3. **`dashboard/src/components/venue/VenueDetailModal.tsx`**:
     - Render deposit requirement badge/summary card alongside hourly rate.
  4. **`dashboard/src/services/api/venueApi.ts`**:
     - Normalize: `minimumDepositAmount: Number(raw.minimumDepositAmount ?? 0)`.

---

## Part 2: Global Testing Infrastructure Audit

### 2.1 Inventory of Test Frameworks Across the Repository

| Subsystem | Test Framework | Config File | Existing Test Files | Status & Capabilities |
|---|---|---|---|---|
| **Backend (`nest-server/`)** | Jest 30.0.0 + ts-jest 29.2.5 + Supertest 7.0.0 | `nest-server/test/jest-e2e.json`, `nest-server/package.json` | `nest-server/test/booking.e2e-spec.ts` (1,037 lines), `app.e2e-spec.ts` | **Active & Robust**: Full NestJS testing module integration, MongoDB test repositories, Redis locking, Supertest HTTP assertions. |
| **Mobile (`root`)** | Standalone Node test runner scripts with Mock AsyncStorage & React Native shims | `package.json` | `__tests__/verify_m1_challenger_stress.js`, `__tests__/verify_m1_invariants.js`, `__tests__/verify_m1_mobile_invariants.js` | **Active Invariant Harness**: Runs invariant tests against local storage, mock stores, double-refund guards, and state consistency. |
| **Dashboard (`dashboard/`)** | Node-based invariant test runner via root `__tests__/` | N/A | Tests in `__tests__/verify_m1_invariants.js` import `dashboard/src/data/mockStore.ts` | Tests financial reporting, double cancellation, negative cash payouts. |

---

## Part 3: E2E Opaque-Box Verification Strategy for Requirements R1–R5

An **opaque-box (black-box) E2E testing strategy** verifies system behavior purely through external observable interfaces (HTTP REST endpoints, WebSocket event streams, and UI state contracts) without relying on internal code implementation details.

```
+-----------------------------------------------------------------------------------+
|                           OPAQUE-BOX E2E TEST RUNNER                              |
+-----------------------------------------------------------------------------------+
       |                                      |                                |
       v                                      v                                v
+------------------+                +------------------+             +------------------+
| REST API Clients |                | WebSocket Client |             | Mock Paymob / DB |
| (Supertest/Axios)|                | (Socket.io)      |             | State Inspector  |
+------------------+                +------------------+             +------------------+
       |                                      |                                |
       +--------------------------------------+--------------------------------+
                                              |
                                              v
+-----------------------------------------------------------------------------------+
|                                 SYSTEM UNDER TEST                                 |
|  - NestJS API Gateway (`/api/v1/booking`, `/api/v1/venue`, `/api/v1/wallet`)      |
|  - Socket.io Venue Gateway (`slot_locked`, `slot_released`, `booking_confirmed`)  |
|  - Paymob Payment Intention Webhook Receiver                                      |
+-----------------------------------------------------------------------------------+
```

### 3.1 Verification Mapping by Requirement

#### R1: Remove Cash & Auto-Wallet Deduct
1. **Scenario A (Wallet Balance >= Total Cost)**:
   - User wallet balance: 500 EGP. Booking total: 300 EGP.
   - User initiates booking with no payment method selection required.
   - Assert: Backend auto-deducts 300 EGP from wallet; status becomes `confirmed`, paymentStatus becomes `paid`; Paymob session is **skipped** (no clientSecret generated).
   - Assert: Wallet balance is 200 EGP.
2. **Scenario B (0 < Wallet Balance < Total Cost)**:
   - User wallet balance: 100 EGP. Booking total: 400 EGP.
   - Assert: Backend auto-deducts 100 EGP from wallet; remaining 300 EGP is charged via Paymob intention session; paymentStatus is `unpaid` / `partially_paid` until Paymob webhook confirmation.
3. **Scenario C (Wallet Balance == 0)**:
   - User wallet balance: 0 EGP. Booking total: 300 EGP.
   - Assert: Full 300 EGP charged via Paymob; no wallet transaction recorded.
4. **Scenario D (Cash Option Elimination)**:
   - Sending `paymentMethod: 'cash'` is either rejected by backend validation or ignored; UI no longer renders cash option.

#### R2: Multi-Slot Group Booking
1. **Scenario A (Non-Continuous Slots Selection)**:
   - User selects slots 18:00–19:00 and 21:00–22:00 on date `2026-09-01` for Venue V.
   - Backend `POST /booking` receives array of slots: `slots: [{ startTime: 18, endTime: 19 }, { startTime: 21, endTime: 22 }]`.
   - Assert: Backend creates 2 distinct `Booking` documents in MongoDB sharing the exact same `groupId` (UUID).
   - Assert: Total cost is calculated as sum of individual slot prices (e.g. 250 + 350 = 600 EGP).
   - Assert: A single Paymob checkout intention session is initiated for the combined group total.
2. **Scenario B (Real-time Broadcast of Multi-Slot Locks)**:
   - Both slots (18:00 and 21:00) emit `slot_locked` over Socket.io to all listening mobile clients.

#### R3: Minimum Deposit Per Slot
1. **Scenario A (Venue Configured with Deposit)**:
   - Venue configured with `defaultHourPrice = 300`, `minimumDepositAmount = 100`.
   - User books 3 slots (total standard cost = 900 EGP).
   - Assert: Total required deposit = `3 * 100 = 300 EGP`.
   - Assert: If user pays deposit (via wallet/Paymob), booking is created with `totalPrice = 900`, `finalPrice = 300`, `paymentStatus = 'partially_paid'`, `status = 'confirmed'`.
2. **Scenario B (Venue Configured with Deposit = 0 or undefined)**:
   - Venue has no deposit configured (`minimumDepositAmount = 0`).
   - Assert: Required payment amount is full slot price (900 EGP); paymentStatus is `paid`.

#### R4: Fix Already Booked Slots UI Lockout
1. **Scenario A (Date String Invariant)**:
   - Slot booked for date `2026-08-28` at 19:00.
   - Date generator and availability endpoint match ISO date `2026-08-28` without UTC timezone shifting (e.g. preventing shift to `2026-08-27` or `2026-08-29`).
   - Assert: Slot 19:00 is disabled (`available: false`) only on `2026-08-28` and remains selectable on `2026-08-29`.

#### R5: Fix Venue Creation Bug (`existingImages`)
1. **Scenario A (Dashboard Venue Creation Payload)**:
   - Dashboard sends `FormData` containing `venueName`, `address`, `sportsType`, `locationAlt`, `locationLang`, `startWorkingHours`, `endWorkingHours`, `defaultHourPrice`, `existingImages: "[]"`, `keepImages: []`, `images: File[]`.
   - Assert: Backend `POST /venue` successfully validates payload with HTTP 201 Created and saves venue without `400 Bad Request: property existingImages should not exist`.

---

## Part 4: 4-Tier Test Case Inventory Design

```
+---------------------------------------------------------------------------+
|                        4-TIER TEST CASE INVENTORY                         |
+---------------------------------------------------------------------------+
|  Tier 1: Feature Acceptance Tests (Happy Path)                            |
|  Tier 2: Boundary & Edge Case Tests (Zero, Extremes, Formats)            |
|  Tier 3: Combinatorial & Concurrency Tests (Multi-variable Interactions)  |
|  Tier 4: Real-World Scenarios & Failure Resilience (Network, Webhooks)    |
+---------------------------------------------------------------------------+
```

### Tier 1: Feature Acceptance Tests (Core Capabilities)

| Test ID | Target Component | Description & Preconditions | Input / Action | Expected Result |
|---|---|---|---|---|
| **T1-R1-01** | Mobile & Backend Wallet | User books single slot with wallet balance > slot price. | Book 1 slot (250 EGP), Wallet balance: 500 EGP. | Wallet balance debited to 250 EGP; booking confirmed; Paymob skipped; `paymentStatus: 'paid'`. |
| **T1-R1-02** | Mobile & Backend Wallet | User books single slot with wallet balance < slot price. | Book 1 slot (250 EGP), Wallet balance: 100 EGP. | 100 EGP debited from wallet; Paymob intention initialized for 150 EGP; status confirmed upon Paymob success. |
| **T1-R2-01** | Mobile SlotPicker & API | User selects 2 non-adjacent slots on same date. | Select 10:00–11:00 & 16:00–17:00 on `2026-09-05`. | Both slots marked selected in UI; single group booking API call sent with both slots. |
| **T1-R2-02** | Backend Booking Service | Group booking creation in NestJS. | `POST /booking` with 2 slots. | 2 `Booking` documents created in DB with identical `groupId`; single combined payment session returned. |
| **T1-R3-01** | Dashboard Venue Form | Admin creates venue with minimum deposit per slot. | Set `minimumDepositAmount: 100` in `VenueFormModal`. | Venue saved in MongoDB with `minimumDepositAmount: 100`; visible in `VenueDetailModal`. |
| **T1-R3-02** | Booking Pricing Engine | Deposit calculation for multi-slot booking. | Book 3 slots (default 300 EGP, deposit 100 EGP). | Required checkout amount is 300 EGP (`3 * 100`); paymentStatus set to `partially_paid`. |
| **T1-R4-01** | Mobile DateSlotGenerator | Availability lockout across date boundaries. | Slot 20:00 booked on `2026-09-10`. | UI shows 20:00 as booked on `2026-09-10`, and available on `2026-09-11`. |
| **T1-R5-01** | Dashboard & Backend Venue API | Venue creation from dashboard with `existingImages` in payload. | `POST /venue` with `existingImages: []` in `FormData`. | HTTP 201 Created; venue created without DTO whitelist error. |

---

### Tier 2: Boundary & Edge Case Tests (Extremes & Zeroes)

| Test ID | Target Component | Boundary Condition Tested | Input / Action | Expected Result |
|---|---|---|---|---|
| **T2-R1-01** | Wallet Auto-Deduct | Wallet balance is exactly 0.00 EGP. | Book slot (300 EGP), Wallet: 0 EGP. | 0 EGP deducted from wallet; 100% (300 EGP) routed to Paymob intention session. |
| **T2-R1-02** | Wallet Auto-Deduct | Wallet balance exactly equals booking total price. | Book slot (300 EGP), Wallet: 300 EGP. | Wallet debited to 0 EGP; booking immediately confirmed (`paid`); Paymob session skipped. |
| **T2-R1-03** | Wallet Auto-Deduct | Fractional wallet balance (e.g. 150.50 EGP). | Book slot (300 EGP), Wallet: 150.50 EGP. | 150.50 EGP debited; exactly 149.50 EGP charged on Paymob. |
| **T2-R2-01** | Multi-Slot Selector | Selecting maximum slots in single operating day (e.g. all 16 open hours). | Select all slots from 08:00 to 24:00. | All 16 slots grouped under 1 `groupId`; total cost is correctly summed; batch booking succeeds. |
| **T2-R2-02** | Multi-Slot Selector | Selecting single slot in multi-slot picker mode. | Select exactly 1 slot. | Operates seamlessly; creates 1 `Booking` document with assigned `groupId`. |
| **T2-R3-01** | Deposit Calculation | `minimumDepositAmount` configured as 0 or null. | Venue has `minimumDepositAmount: 0`. Book 2 slots (250 EGP each). | Required checkout amount = 500 EGP (full price); `paymentStatus: 'paid'`. |
| **T2-R3-02** | Deposit Calculation | `minimumDepositAmount` configured higher than standard hourly rate. | Venue default price: 200 EGP, deposit: 250 EGP. | Backend validation or pricing engine clamps deposit to max slot price (200 EGP/slot). |
| **T2-R4-01** | Time Parsing | Booking slot around daylight saving / midnight boundary (e.g. 23:00–24:00 / 00:00). | Slot spanning 23:00 to 24:00. | Date correctly mapped to day N; does not spill over to day N+1. |
| **T2-R5-01** | Venue DTO Validation | `existingImages` sent as empty array string `[]`, empty array `[]`, or null. | Create venue with `existingImages: []`. | Validation pipe passes without type errors. |

---

### Tier 3: Combinatorial & Concurrency Tests

| Test ID | Interaction Dimensions | Test Scenario | Expected Result |
|---|---|---|---|
| **T3-C01** | Multi-Slot + Wallet Partial + Paymob Remainder + Minimum Deposit | Venue deposit: 100 EGP/slot. 3 slots booked (standard = 900 EGP, deposit = 300 EGP). User wallet: 100 EGP. | 1. Required deposit total = 300 EGP.<br>2. Wallet auto-deducts 100 EGP.<br>3. Remaining 200 EGP charged via Paymob.<br>4. 3 bookings created under shared `groupId`, `paymentStatus: 'partially_paid'`. |
| **T3-C02** | Multi-Slot + Promotional Coupon + Wallet Deduction | 2 slots booked (600 EGP). Coupon applied: 50% discount (total = 300 EGP). Wallet: 200 EGP. | Discount applied across group total (300 EGP). Wallet auto-deducts 200 EGP. Remaining 100 EGP routed to Paymob. |
| **T3-C03** | Concurrency: Race on Overlapping Slots in Multi-Slot Booking | User A selects slots [18:00, 19:00, 20:00]. User B concurrently selects [20:00, 21:00]. Both submit at the same millisecond. | Redis distributed lock ensures exactly one user acquires slot 20:00. The winning user gets all requested slots; the losing user receives a 409 Conflict error with atomic rollback (no partial orphan slots). |
| **T3-C04** | Concurrency: Idempotency Key Reuse on Multi-Slot Booking | Network retry sends identical `CreateBookingDto` with same `idempotencyKey` and `groupId`. | Second request receives cached response without creating duplicate bookings or double-debiting wallet. |

---

### Tier 4: Real-World Scenarios & Failure Resilience Tests

| Test ID | Scenario Description | Failure / Environmental Event | Expected System Behavior & Recovery |
|---|---|---|---|
| **T4-RW-01** | Paymob Drop / User Abandonment in Multi-Slot Booking | User initiates 3-slot booking, wallet is debited 100 EGP, Paymob modal opens, user closes modal / cancels. | 1. Mobile client triggers cancellation.<br>2. Backend rolls back wallet deduction (100 EGP refunded to wallet).<br>3. Pending booking group status set to `cancelled`.<br>4. All 3 slots released via WebSocket `slot_released`. |
| **T4-RW-02** | Paymob Webhook Out-of-Order / Delayed Delivery | Paymob webhook arrives 10 seconds after user has completed payment on WebView. | Booking gateway polls/verifies transaction; when webhook arrives, it transitions all bookings in `groupId` from `pending` to `confirmed` with idempotency guard preventing duplicate credit/debit. |
| **T4-RW-03** | Expired Booking Cleanup Cron for Multi-Slot Groups | User abandons checkout; 15-minute hold expires. | NestJS `@Cron` job `cleanExpiredBookings` finds all pending bookings in group, transitions them to `expired`, refunds any temporary wallet hold, and emits `slot_released` for all slots. |
| **T4-RW-04** | Dashboard Venue Modification During Live Booking | Admin edits venue working hours or pricing in Dashboard while a mobile user is viewing slot picker. | WebSocket / React Query cache invalidation triggers refresh; mobile app reflects new hours/rates without crashing. |

---

## Part 5: Implementation Blueprint & Recommendations

### Summary Checklist for Engineering Implementation

- [ ] **Backend DTOs (`nest-server/src/modules/venue/dto/venue.dto.ts`)**:
  - Add `existingImages?: string[]` and `keepImages?: string[]` to `CreateVenueDto`.
  - Add `minimumDepositAmount?: number` to `CreateVenueDto` and `UpdateVenueDto`.
- [ ] **Backend Entity (`nest-server/src/modules/venue/entities/venue.entity.ts`)**:
  - Add `@Prop({ type: Number, default: 0 }) minimumDepositAmount?: number;`.
- [ ] **Backend Booking (`nest-server/src/modules/booking/`)**:
  - Add `groupId` to `Booking` schema.
  - Update `PaymentStatusEnum` to include `partially_paid`.
  - Update `createBooking` to accept `slots: Array<{ startTime: number; endTime: number }>` or single interval with multi-slot support, generate shared `groupId`, calculate deposit (`slots.length * minimumDepositAmount`), auto-deduct wallet balance, and initiate single Paymob session for remainder.
- [ ] **Dashboard (`dashboard/src/`)**:
  - Update `Venue` interface in `types/index.ts` to include `minimumDepositAmount?: number;`.
  - Add `minimumDepositAmount` input in `VenueFormModal.tsx` and display in `VenueDetailModal.tsx`.
  - Update `venueApi.ts` normalizer.
- [ ] **Mobile App (`features/bookings/`)**:
  - Remove `PaymentMethodSelector.tsx` from booking flow.
  - Update `SlotPicker.tsx` to allow selecting multiple slots (`HourlySlot[]`).
  - Update `useBookingFlow.ts` to calculate auto-wallet deduction (`min(walletBalance, totalCost)`), compute deposit requirement, and pass slot array to API.
  - Fix date string parsing in availability check to prevent timezone mismatch.
