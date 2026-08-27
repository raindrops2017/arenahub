# Handoff Report: Backend Codebase Exploration (R2, R3, R5, Test Harness)

## 1. Observation

Direct code observations from inspecting `nest-server/`:

1. **R2 Multi-Slot Booking & Group ID**:
   - `Booking` entity (`nest-server/src/modules/booking/entities/booking.entity.ts`, lines 20–79): Contains single `startTime: number`, `endTime: number`, `date: Date`, `totalPrice: number`, `status: BookingStatusEnum`, `paymentStatus: PaymentStatusEnum`. Does **not** contain `groupId`.
   - `CreateBookingDto` (`nest-server/src/modules/booking/dto/booking.dto.ts`, lines 53–123): Accepts single `startTime: number` and `endTime: number`. Does **not** accept a `slots` array.
   - `BookingService.createBooking` (`nest-server/src/modules/booking/booking.service.ts`, lines 135–469): Executes single slot validation, checks overlap for `[startTime, endTime)`, computes single price, creates 1 document, and initiates payment for that 1 document.
   - `Payment` entity (`nest-server/src/modules/payment/entities/payment.entity.ts`, lines 19–51): References `bookingId: Types.ObjectId`.
   - `PaymentService.handlePaymobWebhook` (`nest-server/src/modules/payment/payment.service.ts`, lines 421–504): Resolves candidate IDs (`special_reference`, `bookingId`, `transactionId`) to match and update a single `Booking`.

2. **R3 Minimum Deposit Per Slot**:
   - `PaymentStatusEnum` (`nest-server/src/common/enums/bookingEnum.ts`, lines 9–14):
     ```typescript
     export enum PaymentStatusEnum {
       unpaid = 'unpaid',
       paid = 'paid',
       refunded = 'refunded',
       pay_at_venue = 'pay_at_venue',
     }
     ```
     `partially_paid` is missing from the enum definition.
   - `Venue` entity (`nest-server/src/modules/venue/entities/venue.entity.ts`, lines 52–111): Does **not** have `minimumDepositAmount`.
   - `CreateVenueDto` & `UpdateVenueDto` (`nest-server/src/modules/venue/dto/venue.dto.ts`, lines 40–226): Neither DTO has `minimumDepositAmount`.

3. **R5 Venue Creation Bug**:
   - `main.ts` (`nest-server/src/main.ts`, lines 25–34):
     ```typescript
     app.useGlobalPipes(
       new ValidationPipe({
         whitelist: true,
         forbidNonWhitelisted: true,
         transform: true,
         transformOptions: { enableImplicitConversion: true },
       }),
     );
     ```
   - `VenueFormModal.tsx` (`dashboard/src/components/venue/VenueFormModal.tsx`, lines 264–275):
     ```typescript
     formData.append("existingImages", JSON.stringify(existingImages));
     existingImages.forEach((img) => {
       formData.append("keepImages", img);
     });
     ```
   - `CreateVenueDto` (`nest-server/src/modules/venue/dto/venue.dto.ts`, lines 40–156): Lacks `existingImages`, `keepImages`, `removedImages`, `deleteImages`.
   - Result: Submitting `POST /api/v1/venue` with `existingImages` triggers `forbidNonWhitelisted` and returns `400 Bad Request: property existingImages should not exist`.

4. **Backend Test Harness & Tooling**:
   - `package.json` (`nest-server/package.json`, lines 8–22, 84–103): Configured with Jest 30.0.0, ts-jest 29.2.5, Supertest 7.0.0. Scripts: `npm test`, `npm run test:e2e`, `npm run build`, `npm run lint`.
   - Verification command: `npm test -- src/modules/coupon/coupon.service.spec.ts` executed with output: `PASS src/modules/coupon/coupon.service.spec.ts (7 passed, 7 total)`.
   - Verification command: `npm run build` executed with output: `exited with code 0`.

---

## 2. Logic Chain

1. **Multi-Slot Booking (R2)**:
   - *Observation*: The mobile app needs to allow booking multiple non-contiguous or contiguous slots in one transaction. Currently, `CreateBookingDto` and `Booking` entity only allow 1 slot per request.
   - *Reasoning*: To maintain data granularity for calendar availability while treating the multi-slot booking as a unified purchase, the backend must accept `slots: Array<{ startTime: number; endTime: number }>`, generate a shared `groupId: string` (UUID or ObjectId), insert multiple `Booking` documents with identical `groupId`, and charge the cumulative total via one Paymob transaction or wallet deduction.
   - *Conclusion*: Add `groupId` to `Booking` schema, update `CreateBookingDto` to accept `slots`, update `createBooking` to loop and create $N$ documents with distributed locking across all slots, and update webhook candidate matching to confirm all documents matching the `groupId`.

