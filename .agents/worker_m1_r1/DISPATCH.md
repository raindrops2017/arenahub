# DISPATCH — Worker M1 (Shared Mock Data Store & Persistence)

You are a Worker agent (`teamwork_preview_worker`). Your working directory is `D:/test-mobile-app/.agents/worker_m1_r1`.

## Mandatory Input Files
- `D:/test-mobile-app/.agents/ORIGINAL_REQUEST.md`
- `D:/test-mobile-app/.agents/orchestrator/PROJECT.md`
- `D:/test-mobile-app/.agents/explorer_m1_r1/analysis.md`
- `D:/test-mobile-app/.agents/explorer_m1_r1/handoff.md`

## Write Ownership Boundaries
You have exclusive write access to:
- `D:/test-mobile-app/dashboard/src/types/index.ts`
- `D:/test-mobile-app/types/index.ts`
- `D:/test-mobile-app/dashboard/src/data/mockStore.ts`
- `D:/test-mobile-app/services/storageService.ts`
- `D:/test-mobile-app/package.json` (to run `npm install @react-native-async-storage/async-storage`)

## Tasks to Execute
1. Run `npm install @react-native-async-storage/async-storage` in `D:/test-mobile-app`.
2. Create TypeScript entity interfaces in `D:/test-mobile-app/dashboard/src/types/index.ts` and `D:/test-mobile-app/types/index.ts`:
   - `Venue` (id, name, sportsTypes, address, coordinates, workingHours, defaultHourlyPrice, customHourlyPrices, amenities, imageGallery)
   - `CustomerStatus` ('Active' | 'On Hold' | 'Suspended' | 'Inactive')
   - `Customer` (id, name, phone, position, initialBalance, walletBalance, status, createdAt)
   - `SystemUserRole` ('Admin' | 'Employee' | 'Manager' | 'Owner')
   - `SystemUser` (id, name, email, role, status: 'Active' | 'Inactive', phone)
   - `WalletTransaction` (id, walletId, customerId, customerName, type: 'REFUND_CREDIT' | 'BOOKING_DEBIT' | 'ADMIN_PAYOUT' | 'TOPUP', amount, description, timestamp, auditNotes)
   - `Wallet` (id, customerId, balance, transactions: WalletTransaction[])
   - `BookingStatus` ('BOOKED' | 'CANCELLED' | 'COMPLETED')
   - `PaymentMethod` ('WALLET' | 'CASH' | 'CREDIT_CARD' | 'PAYMOB')
   - `Booking` (id, bookingCode, customerId, customerName, customerPhone, venueId, venueName, date, startTime, endTime, slots, totalPrice, paymentMethod, status, refundAmount, refundReason, createdAt)
3. Create `D:/test-mobile-app/dashboard/src/data/mockStore.ts` with:
   - Initial seed datasets (4 Venues, 5 Customers, 5 Wallets, 8 Transactions, 6 Bookings, 4 System Users).
   - LocalStorage persistence (`app_v1_*` keys).
   - CRUD helper functions: `getVenues()`, `saveVenue()`, `deleteVenue()`, `getCustomers()`, `saveCustomer()`, `processCashPayout()`, `getSystemUsers()`, `saveSystemUser()`, `getBookings()`, `createBooking()`, `updateBooking()`, `cancelBooking()`, `getReportsData()`.
   - Event notification (`window.dispatchEvent(new CustomEvent('app_v1_store_updated'))`).
4. Create `D:/test-mobile-app/services/storageService.ts` for Expo Mobile:
   - Async storage adapter wrapper with fallback to `localStorage` for Expo Web mode.
5. Verify build/typecheck:
   - Run `npx tsc --noEmit` in `D:/test-mobile-app/dashboard`.
   - Run `npx tsc --noEmit` in `D:/test-mobile-app`.
6. Record output in `changes.md` and `handoff.md` within your working directory.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
