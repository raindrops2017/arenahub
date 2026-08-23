# Mobile App Codebase Analysis & Expo SDK v54.0.0 Survey

**Target Directory**: `D:/test-mobile-app`  
**Date**: 2026-08-07  
**Agent**: `teamwork_preview_explorer` (`explorer_survey_mobile`)

---

## 1. Executive Summary

The Expo Mobile App codebase in `D:/test-mobile-app` is built with **Expo SDK 54.0.35**, **Expo Router 6.0.24**, React 19.1.0, and React Native 0.81.5 using NativeWind v5 preview for styling. 

While the existing codebase provides a slick dark-mode sports pitch browsing home page (`app/index.tsx`), pitch detail view (`app/pitch/[id].tsx`), auth flow (`app/(auth)`), and Paymob SDK integration (`services/paymobService.ts`), it currently **lacks all core business features required for R6 and R7**:
1. **No Profile & Live System Wallet View**: Missing screen to view wallet balance and refund transaction history.
2. **No Wallet Checkout**: Pitch booking directly triggers Paymob without offering 'System Wallet Balance' as a payment option.
3. **No Mobile Cancellation & Refund**: Missing user bookings screen / modal to view active bookings, request cancellation, or credit wallet balance automatically.
4. **No Customer Status Enforcement**: No support for `Active`, `On Hold` (warning banner), `Suspended` (modal blocking checkout), or `Inactive` (re-verification prompt) customer states.
5. **No Data Store Synchronization / Persistence (R7)**: `@react-native-async-storage/async-storage` is **not installed** in `package.json`. Data is not persisted or synchronized with the TailAdmin Admin Dashboard.

---

## 2. Directory Structure & Entry Points

```
D:/test-mobile-app/
├── app/                        # Expo Router v54 File-Based Routes
│   ├── _layout.tsx             # Root layout: Fonts loading, SafeAreaProvider, AuthProvider, Stack router
│   ├── index.tsx               # Home screen: ArenaHub header, category filter pills, pitch list
│   ├── pitch/
│   │   └── [id].tsx            # Pitch details: Hero banner, date/slot selector, Paymob checkout, success modal
│   └── (auth)/                 # Auth route group
│       ├── _layout.tsx         # Auth stack layout
│       ├── login.tsx           # Mobile phone input & OTP delivery method toggle (SMS / WhatsApp)
│       ├── verify.tsx          # 4-digit PIN verification screen
│       └── profile-setup.tsx   # Step 3 profile setup (Name, position picker)
├── context/
│   └── AuthContext.tsx         # React Context for user authentication & pending booking intercept
├── data/
│   └── mockPitches.ts          # Static pitch mock dataset (4 pitches: ARENA 1, CHAMPIONS PARK, SANTIAGO PADEL, METRO ARENA 7)
├── services/
│   └── paymobService.ts        # Paymob SDK configuration, listener, & local Express backend payment intent creator
├── server/
│   ├── index.js                # Local Node/Express server (port 3000) for Paymob Intention API v1 & webhook simulation
│   └── README.md
├── assets/                     # Images, icons, splash screens
├── plugins/
│   └── withPaymobDataBinding.js # Custom Expo config plugin for Paymob Android data binding
├── app.json                    # Expo configuration (SDK 54, slug, plugins, typedRoutes)
├── package.json                # Dependencies & scripts
├── metro.config.js             # Metro config with NativeWind wrapper
├── global.css                  # Tailwind CSS import directives
└── tsconfig.json               # TypeScript configuration with @/* path aliases
```

### Key Entry Points
- **Package Main**: `"expo-router/entry"` (configured in `package.json`).
- **Root Layout**: `app/_layout.tsx` initializes `@expo-google-fonts/montserrat` and `bebas-neue`, wraps app with `SafeAreaProvider` and `AuthProvider`.
- **Home Route**: `app/index.tsx` displays category-filtered pitches.
- **Pitch Route**: `app/pitch/[id].tsx` handles slot picking and booking.

---

## 3. Expo SDK 54.0.0 Compliance Audit

| Requirement | Config / Code Location | Audit Result | Notes |
|---|---|---|---|
| **Expo SDK Version** | `package.json`: `"expo": "~54.0.35"` | ✅ Compliant | Running Expo v54 |
| **Expo Router Version** | `package.json`: `"expo-router": "~6.0.24"` | ✅ Compliant | Expo Router v6 (bundled with SDK 54) |
| **Typed Routes** | `app.json`: `"typedRoutes": true` | ✅ Compliant | Enabled under `experiments` |
| **New Architecture** | `app.json`: `"newArchEnabled": true` | ✅ Compliant | Enabled |
| **Routing Conventions** | `app/` file-based routes (`_layout.tsx`, `index.tsx`, `[id].tsx`, `(auth)`) | ✅ Compliant | Follows Expo v54 router conventions |
| **Styling** | `nativewind^5.0.0-preview.4` + `@tailwindcss/postcss` | ✅ Compliant | Configured with `global.css` and `metro.config.js` |
| **Persistent Storage** | `@react-native-async-storage/async-storage` | ❌ **Missing** | Not listed in `package.json` dependencies |

