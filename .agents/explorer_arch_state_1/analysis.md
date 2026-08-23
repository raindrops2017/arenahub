# Deep-Dive Client-Side Codebase Audit: Architecture, State Management & Type Safety

**Target Stack**: React Native 0.81.5, React 19.1.0, Expo SDK 54.0.35, Expo Router 6.0.24, NativeWind v5 (Tailwind CSS v4)  
**Audit Scope**: Root Configurations (`package.json`, `app.json`, `tsconfig.json`, `metro.config.js`, etc.), `app/`, `context/`, `services/`, `data/`, `types/`, `components/`  
**Excluded Directories**: `server/`, `nest-server/` (Strictly omitted)  
**Date**: 2026-08-15  

---

## Executive Summary

An exhaustive architectural audit of the client-side mobile codebase reveals a functioning prototype with severe structural fragmentation, significant type safety erosion, concurrency vulnerabilities in local persistence, unvalidated data flows, hardcoded values, and complete absence of modern asynchronous state caching. While modern foundational primitives are present (Expo SDK 54, React 19 Compiler, New Architecture enabled, NativeWind v5 preview), the application architecture suffers from heavy monolithic components, lack of domain encapsulation, duplicate data models, and unhandled runtime edge cases.

---

## 1. Root Configuration & Build Matrix Audit

| File | Current Configuration | Issue / Vulnerability / Risk | Severity | Recommendation |
|---|---|---|---|---|
| `package.json` | `expo: ~54.0.35`, `react: 19.1.0`, `react-native: 0.81.5`, `nativewind: ^5.0.0-preview.4`, `tailwindcss: ^4.3.3` | Missing `@tanstack/react-query`, `zod` / `valibot`, `expo-secure-store`. `paymob-reactnative` is pinned via GitHub URL (`github:PaymobAccept/paymob-reactnative-sdk`), causing non-deterministic builds. | **High** | Introduce `@tanstack/react-query` v5, `zod` runtime validation, `expo-secure-store` for tokens/credentials, and pin third-party native dependencies to immutable commit hashes or npm releases. |
| `app.json` | `experiments.typedRoutes: true`, `experiments.reactCompiler: true`, `newArchEnabled: true` | `typedRoutes: true` is configured, but nearly all route transitions in `app/` bypass the compiler with `as any` casting. Missing iOS permission descriptions for haptics/storage/network. Missing Expo scheme deep-linking route matching rules. | **Medium** | Fix route parameter type generation and remove all `as any` route assertions. Configure deep link path prefixes explicitly in `scheme`. |
| `tsconfig.json` | Extends `expo/tsconfig.base`, `"strict": true`, single alias `"@/*": ["./*"]` | Lacks `"noUncheckedIndexedAccess": true`, `"noImplicitReturns": true`, and `"exactOptionalPropertyTypes": true`. Loose path alias results in deep relative cross-imports across layers. | **Medium** | Enable strict compiler flags (`noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`). Configure domain aliases (`@/features/*`, `@/services/*`, `@/types/*`, `@/components/*`, `@/hooks/*`). |
| `metro.config.js` | Uses `withNativewind(config)` from `nativewind/metro` | Standard configuration for NativeWind v5 / Tailwind CSS v4. No SVG asset transformer customization or bytecode caching optimizations. | **Low** | Ensure Metro cache reset instructions are documented for CI/CD builds. |
| `plugins/withPaymobDataBinding.js` | Modifies `app/build.gradle` and root `build.gradle` using regex replacement on `allprojects { repositories { ... } }` | In Expo SDK 54 / Gradle 8.x, repositories are centralized in `settings.gradle` (`dependencyResolutionManagement`). Modifying `build.gradle` via string regex can fail during `expo prebuild --clean`. | **High** | Update plugin to inject maven repositories via `withSettingsGradle` or standard Gradle repository management. |
| Root Clutter (`dashboard/`, `app-example/`) | 143+ files in `dashboard/` (including `dist/` artifacts) and default `app-example/` folder | Increases build context size, bloats linting/type-checking overhead, and creates architectural confusion. | **Medium** | Isolate or purge `dashboard/` into a dedicated monorepo workspace package or separate repository. Purge `app-example/`. |

---

## 2. Dimension 1: Architecture & Modular Directory Structure

