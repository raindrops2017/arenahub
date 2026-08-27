## 2026-08-24T16:16:31Z

You are the Backend Worker for Milestone 1 (Backend Core: R2, R3, R5).
Your working directory is: D:/test-mobile-app/.agents/worker_m1_backend

MANDATORY FIRST STEP:
Read D:/test-mobile-app/.agents/ORIGINAL_REQUEST.md (specifically the latest request under 2026-08-24T16:08:07Z) and D:/test-mobile-app/PROJECT.md.
Also read the backend survey findings at:
- D:/test-mobile-app/.agents/explorer_backend_survey/analysis.md
- D:/test-mobile-app/.agents/explorer_backend_survey/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
- nest-server/src/modules/booking/
- nest-server/src/modules/venue/
- nest-server/src/modules/payment/
- nest-server/src/common/enums/bookingEnum.ts

OBJECTIVE & REQUIREMENTS:
1. R2 Multi-Slot Booking & Group ID:
   - Add @Prop({ type: String, index: true }) groupId?: string; to Booking entity (nest-server/src/modules/booking/entities/booking.entity.ts).
   - Update CreateBookingDto in nest-server/src/modules/booking/dto/booking.dto.ts to accept slots?: Array<{ startTime: number; endTime: number }>; while retaining optional backward-compatible startTime/endTime.
   - In BookingService (nest-server/src/modules/booking/booking.service.ts):
     - Support creating multiple Booking documents in one transaction/session sharing the same generated groupId (UUID or ObjectId string).
     - Acquire distributed/idempotency locks for all requested slots to prevent race conditions.
     - Calculate total cost across all slots (considering deposit if applicable).
     - Initiate a single Paymob payment intention for the entire group amount.
   - In PaymentService (nest-server/src/modules/payment/payment.service.ts) and Webhook Handler:
     - When payment succeeds for a transaction / groupId / bookingId, find and update all Booking documents matching that groupId (or bookingId) to paid/partially_paid.
2. R3 Minimum Deposit Per Slot:
   - In nest-server/src/common/enums/bookingEnum.ts: Add partially_paid = 'partially_paid' to PaymentStatusEnum.
   - In nest-server/src/modules/venue/entities/venue.entity.ts: Add @Prop({ type: Number, default: 0 }) minimumDepositAmount?: number;.
   - In nest-server/src/modules/venue/dto/venue.dto.ts: Add @IsOptional() @IsNumber() @Min(0) minimumDepositAmount?: number; to CreateVenueDto and UpdateVenueDto.
   - In BookingService: If venue.minimumDepositAmount is configured (> 0), required payment amount is slots.length * venue.minimumDepositAmount (capped at total slot price). When this deposit is paid, set paymentStatus: PaymentStatusEnum.partially_paid.
3. R5 Fix Venue Creation Bug:
   - In nest-server/src/modules/venue/dto/venue.dto.ts: In CreateVenueDto, add:
     @IsOptional() @ParseArray() @IsArray() @IsString({ each: true }) existingImages?: string[];
     @IsOptional() @ParseArray() @IsArray() @IsString({ each: true }) keepImages?: string[];
     @IsOptional() @ParseArray() @IsArray() @IsString({ each: true }) removedImages?: string[];
     @IsOptional() @ParseArray() @IsArray() @IsString({ each: true }) deleteImages?: string[];
   - In VenueService.createVenue: Ensure existing/kept images are safely merged into the venue's images array so dashboard creation with existingImages never throws 400 Bad Request.

VERIFICATION:
- Run TypeScript build: cd D:/test-mobile-app/nest-server && npm run build
- Run test suites: cd D:/test-mobile-app/nest-server && npm test
- Ensure all builds and tests pass cleanly with 0 errors.

OUTPUT:
- Write detailed implementation log to D:/test-mobile-app/.agents/worker_m1_backend/changes.md
- Write a structured handoff report to D:/test-mobile-app/.agents/worker_m1_backend/handoff.md with Observation, Logic Chain, Caveats, Conclusion, and Verification Method.
- Send a message to parent when complete.
