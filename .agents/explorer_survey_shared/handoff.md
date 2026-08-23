# HANDOFF REPORT — Explorer Survey Shared

**Agent**: `teamwork_preview_explorer`  
**Working Directory**: `D:/test-mobile-app/.agents/explorer_survey_shared`  
**Target Milestone**: R7 — Shared Mock Data Store & Persistence  
**Date**: 2026-08-07  

---

## 1. Observation

1. **Mobile App State**:
   - `D:/test-mobile-app/data/mockPitches.ts`: Contains hardcoded array `MOCK_PITCHES` (lines 31-142) with pitch objects (`id`, `name`, `type`, `pricePerHour`, `currency`, `rating`, `reviewCount`, `location`, `distance`, `imageUrl`, `features`, `description`, `availableDates`, `timeSlots`).
   - `D:/test-mobile-app/context/AuthContext.tsx`: Manages `user` (`UserProfile`: `name`, `phone`, `authMethod`, `favoritePosition`) in React state without persistence across page reloads or app restarts.
   - `D:/test-mobile-app/package.json`: Dependencies include `expo ~54.0.35`, `expo-router ~6.0.24`, `react 19.1.0`. `@react-native-async-storage/async-storage` is not present in `package.json`.

2. **Dashboard State**:
   - `D:/test-mobile-app/dashboard/package.json`: Vite React SPA with `react ^19.0.0`, `react-router ^7.1.5`, `apexcharts ^4.1.0`, `react-apexcharts ^1.7.0`.
   - `D:/test-mobile-app/dashboard/src/App.tsx`: Standard TailAdmin template routes (`/`, `/profile`, `/calendar`, `/forms`, `/tables`, `/charts`).
   - Currently lacks custom pages for `/customers`, `/users`, `/venues`, `/bookings/fullscreen`, `/reports`.
   - Currently lacks central state store or local storage persistence.

3. **Requirement R7 (Shared Data Store & Persistence)**:
   - Requires synchronizing mock data structures (`Venues`, `Bookings`, `Customers`, `Wallets`, `Users`, `Transactions`) between TailAdmin Dashboard and Expo Mobile App using `localStorage` / `@react-native-async-storage`.

---

## 2. Logic Chain

1. **Observation 1 & 2** show that both projects currently run in isolation with static mock data or ephemeral component state.
2. Therefore, to fulfill **R7**, a shared data management layer must be introduced with a unified schema specification matching Nest.js server standards.
3. Since Dashboard runs as a Vite web SPA (`window.localStorage`) and Mobile App can run as Expo Web (`window.localStorage`) or React Native (`AsyncStorage`), creating a dual-target `storageAdapter` allows both platforms to read/write the exact same JSON payloads.
4. Using `window.addEventListener('storage', ...)` and `BroadcastChannel('shared_store_channel')` ensures instant cross-tab reactive state sync when actions (such as customer creation, wallet payouts, pitch booking, or cancellation refunds) occur in either application.
5. Providing seed data initializers for 4 Venues, 5 Customers (covering Active, On Hold, Suspended, Inactive), 5 Wallets, 8 Transactions, 6 Bookings, and 4 System Users guarantees immediate out-of-the-box presentation capability for client demo today.

---

## 3. Caveats

- **Cross-Browser Domain Isolation**: `window.localStorage` synchronization via browser `storage` events requires both Dashboard and Mobile App (when running in web mode) to share the same domain/origin (e.g., `localhost:5173` and `localhost:8081` may partition localStorage if origins differ). For cross-origin dev setups, explicit sync triggers or unified local storage polyfills can be used.
- **React Native Native Builds**: On iOS/Android native builds, `@react-native-async-storage/async-storage` must be imported. For web preview (`expo start --web`), `window.localStorage` is directly accessible.

---

## 4. Conclusion

1. **Schema Specifications**: Defined TypeScript interfaces for `Venue` (matching Nest.js schema), `Customer`, `CustomerStatus`, `SystemUser`, `Wallet`, `WalletTransaction`, and `Booking`.
2. **Storage Key Naming Standard**:
   - `app_v1_venues`
   - `app_v1_customers`
   - `app_v1_wallets`
   - `app_v1_transactions`
   - `app_v1_bookings`
   - `app_v1_users`
   - `app_v1_active_customer_id`
3. **Synchronized Mock Store Module Design**: A reactive `sharedStore.ts` service with seed initializers and change-subscription hooks ready to be implemented in both Dashboard and Mobile App.

---

## 5. Verification Method

1. **Inspect Detailed Analysis**:
   - Review `D:/test-mobile-app/.agents/explorer_survey_shared/analysis.md` for full TypeScript interfaces and seed datasets.
2. **Local Storage Test**:
   - In browser DevTools Console, run:
     ```javascript
     localStorage.getItem('app_v1_venues');
     localStorage.getItem('app_v1_customers');
     ```
   - Confirm seed data matches the specifications provided in `analysis.md`.
3. **Cross-Tab Synchronization Verification**:
   - Open Dashboard and Mobile App in adjacent browser windows.
   - Execute a booking or admin payout action in Dashboard and verify `storage` event fires and updates Mobile state instantly.
