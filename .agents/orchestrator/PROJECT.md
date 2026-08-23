# PROJECT: ArenaHub Dual-Platform Prototype (TailAdmin Dashboard + Expo Mobile App v54)

## Architecture

- **Dashboard**: React 19, Vite 6, Tailwind CSS v4, React Router v7 SPA at `D:/test-mobile-app/dashboard`.
- **Mobile App**: Expo SDK v54.0.35, Expo Router v6, React Native 0.81.5, NativeWind v5 at `D:/test-mobile-app`.
- **Shared Data Store**: Cross-platform persistent storage engine (`sharedStore.ts` on web `localStorage`, `storageService.ts` on mobile `@react-native-async-storage/async-storage`) with TypeScript entity interfaces matching Nest.js server standards.

---

## Feature Inventory

| # | Feature | Description | Requirement | Milestone | Source |
|---|---------|-------------|-------------|-----------|--------|
| 1 | Shared Types & Entity Schemas | TypeScript interfaces for Venue, User, Customer, Wallet, Booking, Transaction matching Nest.js | R7 | M1 | Shared Explorer |
| 2 | Persistent Storage & Mock Seed Data | Cross-platform localStorage / AsyncStorage adapter with seed dataset and reactive cross-tab sync | R7 | M1 | Shared Explorer |
| 3 | Dashboard User Management UI | Admin/Employee/Manager/Owner listing, filter, search, create, edit, role/status toggle | R1 | M2 | Dashboard Explorer |
| 4 | Dashboard Customer Management UI | Customer list, status filters (Active, On Hold, Suspended, Inactive), search, add/edit modal | R2 | M2 | Dashboard Explorer |
| 5 | System Wallet & Manual Cash Payout Modal | Customer profile wallet balance, transaction audit log, and manual admin cash payout modal | R2 | M2 | Dashboard Explorer |
| 6 | Dashboard Venue Management CRUD | Venue list, create/edit form matching Nest.js Venue schema (sports, address, coords, hours, pricing, amenities, images) | R3 | M3 | Dashboard Explorer |
| 7 | Standalone Booking Page Navigation & Slot Grid | Nav bar outside dashboard layout (`/bookings/fullscreen`), date picker, time slot grid, calendar, list view | R4 | M4 | Dashboard Explorer |
| 8 | Dashboard Booking Form & Wallet Payment | New booking form, customer search, venue slot selection, wallet balance/cash/card payment | R4 | M4 | Dashboard Explorer |
| 9 | Dashboard Booking Update & Cancellation Refund | Booking edit form, cancellation modal (Full/Partial/No Refund), auto-crediting customer wallet | R4 | M4 | Dashboard Explorer |
| 10 | Owner & Manager Reports Suite | ApexCharts for Revenue Breakdown (Gross/Net), Slot Occupancy & Peak Hours, Venue Comparison, Refund Impact | R5 | M5 | Dashboard Explorer |
| 11 | Mobile AsyncStorage & Storage Integration | Install `@react-native-async-storage/async-storage` and connect mobile state to shared store | R6, R7 | M6 | Mobile Explorer |
| 12 | Mobile Profile & System Wallet View | Customer profile screen showing live System Wallet balance and refund statement | R6 | M6 | Mobile Explorer |
| 13 | Mobile Pitch Wallet Checkout | Pitch checkout (`app/pitch/[id].tsx`) supporting System Wallet balance as payment option | R6 | M6 | Mobile Explorer |
| 14 | Mobile My Bookings & Cancellation Refund | Customer booking history, cancellation modal with auto-crediting wallet refund | R6 | M6 | Mobile Explorer |
| 15 | Mobile Customer Status Enforcement | Suspended blocking modal, On Hold alert banner, Inactive re-verification prompt | R6 | M6 | Mobile Explorer |
| 16 | E2E Integration & Verification | Cross-platform build verification, functional E2E validation, and integrity audit | R1-R7 | M7 | Orchestrator |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Shared Mock Data Store & Persistence | Shared types, cross-platform storage adapter (`localStorage` & `AsyncStorage`), seed initializers, reactive event bus | None | DONE |
| M2 | Dashboard User & Customer Management + Wallet Payouts | `/users` page (R1) + `/customers` page with status enforcement, profile drawer, wallet audit log, cash payout modal (R2) | M1 | DONE |
| M3 | Dashboard Venue Management CRUD | `/venues` CRUD views matching Nest.js Venue entity schema (sports, address, hours, custom pricing, amenities, image gallery) (R3) | M1 | PLANNED |
| M4 | Dashboard Standalone Full-Screen Booking Page | `/bookings/fullscreen` outside standard layout: nav bar, slot grid, calendar view, new booking with wallet payment, update form, cancellation modal with wallet refund (R4) | M1, M2, M3 | PLANNED |
| M5 | Dashboard Owner & Manager Reports Suite | `/reports` page with interactive ApexCharts: Revenue Breakdown, Occupancy/Peak Hours Heatmap, Venue Comparison, Cancellation Refund Impact (R5) | M1, M4 | PLANNED |
| M6 | Expo Mobile App Pitch Booking, Wallet & Status Enforcement | Install `@react-native-async-storage`, profile/wallet tab, wallet checkout option, My Bookings cancellation refund, status enforcement (Suspended, On Hold, Inactive) (R6) | M1 | PLANNED |
| M7 | E2E Integration, Verification & Audit Hardening | Dual-platform build checks (`npm run build`, Expo typecheck), E2E workflow validation, Forensic Integrity Audit | M1-M6 | PLANNED |

---

## Interface Contracts

### Shared Storage Keys (`app_v1_*`)
- `app_v1_venues`: `Venue[]`
- `app_v1_customers`: `Customer[]`
- `app_v1_users`: `SystemUser[]`
- `app_v1_wallets`: `Wallet[]`
- `app_v1_transactions`: `WalletTransaction[]`
- `app_v1_bookings`: `Booking[]`
- `app_v1_active_customer_id`: `string`

### Customer Status Enum & Rules
- `Active`: Full access across Dashboard & Mobile.
- `On Hold`: Warning banner displayed during pitch booking, staff contact requested.
- `Suspended`: Blocked from placing bookings and wallet transactions.
- `Inactive`: Archived state prompting account re-verification.

---

## Code Layout

### Dashboard (`D:/test-mobile-app/dashboard/src`)
- `types/`: `index.ts` (shared entity definitions)
- `data/`: `mockStore.ts` (localStorage persistent store & reactive event subscriber)
- `pages/`: `UsersPage.tsx`, `CustomersPage.tsx`, `VenuesPage.tsx`, `FullscreenBookingPage.tsx`, `ReportsPage.tsx`
- `components/`: Custom modals, tables, charts, drawers, slot grids.

### Mobile App (`D:/test-mobile-app`)
- `services/`: `storageService.ts` (AsyncStorage wrapper connected to `mockStore` schema)
- `context/`: `AuthContext.tsx` (expanded with wallet balance, refund log, customer status enforcement)
- `app/`: `(tabs)/_layout.tsx`, `(tabs)/index.tsx`, `(tabs)/profile.tsx`, `(tabs)/bookings.tsx`, `pitch/[id].tsx`
