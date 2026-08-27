# Backend Codebase Exploration Analysis: Sports Venue Management Platform

## 1. Executive Summary

This report documents the architectural survey of the NestJS backend located in `nest-server/` with respect to the 4 core requirements:
- **R2 (Multi-slot booking & `groupId`)**: Multi-slot reservation aggregation, schema modeling, concurrent locking, Paymob group payment, and lifecycle management.
- **R3 (Minimum Deposit Per Slot)**: Venue entity configuration, deposit pricing algorithm (`slots.length * venue.minimumDepositAmount`), and `PaymentStatusEnum.partially_paid` integration.
- **R5 (Venue Creation Bug)**: Root cause analysis of `400 Bad Request` during dashboard venue creation due to `forbidNonWhitelisted: true` and missing `existingImages` / image retention decorators in `CreateVenueDto`.
- **Backend Test Harness & Tooling**: Comprehensive mapping of Jest runners, configuration files, test suites (`spec.ts` and `e2e-spec.ts`), and CLI verification.

---

## 2. Requirement Deep Dives

### 2.1 R2: Multi-Slot Booking & `groupId` Architecture

#### 2.1.1 Current Schema & Entity Implementation
- **File**: `nest-server/src/modules/booking/entities/booking.entity.ts`
- **Current Model**:
  - Each `Booking` document models a single contiguous or 1-hour time slice:
    - `startTime: number` (e.g. 18)
    - `endTime: number` (e.g. 20)
    - `date: Date` (normalized to UTC start of day)
    - `venueId: Types.ObjectId`
    - `userId: Types.ObjectId`
    - `totalPrice: number`, `discountAmount: number`, `finalPrice: number`
    - `status: BookingStatusEnum` (`pending`, `confirmed`, `cancelled`, `completed`, `expired`)
    - `paymentStatus: PaymentStatusEnum` (`unpaid`, `paid`, `refunded`, `pay_at_venue`)
    - `bookingCode: string` (e.g. `BK-XXX-YYY`)
    - `qrCode: string` (Base64 QR payload)
    - `idempotencyKey?: string`, `requestHash?: string`
  - **Gap**: There is no `groupId` field on `Booking` to associate multiple non-continuous or continuous slot documents created in the same checkout session.

#### 2.1.2 Current Booking DTOs
- **File**: `nest-server/src/modules/booking/dto/booking.dto.ts`
- **Current `CreateBookingDto`**:
  ```typescript
  export class CreateBookingDto {
    @IsMongoId() @IsNotEmpty() venueId: string;
    @IsDateString() @IsNotEmpty() date: string;
    @Type(() => Number) @IsInt() @Min(0) @Max(23) @IsNotEmpty() startTime: number;
    @Type(() => Number) @IsInt() @Min(1) @Max(24) @IsNotEmpty() @IsGreaterThan('startTime') endTime: number;
    @IsOptional() @IsString() couponCode?: string;
    @IsOptional() @IsString() idempotencyKey?: string;
    @IsEnum(PaymentMethodEnum) @IsNotEmpty() paymentMethod: PaymentMethodEnum;
  }
  ```
- **Gap**: `CreateBookingDto` only accepts scalar `startTime` and `endTime`. It cannot accept an array of multiple slots (e.g. `[{ startTime: 18, endTime: 19 }, { startTime: 21, endTime: 22 }]`).

#### 2.1.3 Current Booking Service Logic
- **File**: `nest-server/src/modules/booking/booking.service.ts`
- **Slot Collision Detection (Lines 279–305)**:
  - Queries `bookingRepo.find` with filter `$or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }]`.
  - Filters out expired holds (`b.status === pending && expiresAt <= now`).
- **Distributed Locking (Lines 270–276)**:
  - Redis lock key: `lock::booking::venue::${venue._id}::${startOfDay.toISOString()}`.
- **Pricing Calculation (Lines 307–328)**:
  - Sums hourly pricing over `[startTime, endTime)` evaluating `venue.customHourPrices` or `venue.defaultHourPrice`.