### 2.1 Technical Layer Fragmentation vs. Feature/Domain Encapsulation
The codebase is partitioned strictly by technical layers:
```
D:/test-mobile-app/
├── app/               # Expo Router screens & layouts
├── components/        # Reusable & domain-specific UI components
├── context/           # React Context providers
├── data/              # Static mock pitch data
├── services/          # Storage & payment integrations
└── types/             # Shared TypeScript schemas
```

**Anti-Pattern & Structural Risks**:
1. **Scattered Feature Logic**: Domain logic for Pitch Booking, Customer Authentication, Player Passport (FIFA card), and Wallet Management is fragmented across 5 top-level folders.
2. **Monolithic Screen Components (God Components)**:
   - `app/pitch/[id].tsx` (803 lines): Contains slot time parsing (`parseSlotTimes`), Paymob SDK lifecycle setup, 3 payment branch handlers (Wallet, Card, Cash), QR verification string generation, modal presentation, and UI layout.
   - `app/profile.tsx` (474 lines): Contains user details state, football specs form handlers, app preferences switches, profile persistence, logout dialogs, and FIFA modal triggers.
   - `app/index.tsx` (279 lines): Contains header wallet UI, category scrolling, flatlist card rendering, ad banner carousel integration, and modal states.

### 2.2 Dual Competing Domain Schemas (`Pitch` vs `Venue`)
The codebase exhibits a critical schema divergence where two incompatible representations of a sports facility coexist without a mapping layer:

| Domain Field | `Pitch` (`data/mockPitches.ts:14-29`) | `Venue` (`types/index.ts:19-45`) | Consequence |
|---|---|---|---|
| Sport Category | `type: '5-A-SIDE' \| '11-A-SIDE' \| 'PADEL' \| '7-A-SIDE'` | `sportsTypes: SportsType[]` | UI filtering in `HomeScreen` only filters single `type` string; cannot handle multi-sport venues. |
| Hourly Price | `pricePerHour: number`, `currency: string` | `pricing: VenuePricing` (`defaultPricePerHour`, `customHourlyRates`) | `storageService` has dynamic pricing rates (`MOBILE_SEED_VENUES:31-34`), but UI in `app/pitch/[id].tsx` uses flat `pitch.pricePerHour`. |
| Gallery Images | `imageUrl: string` (single string) | `imageUrls: string[]`, `imageGallery?: string[]` | UI cannot render venue image carousels from the storage service. |
| Working Hours | `availableDates: PitchDate[]`, `timeSlots: TimeSlot[]` (hardcoded mock) | `workingHours: { openTime, closeTime, daysOpen }` | The app cannot dynamically calculate available slots from opening hours; relies entirely on static mock dates. |
| Persistence Disconnect | Used for `HomeScreen` and `DetailsScreen` UI | Seeded into `storageService.ts` as `MOBILE_SEED_VENUES` | Changes to venues in storage (e.g. admin updates) are completely ignored by the client app! |

### 2.3 Expo Router Layout & Navigation Anti-Patterns
1. **Bypassing Typed Routes with `as any`**:
   `experiments.typedRoutes: true` is configured in `app.json`, but all router calls use `as any` type casting:
   - `app/(auth)/login.tsx:31`: `router.push({ pathname: "/(auth)/verify" as any });`
   - `app/(auth)/verify.tsx:67`: `router.replace({ pathname: "/pitch/[id]", params: { id: pendingBooking.pitchId } } as any);`
   - `app/(auth)/verify.tsx:69`: `router.replace("/" as any);`
   - `app/(auth)/verify.tsx:72`: `router.push({ pathname: "/(auth)/profile-setup" as any });`
   - `app/(auth)/profile-setup.tsx:39`: `router.replace({ pathname: "/pitch/[id]", params: { id: pendingBooking.pitchId } } as any);`
   - `app/(auth)/profile-setup.tsx:41`: `router.replace("/" as any);`
   - `app/index.tsx:173`: `router.push("/player-card" as any)`
   - `app/index.tsx:186`: `router.push("/(auth)/login" as any)`
   - `app/index.tsx:188`: `router.push("/player-card" as any)`
   - `app/pitch/[id].tsx:250`: `router.push({ pathname: "/(auth)/login" as any });`
   - `app/player-card.tsx:39, 79`: `router.push("/profile" as any)`
   - `app/profile.tsx:89`: `router.replace("/" as any)`

   *Impact*: Total loss of compile-time navigation safety. Broken route names, missing dynamic route parameters, or renamed routes fail silently at runtime instead of failing at build time.