---

## 4. Requirement Implementation Gap Analysis

### R6: Customer Pitch Booking & Synced System Wallet

| Requirement Feature | Current Implementation | Gap Description | Action Required |
|---|---|---|---|
| **Profile & Wallet View** | None | No Profile tab or screen exists in `app/`. Customer cannot view live System Wallet balance or refund log. | Create `app/(tabs)/profile.tsx` or `app/wallet.tsx` displaying wallet balance, user status, and transaction history. Add bottom tab navigation or header nav to profile. |
| **Wallet Checkout** | Direct Paymob trigger in `app/pitch/[id].tsx` | `handleBookSlot` in `app/pitch/[id].tsx` calls Paymob directly. No option to select 'System Wallet Balance' or validate sufficient wallet balance. | Add payment method selector modal/sheet on checkout: "System Wallet Balance" vs "Paymob / Credit Card" vs "Cash". Deduct from customer wallet if selected. |
| **Mobile Cancellation Refund** | None | No UI for users to view active bookings or request cancellation. | Create My Bookings screen (`app/bookings.tsx` or tab) with booking list, status, and "Cancel Booking" action. Auto-credit refund to System Wallet balance. |
| **Mobile Status Enforcement** | Basic auth in `AuthContext.tsx` without customer status | Customer status (`Active`, `On Hold`, `Suspended`, `Inactive`) is not tracked. | Update `AuthContext` and user state to track customer status. Add modal blocking checkout for `Suspended`, banner for `On Hold`, re-verification prompt for `Inactive`. |

---

### R7: Shared Mock Data Store & Persistence

| Requirement Feature | Current Implementation | Gap Description | Action Required |
|---|---|---|---|
| **AsyncStorage Integration** | None | `@react-native-async-storage/async-storage` is missing from `package.json`. | Install/add `@react-native-async-storage/async-storage` to `package.json`. |
| **Shared Data Store** | Static `MOCK_PITCHES` array | State is transient React state (`useState`). Pitch slots, bookings, customer wallet, and user status reset on app reload and do not sync with TailAdmin Dashboard. | Create a unified `storageService.ts` / `sharedStore.ts` that reads/writes to `AsyncStorage` (and `localStorage` when on web) with matching storage keys (`arenahub_venues`, `arenahub_customers`, `arenahub_bookings`, `arenahub_wallets`). |
| **Nest.js Schema Alignment** | Local types in `mockPitches.ts` and `AuthContext.tsx` | Schema doesn't include wallet balances, customer status, or synced venue structures. | Align TS interfaces with Nest.js schemas (`Customer`, `Venue`, `Booking`, `WalletTransaction`). |

---

## 5. Implementation Roadmap & Technical Recommendations

### Phase 1: Storage Layer & Dependencies
1. Add `@react-native-async-storage/async-storage` to `package.json`.
2. Create `services/storageService.ts` to manage persistent sync across mobile and web using identical keys as the TailAdmin Dashboard:
   - `arenahub_customers`
   - `arenahub_venues`
   - `arenahub_bookings`
   - `arenahub_wallets`
   - `arenahub_current_user`

### Phase 2: Navigation & Navigation Layout Update
1. Restructure navigation in `app/_layout.tsx` or introduce `app/(tabs)` with Expo Router bottom tabs:
   - **Home** (`/`): Explore pitches & courts.
   - **My Bookings** (`/bookings`): View booked slots, cancel bookings with auto-refund to wallet.
   - **Wallet & Profile** (`/profile`): View live wallet balance, customer status, transaction statement, cash payouts.

### Phase 3: R6 Feature Integration in Mobile App
1. **Wallet Checkout**:
   - Update `app/pitch/[id].tsx` to present a checkout modal where customers choose payment method: **System Wallet Balance** (if balance >= pitch price), **Paymob / Credit Card**, or **Cash**.
   - If Wallet is chosen, deduct price from customer balance, record transaction (`Booking Debit`), and update booking status to `CONFIRMED`.
2. **Cancellation Refund**:
   - In My Bookings view, allow customer to cancel a booking.
   - On cancellation, credit customer balance, record transaction (`Refund Credit`), update booking status to `CANCELLED`, and free up pitch slot.
3. **Status Enforcement**:
   - Block `Suspended` users from checkout with an explicit Warning Modal.
   - Show notification banner for `On Hold` users on Home and Pitch details screens.
   - Prompt `Inactive` users for re-verification when launching auth.

---

## 6. Verification Commands for Implementer

- **Dependency installation**: `npm install`
- **Expo Start (Web / Dev)**: `npx expo start` or `npm run web`
- **Lint Check**: `npm run lint`