- **Payment & Confirmation (Lines 426–437, 517–729)**:
  - Creates a single `Booking` document.
  - Calls `payBooking(booking._id, ...)`.
  - If wallet: atomic deduction or compensating transaction, sets `Booking` status to `confirmed` and `paymentStatus` to `paid`.
  - If Paymob: creates `Payment` document, calls `paymobService.createPaymentIntention`, returns Paymob redirect URL.

#### 2.1.4 Paymob Single vs Multiple Bookings Integration
- **Files**:
  - `nest-server/src/common/integration/paymob/paymob.service.ts`
  - `nest-server/src/modules/payment/payment.service.ts`
  - `nest-server/src/modules/payment/payment.controller.ts`
- **Current Flow**:
  - `paymobService.createPaymentIntention` accepts `transactionId`, `amount`, user details, and generates a unified checkout session.
  - The webhook callback (`payment.service.ts:390–670`) receives candidate IDs (`special_reference`, `merchant_order_id`, `bookingId`, etc.).
  - It finds the `Payment` and `Booking` records by `bookingId` or `transactionId`, and updates the single `Booking` to `confirmed` and `paid`.
- **Required Multi-Slot Flow**:
  1. `Booking` schema must include `@Prop({ type: String, index: true }) groupId?: string;`.
  2. `CreateBookingDto` must support `slots?: Array<{ startTime: number; endTime: number }>`.
  3. `createBooking` creates $N$ `Booking` documents with the same `groupId`.
  4. Total sum across all slots is computed.
  5. One `Payment` record and one Paymob intention / wallet deduction is executed for the entire group amount using `groupId` as the reference.
  6. Webhook callback matches either `bookingId` or `groupId`, updating all documents with that `groupId` to `status: confirmed`.

---

### 2.2 R3: Minimum Deposit Per Slot & Payment Statuses

#### 2.2.1 Current Venue Schema & DTOs
- **Files**:
  - `nest-server/src/modules/venue/entities/venue.entity.ts`
  - `nest-server/src/modules/venue/dto/venue.dto.ts`
- **Current `Venue` Entity**:
  - Fields: `venueName`, `sportsType`, `address`, `locationAlt`, `locationLang`, `images`, `amenities`, `startWorkingHours`, `endWorkingHours`, `WorkingHours`, `defaultHourPrice`, `customHourPrices`, `isActive`, `createdBy`.
  - **Gap**: `minimumDepositAmount` is completely missing from `Venue` entity and `VenueSchema`.
- **Current `CreateVenueDto` & `UpdateVenueDto`**:
  - **Gap**: `minimumDepositAmount?: number` is missing from both DTOs.

#### 2.2.2 Current `PaymentStatusEnum`
- **File**: `nest-server/src/common/enums/bookingEnum.ts` (Lines 9–14):
  ```typescript
  export enum PaymentStatusEnum {
    unpaid = 'unpaid',
    paid = 'paid',
    refunded = 'refunded',
    pay_at_venue = 'pay_at_venue',
  }
  ```
- **Gap**: `partially_paid` is NOT defined in `PaymentStatusEnum`.

#### 2.2.3 Deposit Calculation & Status Handling Architecture
- **Deposit Calculation Rule**:
  $$\text{Required Deposit} = \text{slots.length} \times \text{venue.minimumDepositAmount}$$
  $$\text{Amount To Pay Upfront} = \min(\text{Required Deposit}, \text{Total Final Price})$$
- **Payment Status Transition**:
  - If `venue.minimumDepositAmount > 0` and $\text{Amount To Pay Upfront} < \text{Total Final Price}$:
    - Payment status $\rightarrow$ `PaymentStatusEnum.partially_paid`.
    - Booking status $\rightarrow$ `BookingStatusEnum.confirmed` (slot is confirmed and locked upon paying the deposit).
  - If `venue.minimumDepositAmount === 0` or $\text{Amount To Pay Upfront} == \text{Total Final Price}$:
    - Payment status $\rightarrow$ `PaymentStatusEnum.paid`.
    - Booking status $\rightarrow$ `BookingStatusEnum.confirmed`.
  - If unpaid: `PaymentStatusEnum.unpaid`.
  - If cash selected: `PaymentStatusEnum.pay_at_venue`.