2. **Missing Root Error Boundaries & 404 Recovery**:
   - Neither `app/+error-boundary.tsx` nor `app/+not-found.tsx` is defined.
   - Any rendering error, unhandled rejection, or navigation mismatch crashes the entire React Native native bridge, presenting a red screen in dev or an immediate app crash in production.

3. **Missing Root `GestureHandlerRootView`**:
   - In `app/_layout.tsx`, `react-native-gesture-handler` is installed, but the root layout does NOT wrap children in `<GestureHandlerRootView style={{ flex: 1 }}>`.
   - *Impact*: On Android, gestures inside nested scroll views, bottom sheets, or interactive sliders can throw native unhandled crashes or fail silently.

4. **Splash Screen Anti-Pattern**:
   - `app/_layout.tsx:18-20`:
     ```tsx
     if (!fontsLoaded) {
       return <View className="flex-1 bg-[#04060c]" />;
     }
     ```
   - Proper Expo SDK 54 practice requires `SplashScreen.preventAutoHideAsync()` before mounting and `SplashScreen.hideAsync()` when `fontsLoaded` resolves. The current code creates an unstyled blank screen flash during app cold start.

---

## 3. Dimension 2: State Management, Data Fetching & Caching

### 3.1 Context API Bottlenecks & Re-render Cascades
- `AuthContext.tsx` manages:
  1. Session state (`isAuthenticated`, `user`)
  2. Temporary booking interception state (`pendingBooking`)
  3. Ephemeral auth form state (`authPhone`, `authMethod`)
  4. Authentication methods (`loginWithPhone`, `verifyOTP`, `completeProfile`, `updateProfile`, `logout`)

**Re-render Cascade**:
Every keystroke in `app/(auth)/login.tsx` triggers `setAuthPhoneAndMethod`, mutating `authPhone` in `AuthContext`. Because `useAuth()` is consumed in `HomeScreen` (`app/index.tsx:25`), `DetailsScreen` (`app/pitch/[id].tsx:41`), `ProfileScreen` (`app/profile.tsx:24`), and `PlayerCardScreen` (`app/player-card.tsx:12`), every keystroke on the login form re-renders all active subscribers across the navigation stack!

### 3.2 Total Lack of Server State Management & Caching
- The mobile application has NO caching layer (neither `@tanstack/react-query` nor RTK Query).
- Data loading is implemented via fragmented, imperative `useEffect` hooks in separate UI components:
  - `app/pitch/[id].tsx:59-70`: Ad-hoc dynamic `import("@/services/storageService")` inside `useEffect`.
  - `components/AdBannerCarousel.tsx:36-39`: Ad-hoc `getBannersAsync()` call in local component state.
  - `app/profile.tsx:43-56`: Ad-hoc local sync with local form `useState`.
- **Consequences**:
  - No query deduplication (if two components need active customer profile, two separate storage reads execute).
  - No background refetching on app resume / network reconnection.
  - No optimistic updates for booking creation or wallet balance deduction.
  - Hardcoded fallback values when state is uninitialized (e.g. `customer ? `${customer.walletBalance} EGP` : "1,500 EGP"` in `app/pitch/[id].tsx:524`).

### 3.3 Storage Layer Concurrency & Race Conditions
In `services/storageService.ts`:
1. **Non-Atomic Multi-Key Mutation**:
   In `createBookingAsync` (`services/storageService.ts:407-525`):
   ```typescript
   const customers = await getCustomersAsync();
   const wallets = await getWalletsAsync();
   const bookings = await getBookingsAsync();
   const txs = await getTransactionsAsync();
   // ... mutates arrays in memory ...
   await storageAdapter.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
   await storageAdapter.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(wallets));
   await storageAdapter.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
   await storageAdapter.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
   ```
   *Vulnerability*: Four independent, non-transactional `AsyncStorage.setItem` operations. If the app is closed, suspended by OS, or crashes between operations, database integrity is permanently broken (e.g., wallet balance deducted but booking record not saved, or transaction logged but wallet not updated).

2. **Insecure Plaintext Storage of Session & Financial Data**:
   - `STORAGE_KEYS.ACTIVE_CUSTOMER_ID` and `STORAGE_KEYS.CUSTOMERS` store customer profiles, balances, and IDs directly in unencrypted `AsyncStorage`.
   - On jailbroken/rooted devices or Android backups, AsyncStorage is stored as an unencrypted XML/SQLite file. Sensitive customer session tokens must be stored in `expo-secure-store`.

