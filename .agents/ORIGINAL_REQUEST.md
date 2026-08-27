# Original User Request

## Initial Request — 2026-08-24T16:53:55Z

Implement the payment and booking flow updates in the sports venue management platform, as specified in plan.md. This includes removing cash payments, auto-deducting wallet balances, enabling multi-slot bookings, configuring minimum deposits, and fixing the UI slot availability bug.

Working directory: D:\test-mobile-app
Integrity mode: development

## Requirements

### R1. Remove Cash & Update Wallet Logic
Remove the payment method selector in the mobile app. Auto-deduct available wallet balance from the total booking amount. If there is a remaining balance, process it via Paymob. If no remaining balance, skip Paymob.

### R2. Multi-Slot Booking
Update the mobile app to allow selecting multiple non-continuous slots on the same date. Update the NestJS backend to accept multiple slots and create multiple `Booking` documents tied together by a `groupId`. Process payment for the entire group as a single Paymob transaction.

### R3. Minimum Deposit Per Slot
Add a `minimumDepositAmount` field to the `Venue` entity in the backend and dashboard. Update the booking creation logic to calculate the required payment amount as `slots.length * venue.minimumDepositAmount` (if configured) and mark the payment status as `partially_paid`. The mobile app must display the required deposit amount.

### R4. Fix Already Booked Slots Bug
Fix the date and time parsing in the mobile app (`useBookingFlow.ts` and `DateSlotGenerator`) so that already booked/held slots accurately lock out the UI on the correct dates.

### R5. Fix Venue Creation Bug
Add `existingImages` (optional array of strings) to `CreateVenueDto` and `UpdateVenueDto` in the NestJS backend to prevent validation errors during venue creation/editing from the dashboard.

## Acceptance Criteria

### Backend & Dashboard Verification (Agent-as-Judge Rubric)
- [ ] Inspect `Venue` entity and DTOs: `minimumDepositAmount` and `existingImages` are present and correctly typed.
- [ ] Inspect `Booking` entity: `groupId` is added to group multiple slots.
- [ ] Inspect `booking.service.ts`: `createBooking` accepts an array of slots, creates multiple documents with the same `groupId`, correctly calculates the total cost (considering deposits), and initiates one Paymob session.
- [ ] Inspect `PaymentStatusEnum`: `partially_paid` is added and used when a deposit is paid.

### Mobile App UI Verification (Agent-as-Judge Rubric)
- [ ] Inspect `PaymentMethodSelector.tsx`: File is deleted or completely removed from the booking flow.
- [ ] Inspect `useBookingFlow.ts` and checkout UI: It calculates `min(walletBalance, totalCost)` automatically without user selection, and shows the correct text summary.
- [ ] Inspect `SlotPicker.tsx`: It supports multiple slot selections (array of `HourlySlot`) and passes them correctly to the checkout flow.
- [ ] Inspect date/time parsing logic: The bug causing already booked slots to show as available is fixed.

## 2026-08-25T12:04:49Z

<USER_REQUEST>
# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

Implement the payment and booking flow updates in the sports venue management platform, as specified in plan.md. This includes removing cash payments, auto-deducting wallet balances, enabling multi-slot bookings, configuring minimum deposits, and fixing the UI slot availability bug.

Working directory: D:\test-mobile-app
Integrity mode: development

**Note: The project was previously paused during the final adversarial testing phase of Milestone 4. Please resume from the `.agents` state and complete the remaining verification and wrap-up steps.**

## Requirements

### R1. Remove Cash & Update Wallet Logic
Remove the payment method selector in the mobile app. Auto-deduct available wallet balance from the total booking amount. If there is a remaining balance, process it via Paymob. If no remaining balance, skip Paymob.

### R2. Multi-Slot Booking
Update the mobile app to allow selecting multiple non-continuous slots on the same date. Update the NestJS backend to accept multiple slots and create multiple `Booking` documents tied together by a `groupId`. Process payment for the entire group as a single Paymob transaction.

### R3. Minimum Deposit Per Slot
Add a `minimumDepositAmount` field to the `Venue` entity in the backend and dashboard. Update the booking creation logic to calculate the required payment amount as `slots.length * venue.minimumDepositAmount` (if configured) and mark the payment status as `partially_paid`. The mobile app must display the required deposit amount.

### R4. Fix Already Booked Slots Bug
Fix the date and time parsing in the mobile app (`useBookingFlow.ts` and `DateSlotGenerator`) so that already booked/held slots accurately lock out the UI on the correct dates.

### R5. Fix Venue Creation Bug
Add `existingImages` (optional array of strings) to `CreateVenueDto` and `UpdateVenueDto` in the NestJS backend to prevent validation errors during venue creation/editing from the dashboard.

## Acceptance Criteria

### Backend & Dashboard Verification (Agent-as-Judge Rubric)
- [ ] Inspect `Venue` entity and DTOs: `minimumDepositAmount` and `existingImages` are present and correctly typed.
- [ ] Inspect `Booking` entity: `groupId` is added to group multiple slots.
- [ ] Inspect `booking.service.ts`: `createBooking` accepts an array of slots, creates multiple documents with the same `groupId`, correctly calculates the total cost (considering deposits), and initiates one Paymob session.
- [ ] Inspect `PaymentStatusEnum`: `partially_paid` is added and used when a deposit is paid.

### Mobile App UI Verification (Agent-as-Judge Rubric)
- [ ] Inspect `PaymentMethodSelector.tsx`: File is deleted or completely removed from the booking flow.
- [ ] Inspect `useBookingFlow.ts` and checkout UI: It calculates `min(walletBalance, totalCost)` automatically without user selection, and shows the correct text summary.
- [ ] Inspect `SlotPicker.tsx`: It supports multiple slot selections (array of `HourlySlot`) and passes them correctly to the checkout flow.
- [ ] Inspect date/time parsing logic: The bug causing already booked slots to show as available is fixed.

---
*Next: when approved → delegate via invoke_subagent (see Delegation Protocol)*
</USER_REQUEST>