---

### 2.3 R5: Venue Creation Bug (Root Cause & Fix)

#### 2.3.1 Root Cause Analysis
1. **Global Validation Settings (`nest-server/src/main.ts:25-34`)**:
   ```typescript
   app.useGlobalPipes(
     new ValidationPipe({
       whitelist: true,
       forbidNonWhitelisted: true, // Throws 400 if any undeclared property is sent
       transform: true,
       transformOptions: { enableImplicitConversion: true },
     }),
   );
   ```
2. **Dashboard Modal Submission (`dashboard/src/components/venue/VenueFormModal.tsx:264-275`)**:
   - The dashboard form modal always appends existing and retention image fields to the `FormData` on both Create and Edit operations:
     ```typescript
     formData.append("existingImages", JSON.stringify(existingImages));
     existingImages.forEach((img) => formData.append("keepImages", img));
     if (removedImages.length > 0) {
       formData.append("removedImages", JSON.stringify(removedImages));
       removedImages.forEach((img) => formData.append("deleteImages", img));
     }
     ```
3. **DTO Discrepancy (`nest-server/src/modules/venue/dto/venue.dto.ts`)**:
   - `UpdateVenueDto` has:
     - `existingImages?: string[]`
     - `keepImages?: string[]`
     - `removedImages?: string[]`
     - `deleteImages?: string[]`
   - `CreateVenueDto` **lacks** all four of these fields.
4. **Failure Behavior**:
   - When the dashboard submits a `POST /api/v1/venue`, NestJS's `ValidationPipe` encounters `existingImages` and `keepImages`, triggers `forbidNonWhitelisted`, and immediately aborts with `400 Bad Request: property existingImages should not exist`.

#### 2.3.2 Required Fix in Backend
- Add optional image array decorators to `CreateVenueDto`:
  ```typescript
  @ApiPropertyOptional({
    description: 'Array or JSON string of existing image URLs / S3 keys',
    type: [String],
  })
  @IsOptional()
  @ParseArray()
  @IsArray()
  @IsString({ each: true })
  existingImages?: string[];

  @ApiPropertyOptional({
    description: 'Array or JSON string of existing image URLs / S3 keys to retain',
    type: [String],
  })
  @IsOptional()
  @ParseArray()
  @IsArray()
  @IsString({ each: true })
  keepImages?: string[];

  @ApiPropertyOptional({
    description: 'Array or JSON string of image URLs / S3 keys to delete',
    type: [String],
  })
  @IsOptional()
  @ParseArray()
  @IsArray()
  @IsString({ each: true })
  removedImages?: string[];

  @ApiPropertyOptional({
    description: 'Array or JSON string of image URLs / S3 keys to delete',
    type: [String],
  })
  @IsOptional()
  @ParseArray()
  @IsArray()
  @IsString({ each: true })
  deleteImages?: string[];
  ```
- In `VenueService.createVenue` (`venue.service.ts:151-160`), combine `existingImages` with newly uploaded S3 keys so that any pre-existing images are stored in `venue.images`.

---

## 3. Backend Test Harness Survey

### 3.1 Tooling & Versions
- **Test Runner**: Jest 30.0.0 (`@types/jest: ^30.0.0`, `ts-jest: ^29.2.5`)
- **HTTP Assertions**: Supertest 7.0.0 (`@types/supertest: ^7.0.0`)
- **Framework Integration**: `@nestjs/testing: ^11.0.1`

### 3.2 NPM Scripts (`nest-server/package.json`)
| Script | Command | Purpose |
|---|---|---|
| `npm run build` | `nest build` | TypeScript NestJS build compiler |
| `npm test` | `jest` | Runs unit tests (`src/**/*.spec.ts`) |
| `npm run test:watch` | `jest --watch` | Interactive unit test watcher |
| `npm run test:cov` | `jest --coverage` | Code coverage report generator |
| `npm run test:e2e` | `jest --config ./test/jest-e2e.json` | E2E integration test runner |
| `npm run lint` | `eslint "{src,apps,libs,test}/**/*.ts" --fix` | Code quality and lint fixer |
| `npm run seed:admin`| `ts-node -r tsconfig-paths/register src/seed-admin.ts` | SuperAdmin database seeder |