3. **Storage Adapter Multi-Platform Desynchronization**:
   In `storageService.ts:310-335`:
   - `getItem` reads from `AsyncStorage`, then falls back to `window.localStorage`.
   - `setItem` writes to `AsyncStorage`, then writes to `window.localStorage` and dispatches a `window.dispatchEvent(new CustomEvent(...))`.
   - In React Native mobile runtime, `window` is `undefined`. On web runtime, `AsyncStorage` and `localStorage` operate on completely disjoint backends, causing desynchronization if one write succeeds and the other fails.

### 3.4 Networking, Payment Service & Security Vulnerabilities
In `services/paymobService.ts`:
1. **Hardcoded Sandbox Secrets & Test Keys**:
   - Lines 64-65:
     ```typescript
     clientSecret: "egy_csk_test_fd4742b96c178f5efd389c1c5754a791",
     publicKey: "egy_pk_test_TFZRZFrjbT7c3IJNN2WCvE98ObtYyyDL",
     ```
     These credentials are baked into client source code.
2. **Hardcoded IP Addresses & Brute-Force Fallback Loop**:
   - Lines 5-6, 27-33:
     ```typescript
     const DEV_SERVER_URL = Platform.OS === "android" ? "http://192.168.1.11:3000" : "http://localhost:3000";
     const candidateUrls = [serverUrl, "http://10.0.2.2:3000", "http://localhost:3000", "http://192.168.1.11:3000"];
     ```
     Loops through sequential HTTP requests with no timeout limits or network awareness.