2. **Minimum Deposit Per Slot (R3)**:
   - *Observation*: `PaymentStatusEnum` currently only contains `unpaid`, `paid`, `refunded`, `pay_at_venue`. `Venue` schema lacks deposit configuration.
   - *Reasoning*: When a venue requires a deposit per slot, the required payment is $\text{slots.length} \times \text{venue.minimumDepositAmount}$. If this amount is less than the full price, paying it confirms the booking while leaving the payment marked as `partially_paid`.
   - *Conclusion*: Add `partially_paid = 'partially_paid'` to `PaymentStatusEnum`, add `minimumDepositAmount` to `Venue` schema and DTOs, and update `createBooking`/`payBooking` to calculate deposit amount and set `paymentStatus: partially_paid` when deposit is paid.

3. **Venue Creation Bug (R5)**:
   - *Observation*: `forbidNonWhitelisted: true` is enabled in `main.ts`. `VenueFormModal.tsx` in the dashboard always appends `existingImages` and `keepImages` to the creation payload. `CreateVenueDto` lacks these properties.
   - *Reasoning*: NestJS's `ValidationPipe` strictly rejects any payload containing non-whitelisted properties. Since `CreateVenueDto` does not whitelist `existingImages`, the request is rejected with 400.
   - *Conclusion*: Adding `@IsOptional() @ParseArray() @IsArray() @IsString({ each: true }) existingImages?: string[]` (along with `keepImages`, `removedImages`, `deleteImages`) to `CreateVenueDto` and merging them in `VenueService.createVenue` will resolve the bug.

---

## 3. Caveats

1. **Single vs Multi-Slot Backwards Compatibility**: When adding `slots` to `CreateBookingDto`, keeping `startTime` and `endTime` optional or validating that either `slots` or `startTime`/`endTime` is present will prevent breaking legacy single-slot clients.
2. **Cancellation & Refund Policy on Multi-Slot**: If a customer cancels a booking that belongs to a `groupId`, decide whether individual slots in a group can be cancelled independently or if the entire group must be cancelled together. The current `cancelBooking` operates per `bookingId`.
3. **MongoDB Transactions & Standalone Replica Sets**: `payForBooking` in `booking.service.ts` includes compensating fallback logic for non-replica-set MongoDB environments, which should be maintained for test environments without replica sets.

---

## 4. Conclusion

The NestJS backend architecture is well-structured and modular. The required changes are well-isolated:
1. **R2**: Add `groupId` to `Booking`, accept `slots` in `CreateBookingDto`, update `createBooking` and payment webhook to group multiple slots under one payment session.
2. **R3**: Add `partially_paid` to `PaymentStatusEnum`, add `minimumDepositAmount` to `Venue`, and apply deposit calculation in `BookingService`.
3. **R5**: Add `existingImages` (and related image retention fields) to `CreateVenueDto` with `@ParseArray()` decorators and handle merging in `VenueService.createVenue`.
4. **Testing**: Both unit test runner (`npm test`) and build compiler (`npm run build`) are verified functional.

---

## 5. Verification Method

To independently verify the backend codebase and assertions:

1. **Verify TypeScript Build**:
   ```bash
   cd D:/test-mobile-app/nest-server
   npm run build
   ```
   *Expected*: Exits with code 0 without compilation errors.

2. **Verify Unit Tests**:
   ```bash
   cd D:/test-mobile-app/nest-server
   npm test -- src/modules/coupon/coupon.service.spec.ts
   ```
   *Expected*: All 7 unit tests PASS.

3. **Inspect Entity & DTO Schemas**:
   - `nest-server/src/common/enums/bookingEnum.ts`: Verify `PaymentStatusEnum`.
   - `nest-server/src/modules/booking/entities/booking.entity.ts`: Verify `Booking` schema properties.
   - `nest-server/src/modules/venue/dto/venue.dto.ts`: Inspect `CreateVenueDto` vs `UpdateVenueDto`.
   - `nest-server/src/main.ts`: Verify `forbidNonWhitelisted: true` in global validation pipe.