### 3.3 Test Configurations
- **Unit Config (`package.json:84-103`)**:
  - `rootDir`: `"src"`
  - `testRegex`: `".*\\.spec\\.ts$"`
  - `testEnvironment`: `"node"`
  - `moduleNameMapper`: `{ "^src/(.*)$": "<rootDir>/$1" }`
- **E2E Config (`test/jest-e2e.json`)**:
  - `rootDir`: `"."`
  - `testRegex`: `".e2e-spec.ts$"`
  - `testEnvironment`: `"node"`
  - `moduleNameMapper`: `{ "^src/(.*)$": "<rootDir>/../src/$1" }`

### 3.4 Existing Test Inventory
1. `src/modules/coupon/coupon.service.spec.ts` (Unit Test):
   - 7 test cases validating percentage coupons, fixed amount coupons, coupon expiration, and limits.
   - **Verification**: Executed via CLI — **All 7 tests passed (0 failures)**.
2. `test/app.e2e-spec.ts` (E2E Test):
   - Basic root controller health check.
3. `test/booking.e2e-spec.ts` (Comprehensive E2E Integration Suite, 1,037 lines):
   - **Suite A**: Wallet Payment Atomicity & Invariant Proof (tests MongoDB transaction commit/abort, replica set failovers, compensating refunds).
   - **Suite B**: Request-Level Booking Idempotency (replay tests, concurrent requests with Redis distributed lock).
   - **Suite C**: Paymob Payment & Webhook Idempotency (session initiation, SHA-512 HMAC validation, duplicate callback deduplication, late payment wallet refund).

---

## 4. Key File & Line Reference Matrix

| Feature / Topic | File Path | Line Numbers | Key Components / Symbols |
|---|---|---|---|
| **Payment Status Enum** | `src/common/enums/bookingEnum.ts` | 9–14 | `PaymentStatusEnum` (Needs `partially_paid`) |
| **Booking Entity** | `src/modules/booking/entities/booking.entity.ts` | 20–80 | `Booking` schema (Needs `groupId`) |
| **Booking DTOs** | `src/modules/booking/dto/booking.dto.ts` | 53–123 | `CreateBookingDto` (Needs `slots` array) |
| **Booking Controller** | `src/modules/booking/booking.controller.ts` | 50–110 | `createBooking`, `payBooking`, `getAvailability` |
| **Booking Service** | `src/modules/booking/booking.service.ts` | 135–469 | `createBooking` algorithm, Redis lock, pricing calculation |
| **Venue Entity** | `src/modules/venue/entities/venue.entity.ts` | 52–111 | `Venue` schema (Needs `minimumDepositAmount`) |
| **Venue DTOs** | `src/modules/venue/dto/venue.dto.ts` | 40–156, 185–226 | `CreateVenueDto`, `UpdateVenueDto` (Needs `existingImages`, `minimumDepositAmount`) |
| **Venue Service** | `src/modules/venue/venue.service.ts` | 106–191 | `createVenue`, S3 upload, image array merging |
| **Payment Entity** | `src/modules/payment/entities/payment.entity.ts` | 19–51 | `Payment` schema (Links `bookingId` / `groupId`, `amount`) |
| **Payment Service** | `src/modules/payment/payment.service.ts` | 51–177, 390–670 | `createPayment`, `handlePaymobWebhook` candidate resolution |
| **Paymob Service** | `src/common/integration/paymob/paymob.service.ts`| 32–150, 179–326 | `createPaymentIntention`, `verifyWebhookHmac` SHA-512 |
| **Global Pipes** | `src/main.ts` | 25–34 | `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` |
| **Dashboard Modal** | `dashboard/src/components/venue/VenueFormModal.tsx`| 240–280 | `formData.append("existingImages", ...)` call site |
| **E2E Test Suite** | `test/booking.e2e-spec.ts` | 1–1037 | Full audit integration tests for bookings and payments |