3. **Insecure Token Transmission via WebBrowser**:
   - Lines 125-134:
     ```typescript
     const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${encodeURIComponent(publicKey)}&clientSecret=${encodeURIComponent(clientSecret)}`;
     await WebBrowser.openBrowserAsync(checkoutUrl);
     ```
     Passing secrets via URL parameters in a browser modal exposes payment intent secrets to browser history, proxy logs, and intercepting schemes.

---

## 4. Dimension 3: Type Safety, Runtime Validation & Error Resilience

### 4.1 TypeScript Configuration & Pervasive `any` Usage
1. **Compiler Flags**:
   `tsconfig.json` lacks `"noUncheckedIndexedAccess": true`. Array indexing throughout the app (such as `pitch.availableDates[selectedDateIndex]`, `parts[0]`, `digits[index]`, `customers[custIdx]`) is typed as non-null (`T`), leading to runtime crashes when an array index is undefined.

2. **Audit of `any` Occurrences**:
   - `components/FifaCardDisplay.tsx:9`: `user: any;`
   - `components/FifaPlayerCardModal.tsx:9`: `user: any;`
   - `app/pitch/[id].tsx:53`: `const [customer, setCustomer] = useState<any>(null);`
   - `app/pitch/[id].tsx:232`: `catch (err: any)`
   - `app/profile.tsx:75`: `catch (err: any)`
   - `app/(auth)/verify.tsx:49`: `handleKeyPress = (e: any, index: number)`
   - `services/paymobService.ts:34`: `let lastError: any = null;`
   - `services/paymobService.ts:54`: `catch (error: any)`
   - `services/paymobService.ts:89`: `Paymob.setSdkListener((status: any) => {`
   - Navigation: 13+ instances of `as any` across route push/replace calls.

### 4.2 Type Inconsistencies Across Entity Definitions
In `types/index.ts`:
- **Enum Duplication & Case Inconsistency**:
  - `PaymentMethod`: `'Wallet Balance' | 'Cash' | 'Credit Card' | 'WALLET' | 'CASH' | 'CREDIT_CARD' | 'PAYMOB'` (mixes title-case strings with enum tokens).
  - `BookingStatus`: `'Confirmed' | 'Completed' | 'Cancelled' | 'BOOKED' | 'COMPLETED'` (mixes sentence-case and uppercase).
  - `TransactionType`: `'REFUND_CREDIT' | 'BOOKING_DEBIT' | 'ADMIN_PAYOUT' | 'TOP_UP' | 'TOPUP'` (duplicate `'TOP_UP'` and `'TOPUP'`).
  - `UserRole` = `SystemUserRole` / `UserStatus` = `SystemUserStatus` (redundant alias declarations).
- **Position Schema Chaos**:
  - `Customer` (`types/index.ts:54-55`): `position?: string; favoritePosition?: string;`
  - `UserProfile` (`context/AuthContext.tsx:15`): `favoritePosition: string;` (untyped string)
  - `ProfileSetupScreen` (`app/(auth)/profile-setup.tsx:15-20`): `["STRIKER", "MIDFIELDER", "DEFENDER", "GOALKEEPER"]`
  - `ProfileScreen` (`app/profile.tsx:18`): `["ST", "CAM", "CM", "RW", "LW", "CB", "GK"]`
  - `FifaCardDisplay` (`components/FifaCardDisplay.tsx:29-30`): Slices arbitrary string to 3 characters (`user.favoritePosition.toUpperCase().slice(0, 3)`), causing invalid FIFA card positions (e.g. "STR", "MID", "DEF").

### 4.3 Zero Runtime Schema Validation (Zod / Valibot Absence)
- There is NO runtime validation anywhere in the data ingestion pipeline:
  - `storageService.ts:344`: `JSON.parse(raw)` directly type-cast without schema validation.
  - `paymobService.ts:48`: `await response.json()` assumed to match `PaymentIntentResponse`.
  - `app/pitch/[id].tsx:38`: `const { id } = useLocalSearchParams<{ id: string }>();` never validates if `id` exists or matches a valid venue identifier.
- *Risk*: A single malformed storage entry or altered backend payload results in catastrophic app crash due to `Cannot read property 'x' of undefined`.

### 4.4 Error Resilience, Fallbacks & Silent Failure Patterns
1. **Silent Error Swallowing**:
   - `services/storageService.ts:329`: `catch {}` silently swallows AsyncStorage write failures.
   - `context/AuthContext.tsx:72, 118, 171`: Errors are caught with `console.warn` without setting user-visible error state.
   - `components/AdBannerCarousel.tsx:74`: Failed deep links are caught with `console.error` without user feedback.
2. **Missing Network & Retry State**:
   - No offline indicator or banner when device loses internet connectivity.
   - No exponential backoff or retry logic on network failures.

---

## 5. Architectural Gap Analysis Matrix

| Dimension | Current Implementation (Antipattern) | Target Industry Standard (Expo SDK 54 / React 19) | Technical Rationale & Trade-offs |
|---|---|---|---|
| **Architecture** | Flat technical layer folders (`app/`, `components/`, `services/`, `data/`, `types/`); 800+ line God components. | **Feature-First Domain Slices** (`src/features/{auth,booking,venues,wallet,passport}`) with co-located components, hooks, schemas, and API clients. Expo Router files in `app/` act purely as thin route wrappers. | Maximizes cohesion, eliminates cross-feature tangling, enables modular testing, and makes codebase scalable for multi-developer teams. |
| **Routing** | Untyped navigation using `as any` casting; missing error boundary and 404 screens; missing `GestureHandlerRootView`. | **Fully Typed Expo Router v6** routes using generated types; global `+error-boundary.tsx`, `+not-found.tsx`, and root `<GestureHandlerRootView>`. | Guarantees compile-time route safety, catches unexpected render crashes gracefully, and prevents Android gesture bridge crashes. |
| **State Management** | Monolithic `AuthContext` with high-frequency updates triggering full-tree re-renders; hardcoded JSX data. | **Split Contexts** (`AuthSessionContext`) for auth tokens + **Zustand** or **TanStack Query** for client/server state with fine-grained selectors. | Prevents unnecessary re-renders of background screens; isolates auth flow states from session state. |
| **Data Fetching & Caching** | Raw `useEffect` hooks with local `useState`; direct dynamic `import("@/services/storageService")` inside components; no caching. | **TanStack Query (`@tanstack/react-query`) v5** with custom hooks (`useVenuesQuery`, `useCustomerBookingsQuery`, `useCreateBookingMutation`). | Provides automatic background revalidation, query deduplication, optimistic UI updates, query invalidation, and built-in error/loading states. |
| **Storage & Security** | Plaintext `AsyncStorage` for customer sessions, balances, and IDs; non-atomic multi-key mutations; hardcoded API keys. | **`expo-secure-store`** for auth credentials / customer tokens; single-store serialized storage engine; API keys in `EXPO_PUBLIC_*` environment variables. | Protects user credentials on rooted/jailbroken devices; guarantees ACID-like transactional consistency on multi-key state changes. |
| **Type Safety & Validation** | Loose TypeScript compiler flags; pervasive `any` in components/services; divergent entity schemas (`Pitch` vs `Venue`); no runtime validation. | **Strict TypeScript (`noUncheckedIndexedAccess`)**; unified entity types in `src/types/`; **Zod runtime validation schemas** (`VenueSchema`, `BookingSchema`, `CustomerSchema`). | Catches edge-case `undefined` access at compile-time; guarantees runtime payload integrity; prevents corrupted local storage from crashing the application. |

---

## 6. Comprehensive Refactoring Roadmap

### Phase 0: Quick Wins & Immediate Code Quality / Deprecation Fixes
- [ ] Purge dead template directories (`app-example/`) and isolate/remove foreign `dashboard/` from mobile root.
- [ ] Add root `<GestureHandlerRootView style={{ flex: 1 }}>` to `app/_layout.tsx`.
- [ ] Fix splash screen startup lifecycle using `SplashScreen.preventAutoHideAsync()` and `SplashScreen.hideAsync()`.
- [ ] Create `app/+error-boundary.tsx` and `app/+not-found.tsx` to prevent hard application crashes.
- [ ] Standardize TypeScript compiler options in `tsconfig.json` (`noUncheckedIndexedAccess: true`, `noImplicitReturns: true`).
- [ ] Remove hardcoded sandbox keys from `services/paymobService.ts` and migrate to `.env` / `EXPO_PUBLIC_*` variables.

### Phase 1: Core Architecture, Directory Restructuring & Domain Separation
- [ ] Reorganize codebase into feature-based modules:
  ```
  src/
  ├── features/
  │   ├── auth/         # AuthContext, login, verify, profile-setup, authSchema
  │   ├── venues/       # VenueCard, VenueList, venueQueries, venueSchema
  │   ├── booking/      # BookingSlotPicker, CheckoutModal, bookingMutations, bookingSchema
  │   ├── passport/     # FifaCardDisplay, FifaPlayerCardModal, passportUtils
  │   └── wallet/       # WalletCard, TransactionList, walletQueries
  ├── components/ui/    # Atomic UI primitives (Buttons, Badges, Inputs, Modals)
  ├── services/         # SecureStoreService, ApiClient, PaymobService
  └── types/            # Canonical domain types & shared schemas
  ```
- [ ] Unify the dual `Pitch` vs `Venue` data models into a single canonical `Venue` schema with automated runtime schema migration.
- [ ] Refactor Expo Router screens in `app/` into thin entry points delegating to feature components.
- [ ] Remove all 13+ instances of `as any` navigation casting and restore Expo Router typed routes.

### Phase 2: State Management, Networking & Caching Layer Modernization
- [ ] Install and configure `@tanstack/react-query` v5 with `QueryClientProvider` in `app/_layout.tsx`.
- [ ] Split `AuthContext` into `AuthSessionContext` (user profile, token, isAuthenticated) and local flow state.
- [ ] Replace imperative `useEffect` data loading with declarative Query & Mutation hooks (`useVenues`, `useVenueDetails`, `useCreateBooking`, `useCancelBooking`).
- [ ] Replace plaintext session storage in `AsyncStorage` with `expo-secure-store` for authentication tokens and active user credentials.
- [ ] Refactor `services/storageService.ts` to implement transactional, atomic state updates to prevent double-refund and data corruption race conditions.
- [ ] Implement robust API client with retry logic, timeout handling, and offline detection.

### Phase 3: Type Safety Hardening & Runtime Validation
- [ ] Install `zod` and generate runtime validation schemas for all domain models (`CustomerSchema`, `VenueSchema`, `BookingSchema`, `WalletTransactionSchema`, `AdBannerSchema`).
- [ ] Validate all `AsyncStorage` / network reads with `.parse()` or `.safeParse()` before state consumption.
- [ ] Eliminate all `any` types in components (`FifaCardDisplay`, `FifaPlayerCardModal`, `DetailsScreen`).
- [ ] Standardize enum tokens across the entire stack (`PaymentMethodEnum`, `BookingStatusEnum`, `PlayerPositionEnum`).
- [ ] Configure font family design tokens in `global.css` / Tailwind v4 `@theme` to eliminate repetitive inline font styles across UI components.
