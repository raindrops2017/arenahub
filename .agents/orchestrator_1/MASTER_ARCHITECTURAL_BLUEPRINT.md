# Master Architecture Review, Gap Analysis & Phased Refactoring Blueprint
## Expo SDK 54 / React Native 0.81+ / React 19 Mobile Client Application

**Author**: Project Orchestrator (`orchestrator_1`)  
**Target Environment**: Expo SDK 54 (`~54.0.35`), React Native `0.81.5` (New Architecture: Fabric / TurboModules / Bridgeless), React `19.1.0` (React Compiler), NativeWind `v5.0.0-preview.4` (Tailwind CSS `v4.3.3` / `react-native-css` `^3.0.7`)  
**Scope**: Client-side application (`app/`, `components/`, `context/`, `services/`, `data/`, `types/`, `dashboard/` root workspace clutter audit, root configs).  
**Strict Exclusion**: Backend servers (`server/`, `nest-server/`) strictly excluded.  
**Date**: 2026-08-15  

---

## 1. Executive Summary & Codebase Context

An exhaustive, multi-agent client-side architectural review was conducted across the ArenaHub mobile codebase. The application is built on a modern foundation—utilizing **Expo SDK 54**, **React Native 0.81.5** with the New Architecture enabled, **React 19.1.0**, and **NativeWind v5**. However, the current implementation exhibits significant architectural divergence, technical debt, and stability vulnerabilities that hinder production readiness:

1. **Structural Fragmentation & Monolithic Screens**: The codebase is split strictly by technical layers (`app/`, `components/`, `context/`, `services/`, `data/`, `types/`) rather than cohesive domain modules. Screen files have accumulated excessive responsibilities (e.g. `app/pitch/[id].tsx` at 803 lines and `app/profile.tsx` at 474 lines), mixing payment SDK lifecycle, slot parsing, state management, modal logic, and presentation.
2. **State & Caching Bottlenecks**: Zero server-state caching is implemented. The application relies on raw `useEffect` calls, ad-hoc dynamic imports of `storageService`, and monolithic React Context (`AuthContext`). Keystrokes in authentication forms trigger re-render cascades across the entire navigation stack (`HomeScreen`, `DetailsScreen`, `ProfileScreen`).
3. **Data Integrity & Storage Race Conditions**: Local persistence in `storageService.ts` executes sequential, non-atomic `AsyncStorage.setItem` operations across multiple keys, risking permanent state corruption during app suspension. Sensitive customer tokens and IDs are stored in plaintext `AsyncStorage` rather than hardware-backed secure storage (`expo-secure-store`).
4. **Schema Divergence & Type Safety Erosion**: Two competing, incompatible schemas (`Pitch` vs `Venue`) represent sports facilities, leaving the UI disconnected from persistent storage updates. TypeScript strictness is undermined by 13+ `as any` navigation assertions, pervasive `any` parameters in services/components, and zero runtime validation (Zod/Valibot) on external/storage inputs.
5. **Design Token Abandonment & Styling Drift**: Although `global.css` defines `@theme` semantic tokens, over **190 instances** of hardcoded arbitrary hex colors (e.g., `bg-[#04060c]`, `bg-[#070b14]`, `text-[#22c55e]`, `border-[#141d2e]`) and inline font declarations (`style={{ fontFamily: "Montserrat_900Black" }}`) permeate the UI, breaking dark mode support and creating maintenance bottlenecks.
6. **Performance & Asset Pipeline Omissions**: While `expo-image` and `react-native-reanimated` are installed in `package.json`, they are imported **zero times** in the application. Remote stadium imagery is rendered using standard React Native `Image` without blurhash placeholders or persistent multi-tier disk caching. Primary lists rely on standard `FlatList` without cell recycling (`@shopify/flash-list`).
7. **Expo SDK 54 Native Lifecycle Gaps**: Missing `SplashScreen.preventAutoHideAsync()`/`hideAsync()` lifecycle causes cold-start screen flashes. Missing `<GestureHandlerRootView>` in root `_layout.tsx` risks Android gesture failures under React Native 0.81. Conflicting dual status bar controllers cause flickering transitions.

---

## 2. In-Depth Client-Side Codebase Audit

### 2.1 Root Configurations & Workspace Hygiene

| Configuration File | Current State | Defect / Anti-Pattern / Vulnerability | Impact & Severity | Recommended Target Pattern |
|---|---|---|---|---|
| `package.json` | `expo: ~54.0.35`, `react: 19.1.0`, `react-native: 0.81.5`, `nativewind: ^5.0.0-preview.4`, `tailwindcss: ^4.3.3` | Missing `@tanstack/react-query`, `zod`, `expo-secure-store`, `class-variance-authority`, `clsx`, `tailwind-merge`. `paymob-reactnative` is installed via unpinned GitHub reference (`"github:PaymobAccept/paymob-reactnative-sdk"`). | **High**: Non-deterministic CI/CD builds; missing essential libraries for caching, validation, UI variants, and secure storage. | Add `@tanstack/react-query@^5.x`, `zod@^3.24+`, `expo-secure-store@~15.0+`, `class-variance-authority`, `clsx`, `tailwind-merge`. Pin native dependencies to explicit release versions. |
| `app.json` | `experiments.typedRoutes: true`, `experiments.reactCompiler: true`, `newArchEnabled: true`, `edgeToEdgeEnabled: true` | `typedRoutes: true` is enabled, but route navigation systematically bypasses typed generation with `as any`. Missing explicit deep-linking scheme prefix matching rules. | **Medium**: Broken routes fail silently at runtime; deep-linking route matching lacks explicit URL paths. | Generate typed route definitions (`.expo/types/router.d.ts`), eliminate all `as any` route assertions, and configure explicit scheme paths. |
| `tsconfig.json` | Extends `expo/tsconfig.base`, `"strict": true`, path alias `"@/*": ["./*"]` | Lacks `"noUncheckedIndexedAccess": true` and `"noImplicitReturns": true`. Single catch-all path alias permits uncontrolled cross-layer imports. | **Medium**: Out-of-bounds array access (e.g. `dates[index]`, `slots[i]`) causes runtime `undefined` crashes. | Enable strict compiler flags (`noUncheckedIndexedAccess: true`, `noImplicitReturns: true`) and configure modular path aliases (`@/features/*`, `@/components/*`, `@/lib/*`, `@/types/*`). |
| `metro.config.js` | Uses `withNativewind(config)` from `nativewind/metro` | Basic NativeWind setup; no SVG transformer optimization or cache configuration documented. | **Low**: Standard configuration. | Ensure cache cleanup and asset resolution rules are documented for team builds. |
| `plugins/withPaymobDataBinding.js` | Modifies root and app `build.gradle` via regex replacing `allprojects { repositories { ... } }` | In modern Gradle / Expo SDK 54, repository management is declared in `settings.gradle` (`dependencyResolutionManagement`). String regex replacement fails on clean prebuilds. | **High**: Android EAS prebuild crashes during native configuration. | Refactor config plugin to use `withSettingsGradle` or declare maven repositories via standard Expo config plugin APIs. |
| Workspace Clutter (`dashboard/`, `app-example/`) | 143+ files in `dashboard/` (including `dist/` web build outputs) and boilerplate `app-example/` folder in root | Bloats workspace, pollutes TypeScript/ESLint scanning context, and confuses mobile vs web boundaries. | **Medium**: Build slowdowns and structural ambiguity. | Isolate `dashboard/` into a separate repository or monorepo package. Delete `app-example/`. |

---

### 2.2 Dimension 1: Architecture & Modular Directory Structure

#### Structural Fragmentation
The codebase follows a flat technical layer model:
```
D:/test-mobile-app/
├── app/               # Expo Router screens & layouts (God components)
├── components/        # Ad-hoc UI & domain components
├── context/           # Monolithic React Context providers
├── data/              # Static mock pitch data
├── services/          # Storage & payment integrations
└── types/             # Monolithic TypeScript type definitions
```
**Consequences**:
1. Modifying a single business capability (e.g. booking a pitch) requires touching 6 disconnected directories.
2. Domain logic cannot be tested in isolation; components are tightly coupled to specific storage implementations.

#### Monolithic Screen Components (God Components)
- `app/pitch/[id].tsx` (803 lines): Contains slot time parsing (`parseSlotTimes`), Paymob SDK initialization, three payment processing branches (Wallet, Card, Cash), QR verification payload generation, 5 modal state handlers, and inline presentation layout.
- `app/profile.tsx` (474 lines): Contains form validation, football position selectors, switch toggle handlers, profile persistence, logout dialogs, and FIFA modal visibility.
- `app/index.tsx` (279 lines): Contains header wallet UI, category scrolling, card rendering, and carousel integration.

#### Dual Competing Domain Schemas (`Pitch` vs `Venue`)
The application has two conflicting representations of sports facilities:
- `Pitch` (`data/mockPitches.ts:14-29`): Flat model with `type: '5-A-SIDE' | '11-A-SIDE'`, single `imageUrl`, flat `pricePerHour: number`, and static `availableDates: PitchDate[]`.
- `Venue` (`types/index.ts:19-45`): Rich enterprise model with `sportsTypes: SportsType[]`, `imageUrls: string[]`, `pricing: VenuePricing`, and `workingHours: { openTime, closeTime, daysOpen }`.
- **The Disconnect**: `HomeScreen` (`app/index.tsx`) and `DetailsScreen` (`app/pitch/[id].tsx`) consume `MOCK_PITCHES` (`Pitch[]`), while `storageService.ts` seeds `MOBILE_SEED_VENUES` (`Venue[]`). As a result, changes made to venues in persistent storage (e.g., pricing updates or admin changes) are never reflected in the user interface.

#### Expo Router Navigation Safety Bypasses
13+ instances of navigation calls bypass the TypeScript compiler using `as any`:
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

---

### 2.3 Dimension 2: State Management, Data Fetching & Caching

#### Context API Bottlenecks & Re-render Cascades
In `context/AuthContext.tsx`:
- Holds session tokens (`user`, `isAuthenticated`), booking redirection state (`pendingBooking`), ephemeral auth form input (`authPhone`, `authMethod`), and 5 async mutation handlers.
- The context value is passed as an unmemoized inline object literal (`lines 183–201`).
- Every keystroke in the login phone input updates `authPhone`, causing `AuthContext.Provider` to emit a new value reference. All consumer screens (`HomeScreen`, `DetailsScreen`, `ProfileScreen`, `PlayerCardScreen`) re-render immediately.

#### Absence of Asynchronous State Caching
- The application lacks a dedicated server-state caching library (`@tanstack/react-query`).
- Data fetching relies on uncoordinated `useEffect` hooks and local `useState`:
  - `app/pitch/[id].tsx:59-70`: Dynamic `import("@/services/storageService")` inside `useEffect`.
  - `components/AdBannerCarousel.tsx:36-39`: Ad-hoc `getBannersAsync()` call in local component state.
  - `app/profile.tsx:43-56`: Ad-hoc local sync with local form `useState`.
- **Consequences**: No request deduplication, no automatic background revalidation on network recovery, no query invalidation on mutation, and no optimistic updates.

#### Persistence Layer Race Conditions
In `services/storageService.ts:407-525` (`createBookingAsync`):
```typescript
const customers = await getCustomersAsync();
const wallets = await getWalletsAsync();
const bookings = await getBookingsAsync();
const txs = await getTransactionsAsync();
// In-memory array mutations...
await storageAdapter.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
await storageAdapter.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(wallets));
await storageAdapter.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
await storageAdapter.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
```
**Vulnerability**: Four independent, non-transactional `AsyncStorage.setItem` operations execute sequentially. If the app process terminates between operations, data integrity is permanently corrupted (e.g., wallet balance deducted but booking record lost).

#### Security Vulnerabilities
- `services/paymobService.ts:64-65`: Hardcoded sandbox secrets and public keys are committed directly into source code (`clientSecret: "egy_csk_test_..."`, `publicKey: "egy_pk_test_..."`).
- `services/paymobService.ts:5-6, 27-33`: Hardcoded IP fallback loops (`http://192.168.1.11:3000`, `http://10.0.2.2:3000`) execute sequential network requests without timeouts.
- `services/storageService.ts:8-16`: Customer session IDs and financial records are stored in plaintext `AsyncStorage` instead of encrypted `expo-secure-store`.
- `services/paymobService.ts:125-134`: Passing payment client secrets via URL query parameters in `WebBrowser.openBrowserAsync` exposes credentials to browser history and proxy interception.

---

### 2.4 Dimension 3: Type Safety, Runtime Validation & Error Resilience

#### Loose TypeScript Compiler & Pervasive `any` Usage
- Missing `"noUncheckedIndexedAccess": true` in `tsconfig.json` results in unchecked array index lookups returning `T` instead of `T | undefined`.
- `any` assertions found in critical paths:
  - `components/FifaCardDisplay.tsx:9`: `user: any;`
  - `components/FifaPlayerCardModal.tsx:9`: `user: any;`
  - `app/pitch/[id].tsx:53`: `const [customer, setCustomer] = useState<any>(null);`
  - `app/pitch/[id].tsx:232`: `catch (err: any)`
  - `app/profile.tsx:75`: `catch (err: any)`
  - `app/(auth)/verify.tsx:49`: `handleKeyPress = (e: any, index: number)`
  - `services/paymobService.ts:34, 54, 89`: Multiple `any` error and status objects.

#### Inconsistent Enums & Entity Definitions
In `types/index.ts`:
- `PaymentMethod` mixes casing: `'Wallet Balance' | 'Cash' | 'Credit Card' | 'WALLET' | 'CASH' | 'CREDIT_CARD' | 'PAYMOB'`.
- `BookingStatus` mixes sentence-case and uppercase: `'Confirmed' | 'Completed' | 'Cancelled' | 'BOOKED' | 'COMPLETED'`.
- Football position schemas diverge across 4 files: `["STRIKER", "MIDFIELDER", "DEFENDER", "GOALKEEPER"]` in `profile-setup.tsx` vs `["ST", "CAM", "CM", "RW", "LW", "CB", "GK"]` in `profile.tsx`, causing string slice bugs in `FifaCardDisplay.tsx:29-30`.

#### Absence of Runtime Schema Validation
- Zero runtime schema validation (Zod / Valibot) exists across network or storage ingestion.
- `JSON.parse(raw)` in `storageService.ts:344` and `response.json()` in `paymobService.ts:48` are directly type-cast. A single corrupted storage entry or altered backend payload results in fatal unhandled `TypeError` crashes.

#### Silent Failure & Error Swallowing
- `services/storageService.ts:329`: Empty `catch {}` block silently swallows storage write failures.
- `context/AuthContext.tsx:72, 118, 171`: Errors are caught with `console.warn` without setting user-facing error state.
- Missing global `app/+error-boundary.tsx` and `app/+not-found.tsx`.

---

### 2.5 Dimension 4: UI/UX Consistency, NativeWind v5 Styling & Animations

#### Design Token Abandonment
In `global.css` (lines 7–20), semantic design tokens (`--color-background`, `--color-surface`, `--color-card`, `--color-primary`, `--color-border`) are configured in the Tailwind v4 `@theme` block. However, **over 190 instances** of hardcoded arbitrary hex classes permeate the codebase:
- `app/index.tsx`: `bg-[#04060c]`, `bg-[#070b14]`, `border-[#141d2e]`, `text-[#22c55e]`, `text-[#60a5fa]`.
- `app/pitch/[id].tsx`: 50+ arbitrary hex classes (`#04060c`, `#070b14`, `#060a12`, `#141d2e`, `#22c55e`).
- `app/profile.tsx`: 38+ hardcoded hex occurrences.
- `components/FifaCardDisplay.tsx`: 22+ arbitrary hex classes.
- **Impact**: System dark/light mode switching (`userInterfaceStyle: "automatic"`) cannot function, CSS runtime evaluation overhead increases, and global brand color changes require editing hundreds of JSX lines.

#### Typography Inconsistencies & Android Font Weight Collisions
- Custom fonts (`Montserrat_900Black`, `Montserrat_800ExtraBold`, `Montserrat_700Bold`, `BebasNeue_400Regular`) are passed via inline styles (`style={{ fontFamily: ... }}`) on 100+ `<Text>` elements.
- On Android, combining explicit font families (e.g. `Montserrat_900Black`) with Tailwind weight classes (`font-extrabold` / `font-bold`) triggers `ReactFontManager` typeface lookup failures, causing silent fallback to default system Roboto.

#### Inactive Animations & Missing UI Primitives
- `"react-native-reanimated": "~4.1.1"` is installed in `package.json` but imported **zero times** in the codebase.
- In `components/AdBannerCarousel.tsx:182`, web CSS `transition-all duration-300` is placed on a native `<View>` without any visual effect.
- The app lacks reusable atomic design primitives: no `<Button>`, `<Input>`, `<Card>`, `<Badge>`, or `<BottomSheet>` components exist; screens duplicate raw `<TouchableOpacity>` and `<TextInput>` blocks.

#### Accessibility Deficiencies & Screen Sizing Bugs
- Zero `accessibilityRole`, `accessibilityLabel`, or `hitSlop` attributes exist on interactive touch targets.
- `components/AdBannerCarousel.tsx:19` and `components/FifaCardDisplay.tsx:6` call `Dimensions.get("window")` at top-level module scope, which fails to update on foldable screens, tablets, or orientation changes.

---

### 2.6 Dimension 5: Performance, Memory & Resource Optimization

#### Virtualization & Image Pipeline Bottlenecks
- `app/index.tsx:249`: Pitch feed is rendered using standard React Native `FlatList` without view recycling (`@shopify/flash-list`) and without `getItemLayout`.
- `package.json:25` contains `"expo-image": "~3.0.11"`, but **zero files import `expo-image`**. All screens import standard `react-native.Image` to load remote 1200px Unsplash imagery without blurhash placeholders or hardware-accelerated disk/memory caching.
- Scrolling through the pitch feed causes continuous bitmap decoding churn, memory spikes, and dropped frames on mid-tier mobile devices.

#### Re-render Cascades in React 19
- Inline context values in `AuthContext` and unmemoized render functions (such as `renderPitchCard` in `app/index.tsx:33-143`) create new object references on every render, defeating the optimization benefits of the React 19 Compiler.

#### Root Asset Hygiene
High-resolution mockup images (`Mbappe_231747-1.png`, `gpt-image-2_...jpg`) sit unorganized in the root project directory, increasing repository bloat.

---

### 2.7 Dimension 6: Expo SDK 54 Conventions & Deprecation Avoidance

#### Splash Screen Lifecycle Defect
`app.json:32–43` configures the `expo-splash-screen` plugin, but `SplashScreen.preventAutoHideAsync()` and `SplashScreen.hideAsync()` are omitted in `app/_layout.tsx`. In `app/_layout.tsx:18–20`, an unhandled blank `<View className="flex-1 bg-[#04060c]" />` is rendered during font loading, causing a dark screen flash on cold start.

#### Missing Root Gesture Handler Container
`app/_layout.tsx` fails to wrap the root tree in `<GestureHandlerRootView style={{ flex: 1 }}>`. On Android under the React Native 0.81 New Architecture, gesture handlers inside nested scrolls or bottom sheets fail or throw native unhandled exceptions.

#### Conflicting Status Bar Controllers
`app/_layout.tsx:3, 26` renders declarative `expo-status-bar`, while 7 screen files imperatively mount `react-native.StatusBar`, causing visual status bar flickering during navigation transitions.

#### Android Mandatory Edge-to-Edge Compliance
Android edge-to-edge rendering is enabled by default in React Native 0.81 (`edgeToEdgeEnabled: true`). The codebase inconsistently mixes legacy `<SafeAreaView>` with manual `useSafeAreaInsets` padding, resulting in inconsistent screen margins and overlapping navigation bars.

---

## 3. Structured Gap Analysis Matrix Across 6 Dimensions

| # | Dimension | Current Implementation (Anti-Pattern) | Target Best Practice (Expo SDK 54 / React 19 / NativeWind v5) | Technical Rationale & Architectural Trade-offs |
|---|---|---|---|---|
| 1 | **Architecture & Directory Structure** | Monolithic technical layer folders (`app/`, `components/`, `services/`, `data/`, `types/`); 800+ line God components (`pitch/[id].tsx`, `profile.tsx`). | **Feature-Sliced Modular Architecture** (`src/features/{auth,venues,booking,wallet,passport}`) with co-located components, hooks, schemas, and API clients. Thin Expo Router files in `src/app/`. | **High Cohesion & Scalability**: Encapsulates domain logic within feature boundaries, eliminates cross-feature tangling, enables modular unit testing, and shrinks route files to <50 lines. |
| 2 | **State Management & Caching** | Monolithic `AuthContext` managing both session and ephemeral form inputs; raw `useEffect` storage fetching without caching; no query deduplication. | **Split State Architecture**: TanStack Query v5 (`@tanstack/react-query`) with type-safe `queryOptions` key factories for remote/storage data; lightweight Zustand v5 slice stores for client UI state. | **Zero Re-render Cascades & Auto-Sync**: TanStack Query provides automatic background revalidation, query deduplication, optimistic updates, and garbage-collected memory caching. |
| 3 | **Type Safety & Runtime Validation** | Loose compiler flags (`noUncheckedIndexedAccess: false`); 13+ `as any` navigation assertions; divergent `Pitch` vs `Venue` models; zero runtime validation (Zod). | **Strict End-to-End Type Safety**: `tsconfig.json` strictness enabled; unified canonical `Venue` schema with backward-compatible legacy normalization; **Zod runtime validation schemas** (`z.infer<T>`) across storage and network boundaries; generated typed routes. | **Crash Prevention & Integrity**: Catches undefined array access at compile-time; guarantees runtime payload integrity; prevents corrupted storage entries from crashing the application. |
| 4 | **UI/UX Consistency & Styling** | 190+ hardcoded arbitrary hex classes (`bg-[#04060c]`, `text-[#22c55e]`); inline font styling (`fontFamily: "..."`); unused `react-native-reanimated`; no atomic UI primitives. | **CSS-First Design Tokens**: NativeWind v5 / Tailwind v4 `@theme` tokens in `global.css` with `@import "nativewind/theme";`; font family utility classes (`font-heading`, `font-display`); reusable CVA UI primitives (`Button`, `Input`, `Card`, `Badge`); Reanimated v4.1+ interactions. | **Design System Ergonomics & Dark Mode**: Enables instant theme switching, eliminates CSS runtime class compilation overhead, and standardizes WCAG-compliant interactive elements. |
| 5 | **Performance & Optimization** | Standard `FlatList` without cell recycling; standard `react-native.Image` loading remote 1200px images without blurhash or disk cache; unmemoized context values. | **Hardware-Accelerated UI Pipeline**: `@shopify/flash-list` with calibrated `estimatedItemSize`; `expo-image` with `cachePolicy="memory-disk"` and progressive blurhash placeholders; React 19 compiler optimization. | **Guaranteed 60/120 FPS**: FlashList recycles native views to prevent memory spikes; `expo-image` caches decoded bitmaps off the JS thread, eliminating scroll jank and memory pressure. |
| 6 | **Expo SDK 54 Compliance** | Missing `SplashScreen` lifecycle in `_layout.tsx`; missing root `<GestureHandlerRootView>`; conflicting status bar controllers; unmanaged Android edge-to-edge insets. | **SDK 54 Platform Standards**: Controlled `SplashScreen.preventAutoHideAsync()`/`hideAsync()` lifecycle; root `<GestureHandlerRootView style={{ flex: 1 }}>`; unified `expo-status-bar`; `react-native-safe-area-context` layout wrappers. | **Native Stability & Polish**: Eliminates cold-start white/dark screen flashes, prevents Android gesture bridge crashes, and ensures pixel-perfect edge-to-edge drawing under system bars. |

---

## 4. Actionable Phased Refactoring Roadmap

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 0: Quick Wins & Immediate Code Quality / Deprecation Fixes       │
│ • Purge workspace clutter (dashboard/, app-example/)                   │
│ • Install core packages (tanstack-query, zod, secure-store, cva)       │
│ • Fix root _layout.tsx (GestureHandlerRootView, SplashScreen lifecycle)│
│ • Add root +error-boundary.tsx and +not-found.tsx                      │
│ • Enforce strict tsconfig.json & migrate secrets to EXPO_PUBLIC_*      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Phase 1: Core Architecture, Directory Restructuring & Domain Separation│
│ • Transition to Feature-Sliced Design (src/features/*)                 │
│ • Consolidate Pitch & Venue into normalized backward-compatible schema │
│ • Deconstruct monolithic screens into thin route wrappers (<50 lines)  │
│ • Retain deep link routes (player-card.tsx) & typed navigation         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Phase 2: State Management, Networking & Caching Layer Modernization    │
│ • Introduce TanStack Query v5 with queryOptions key factories          │
│ • Decouple Auth Session Store: Pure Zustand v5 session store           │
│ • Migrate credentials/tokens to expo-secure-store                      │
│ • Bind NetInfo / AppState listeners for mobile background cache sync   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Phase 3: UI Design Tokens, Component Hierarchy & Performance Tuning    │
│ • Enforce NativeWind v5 @theme semantic tokens + nativewind/theme      │
│ • Build reusable CVA UI primitives with Android font weight safety     │
│ • Migrate feed to @shopify/flash-list & images to expo-image           │
│ • Implement Reanimated v4 bottom sheets & WCAG accessibility standards │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 4.1 Phase 0: Quick Wins & Immediate Code Quality / Deprecation Fixes

#### Objectives
1. Eliminate root workspace clutter and isolate foreign web artifacts.
2. Resolve critical native runtime lifecycle issues in `app/_layout.tsx` (`GestureHandlerRootView`, `SplashScreen`).
3. Introduce global fallback error boundaries and 404 recovery screens.
4. Strengthen TypeScript compiler settings and migrate exposed credentials to environment variables.
5. Install foundational dependencies (`@tanstack/react-query`, `zod`, `expo-secure-store`, `class-variance-authority`, `clsx`, `tailwind-merge`).

#### Concrete Before-and-After Code Patterns

##### Pattern 0.1: Root Layout Native Lifecycle & Error Boundaries
**Before (`app/_layout.tsx` - Defective Lifecycle & Missing Gesture Root)**:
```tsx
// ❌ BEFORE: Missing GestureHandlerRootView, unhandled blank screen on font loading, conflicting status bar
import { Stack } from 'expo-router';
import { useFonts, Montserrat_700Bold, Montserrat_800ExtraBold, Montserrat_900Black } from '@expo-google-fonts/montserrat';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { AuthProvider } from '@/context/AuthContext';
import '../global.css';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Montserrat_900Black,
    BebasNeue_400Regular,
  });

  if (!fontsLoaded) {
    // ❌ Causes unstyled blank screen flash
    return <View className="flex-1 bg-[#04060c]" />;
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#04060c' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="pitch/[id]" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="player-card" />
      </Stack>
    </AuthProvider>
  );
}
```

**After (`src/app/_layout.tsx` - Expo SDK 54 Native Standards)**:
```tsx
// ✅ AFTER: Standard Expo SDK 54 Native Lifecycle with GestureRoot, Controlled Splash, and Theme Background
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Montserrat_700Bold, Montserrat_800ExtraBold, Montserrat_900Black } from '@expo-google-fonts/montserrat';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import '../../global.css';

// Prevent splash screen from auto-hiding before assets are ready
SplashScreen.preventAutoHideAsync().catch(() => {});

// Synchronize Android native window background to eliminate white/dark flash
SystemUI.setBackgroundColorAsync('#04060c').catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Montserrat_900Black,
    BebasNeue_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null; // Native splash screen remains visible cleanly
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" animated backgroundColor="transparent" translucent />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#04060c' },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="pitch/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="player-card" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

##### Pattern 0.2: Global Crash Recovery Error Boundary
**New (`src/app/+error-boundary.tsx`)**:
```tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { type ErrorBoundaryProps } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GlobalErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView className="flex-1 bg-background justify-center items-center px-6">
      <View className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 items-center justify-center mb-6">
        <Text className="text-red-500 text-2xl font-bold">!</Text>
      </View>
      <Text className="text-white text-2xl text-center mb-2 font-heading">
        Something Went Wrong
      </Text>
      <Text className="text-muted-foreground text-sm text-center mb-8 px-4 leading-relaxed font-body">
        {error?.message || 'An unexpected application error occurred. Our engineers have been notified.'}
      </Text>
      <TouchableOpacity
        onPress={retry}
        activeOpacity={0.8}
        className="w-full h-14 bg-primary rounded-xl items-center justify-center shadow-lg shadow-primary/20"
      >
        <Text className="text-black text-base tracking-wide uppercase font-display">
          Reload Application
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
```

#### Phase 0 Migration Checklist
- [ ] Delete `app-example/` boilerplate.
- [ ] Isolate `dashboard/` from root client workspace.
- [ ] Install missing core packages:
  ```bash
  npx expo install @tanstack/react-query zod expo-secure-store
  npm install class-variance-authority clsx tailwind-merge
  ```
- [ ] Update `app/_layout.tsx` with `GestureHandlerRootView`, `SafeAreaProvider`, and `SplashScreen` lifecycle.
- [ ] Add `app/+error-boundary.tsx` and `app/+not-found.tsx`.
- [ ] Update `tsconfig.json`: add `"noUncheckedIndexedAccess": true`, `"noImplicitReturns": true`.
- [ ] Migrate Paymob hardcoded keys to `EXPO_PUBLIC_PAYMOB_PUBLIC_KEY` in `.env`.
- [ ] Verification: Run `npx tsc --noEmit` and confirm clean compilation.

---

### 4.2 Phase 1: Core Architecture, Directory Restructuring & Domain Separation

#### Objectives
1. Restructure codebase into a **Feature-Sliced Modular Architecture** (`src/features/*`).
2. Consolidate divergent `Pitch` and `Venue` models into a single canonical `Venue` domain schema with `z.preprocess()` backward-compatibility normalization.
3. Deconstruct 803-line `app/pitch/[id].tsx` and 474-line `app/profile.tsx` God components into domain subcomponents and hooks.
4. Eliminate all 13+ `as any` route assertions by enforcing Expo Router generated typed navigation while retaining deep link routes (`player-card.tsx`).

#### Target Directory Structure
```
src/
├── app/                          # Thin routing segment wrappers (<50 lines each)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx             # -> delegates to <LoginScreen /> in features/auth
│   │   ├── verify.tsx            # -> delegates to <VerifyScreen /> in features/auth
│   │   └── profile-setup.tsx     # -> delegates to <ProfileSetupScreen /> in features/auth
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # -> delegates to <ExploreVenuesScreen /> in features/venues
│   │   ├── bookings.tsx          # -> delegates to <MyBookingsScreen /> in features/bookings
│   │   ├── wallet.tsx            # -> delegates to <WalletScreen /> in features/wallet
│   │   └── profile.tsx           # -> delegates to <ProfileScreen /> in features/profile
│   ├── pitch/
│   │   └── [id].tsx              # -> delegates to <PitchDetailsScreen /> in features/venues
│   ├── player-card.tsx           # -> delegates to <PlayerPassportScreen /> in features/passport
│   ├── +error-boundary.tsx
│   ├── +not-found.tsx
│   └── _layout.tsx
├── features/                     # Domain modules (Self-contained)
│   ├── auth/
│   │   ├── api/                  # authApi.ts, authStorage.ts
│   │   ├── components/           # LoginForm, OTPInput, PositionSelector
│   │   ├── hooks/                # useAuthSession, useOTPVerification
│   │   ├── schemas/              # authSchemas.ts (Zod)
│   │   └── index.ts
│   ├── venues/
│   │   ├── api/                  # venueQueries.ts
│   │   ├── components/           # VenueCard, VenueFilterSheet, PitchSlotGrid, VenueHeader
│   │   ├── hooks/                # useVenues, useVenueDetails, useSlotFilter
│   │   ├── schemas/              # venueSchema.ts (Canonical Backward-Compatible Zod Schema)
│   │   ├── types/                # venueTypes.ts
│   │   └── index.ts
│   ├── bookings/
│   │   ├── api/                  # bookingMutations.ts
│   │   ├── components/           # BookingCheckoutModal, BookingPassQR, BookingCard
│   │   ├── hooks/                # useCreateBooking, useUserBookings
│   │   └── schemas/              # bookingSchema.ts
│   ├── wallet/
│   │   ├── components/           # BalanceCard, TransactionList, TopUpModal
│   │   └── hooks/                # useWalletBalance, useTransactions
│   └── passport/
│       ├── components/           # FifaCardDisplay, CardStatRadar, ShareCardModal
│       └── hooks/                # usePlayerCardStats
├── components/ui/                # Pure reusable design primitives
│   ├── Button/
│   ├── Input/
│   ├── Card/
│   ├── Badge/
│   ├── Modal/
│   └── Typography/
├── lib/                          # Infrastructure & Singletons
│   ├── queryClient.ts            # TanStack Query instance with AppState/NetInfo listeners
│   ├── secureStorage.ts          # expo-secure-store typed wrapper
│   └── apiClient.ts              # HTTP client with interceptors
└── types/                        # Global shared navigation & system types
```

#### Concrete Before-and-After Code Patterns

##### Pattern 1.1: Deconstructing Monolithic Screen into Thin Typed Route Wrapper
**Before (`app/pitch/[id].tsx` - 803 Lines God Component)**:
```tsx
// ❌ BEFORE: 803 lines mixing route params, Paymob SDK, state, modals, and JSX layout
export default function PitchDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'CARD' | 'CASH'>('WALLET');
  // ... 750+ lines of inline Paymob listeners, alert popups, slot parsing, and JSX ...
}
```

**After (`src/app/pitch/[id].tsx` - Thin Route Segment)**:
```tsx
// ✅ AFTER: Pure, type-safe thin route wrapper (<35 lines)
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { PitchDetailsContainer } from '@/features/venues';
import { z } from 'zod';
import { View, Text } from 'react-native';

const RouteParamsSchema = z.object({
  id: z.union([z.string(), z.array(z.string())]).transform((val) => (Array.isArray(val) ? val[0] : val)),
});

export default function PitchDetailsRoute() {
  const rawParams = useLocalSearchParams();
  const parsed = RouteParamsSchema.safeParse(rawParams);

  if (!parsed.success || !parsed.data.id) {
    return (
      <View className="flex-1 bg-background justify-center items-center p-6">
        <Text className="text-white font-heading text-lg">Invalid Pitch ID</Text>
      </View>
    );
  }

  return <PitchDetailsContainer venueId={parsed.data.id} />;
}
```

##### Pattern 1.2: Canonical Domain Entity with Backward-Compatible Normalization (`src/features/venues/schemas/venueSchema.ts`)
```tsx
import { z } from 'zod';

export const SportTypeSchema = z.enum(['5-A-SIDE', '7-A-SIDE', '11-A-SIDE', 'PADEL', 'TENNIS']);
export type SportType = z.infer<typeof SportTypeSchema>;

export const TimeSlotSchema = z.object({
  id: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  price: z.number().positive(),
  isAvailable: z.boolean(),
});
export type TimeSlot = z.infer<typeof TimeSlotSchema>;

// Preprocessing pipeline ensures legacy AsyncStorage models (address, imageUrl, pricing) parse cleanly
export const VenueSchema = z.preprocess((raw: any) => {
  if (typeof raw !== 'object' || raw === null) return raw;
  return {
    ...raw,
    location: raw.location ?? raw.address ?? 'Cairo, Egypt',
    coverImage: raw.coverImage ?? (Array.isArray(raw.imageUrls) ? raw.imageUrls[0] : raw.imageUrl) ?? 'https://images.unsplash.com/photo-1529900240051-540706240212?w=1200',
    pricePerHour: raw.pricePerHour ?? raw.pricing?.defaultPricePerHour ?? 200,
    sportsTypes: raw.sportsTypes ?? (raw.type ? [raw.type] : ['5-A-SIDE']),
    rating: typeof raw.rating === 'number' ? raw.rating : 5.0,
    reviewCount: typeof raw.reviewCount === 'number' ? raw.reviewCount : 0,
    amenities: raw.amenities ?? raw.features ?? [],
  };
}, z.object({
  id: z.string(),
  name: z.string().min(1),
  location: z.string(),
  address: z.string().optional(),
  rating: z.number().min(0).max(5).default(5.0),
  reviewCount: z.number().int().nonnegative().default(0),
  sportsTypes: z.array(SportTypeSchema),
  coverImage: z.string().url(),
  imageGallery: z.array(z.string().url()).default([]),
  pricePerHour: z.number().positive(),
  currency: z.string().default('EGP'),
  amenities: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  surfaceType: z.string().default('FIFA Certified Artificial Grass'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}));

export type Venue = z.infer<typeof VenueSchema>;
```

#### Phase 1 Migration Checklist
- [ ] Create `src/features/{auth,venues,bookings,wallet,passport}` directory structure.
- [ ] Migrate `data/mockPitches.ts` and `types/index.ts` models into `src/features/venues/schemas/venueSchema.ts`.
- [ ] Extract `PitchDetailsContainer`, `PitchSlotPicker`, and `BookingModal` into `src/features/venues/components/`.
- [ ] Add `src/app/player-card.tsx` delegating to `src/features/passport/`.
- [ ] Replace 13+ `as any` navigation calls with typed route paths (`/pitch/[id]` with typed params, `/(auth)/verify`, `/player-card`).
- [ ] Verification: Run `npx tsc --noEmit` and ensure typed routes generate without errors.

---

### 4.3 Phase 2: State Management, Networking & Caching Layer Modernization

#### Objectives
1. Introduce **TanStack Query v5** (`@tanstack/react-query`) with hierarchical `queryOptions` key factories.
2. Bind mobile AppState and NetInfo event listeners to `QueryClient` for automatic background sync on app resume.
3. Split monolithic `AuthContext` into a pure, lightweight `useAuthSessionStore` (Zustand v5) containing only session IDs/tokens to eliminate re-render cascades.
4. Delegate all customer profiles, wallet balances, and booking histories to TanStack Query as the single source of truth.
5. Migrate sensitive session tokens to encrypted `expo-secure-store`.

#### Concrete Before-and-After Code Patterns

##### Pattern 2.1: TanStack Query v5 Key Factory with Mobile NetInfo Sync (`src/lib/queryClient.ts` & `src/features/venues/api/venueQueries.ts`)
```tsx
// ✅ AFTER: Centralized QueryClient with mobile AppState / NetInfo auto-reconnect
import { QueryClient, focusManager, onlineManager, queryOptions, useQuery } from '@tanstack/react-query';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { VenueSchema, type Venue } from '../schemas/venueSchema';
import { apiClient } from '@/lib/apiClient';
import { z } from 'zod';

// Online status management for mobile
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable));
  });
});

// AppState refetch management on mobile focus
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}
AppState.addEventListener('change', onAppStateChange);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,    // 30 minutes
      retry: 2,
    },
  },
});

export const venueKeys = {
  all: ['venues'] as const,
  lists: () => [...venueKeys.all, 'list'] as const,
  list: (filters: { sport?: string; search?: string }) => [...venueKeys.lists(), filters] as const,
  details: () => [...venueKeys.all, 'detail'] as const,
  detail: (id: string) => [...venueKeys.details(), id] as const,
};

export const venueQueries = {
  list: (filters: { sport?: string; search?: string } = {}) =>
    queryOptions({
      queryKey: venueKeys.list(filters),
      queryFn: async (): Promise<Venue[]> => {
        const data = await apiClient.get('/venues', { params: filters });
        return z.array(VenueSchema).parse(data);
      },
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: venueKeys.detail(id),
      queryFn: async (): Promise<Venue> => {
        const data = await apiClient.get(`/venues/${id}`);
        return VenueSchema.parse(data);
      },
    }),
};

export function useVenueDetails(venueId: string) {
  return useQuery(venueQueries.detail(venueId));
}
```

##### Pattern 2.2: Pure Auth Session Store (Zustand v5 with SecureStore)
```tsx
// ✅ AFTER: Pure session state store decoupled from server data (No wallet balance duplication)
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface AuthState {
  userId: string | null;
  phone: string | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (userId: string, phone: string, token: string) => Promise<void>;
  clearSession: () => Promise<void>;
  loadStoredSession: () => Promise<void>;
}

const SECURE_TOKEN_KEY = 'arenahub_auth_token';
const SECURE_USER_ID_KEY = 'arenahub_auth_userid';
const SECURE_PHONE_KEY = 'arenahub_auth_phone';

export const useAuthSessionStore = create<AuthState>((set) => ({
  userId: null,
  phone: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setSession: async (userId, phone, token) => {
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(SECURE_TOKEN_KEY, token);
      await SecureStore.setItemAsync(SECURE_USER_ID_KEY, userId);
      await SecureStore.setItemAsync(SECURE_PHONE_KEY, phone);
    }
    set({ userId, phone, token, isAuthenticated: true, isLoading: false });
  },

  clearSession: async () => {
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
      await SecureStore.deleteItemAsync(SECURE_USER_ID_KEY);
      await SecureStore.deleteItemAsync(SECURE_PHONE_KEY);
    }
    set({ userId: null, phone: null, token: null, isAuthenticated: false, isLoading: false });
  },

  loadStoredSession: async () => {
    try {
      if (Platform.OS !== 'web') {
        const [token, userId, phone] = await Promise.all([
          SecureStore.getItemAsync(SECURE_TOKEN_KEY),
          SecureStore.getItemAsync(SECURE_USER_ID_KEY),
          SecureStore.getItemAsync(SECURE_PHONE_KEY),
        ]);
        if (token && userId) {
          set({ userId, phone, token, isAuthenticated: true, isLoading: false });
          return;
        }
      }
      set({ userId: null, phone: null, token: null, isAuthenticated: false, isLoading: false });
    } catch {
      set({ userId: null, phone: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
```

#### Phase 2 Migration Checklist
- [ ] Configure `QueryClient` singleton in `src/lib/queryClient.ts` with AppState/NetInfo bindings.
- [ ] Migrate `AuthContext` to `useAuthSessionStore` (Zustand + `expo-secure-store`).
- [ ] Refactor booking creation mutations to use `useMutation` with `onMutate` optimistic updates and query invalidation.
- [ ] Encapsulate `storageService` transactions into atomic batch updates.
- [ ] Verification: Test login flow, confirm token stored in SecureStore, verify background cache invalidation on booking creation.

---

### 4.4 Phase 3: UI Design Tokens, Component Hierarchy & Performance Tuning

#### Objectives
1. Eliminate all 190+ arbitrary hex values and replace with NativeWind v5 / Tailwind v4 `@theme` semantic tokens in `global.css` (retaining `@import "nativewind/theme";`).
2. Map custom font families to Tailwind `@theme` utility tokens without font weight collisions on Android (`font-heading`, `font-display`, `font-body`).
3. Build a reusable atomic UI component library (`Button`, `Input`, `Card`, `Badge`, `Typography`) using Class Variance Authority (`cva`).
4. Migrate the main pitch feed to `@shopify/flash-list` with calibrated `estimatedItemSize`.
5. Migrate all image rendering to `expo-image` with blurhash placeholders and hardware disk caching.
6. Introduce Reanimated v4.1+ gesture-driven bottom sheets and WCAG-compliant touch targets (min 48x48dp).

#### Concrete Before-and-After Code Patterns

##### Pattern 3.1: CSS-First Design Tokens & NativeWind Configuration (`global.css`)
```css
@import "tailwindcss";
@import "nativewind/theme";

@theme {
    /* Color Palette */
    --color-background: #04060c;
    --color-surface: #070b14;
    --color-surface-elevated: #0d1527;
    --color-card: #070b14;
    --color-card-border: #141d2e;
    --color-primary: #22c55e;
    --color-primary-hover: #16a34a;
    --color-secondary: #60a5fa;
    --color-accent: #22c55e;
    --color-muted: #141d2e;
    --color-muted-foreground: #94a3b8;
    --color-destructive: #ef4444;
    --color-warning: #eab308;
    
    /* Typography Font Families (Pre-weighted for Android Typeface safety) */
    --font-heading: Montserrat_900Black;
    --font-heading-bold: Montserrat_700Bold;
    --font-display: BebasNeue_400Regular;
    --font-body: Montserrat_700Bold;
}
```

##### Pattern 3.2: Reusable CVA Atomic Button Primitive with Android Font Safety (`src/components/ui/Button/Button.tsx`)
```tsx
import React from 'react';
import { Text, ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import * as Haptics from 'expo-haptics';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-xl active:opacity-90',
  {
    variants: {
      variant: {
        primary: 'bg-primary shadow-lg shadow-primary/20',
        secondary: 'bg-surface-elevated border border-card-border',
        outline: 'border border-primary bg-transparent',
        destructive: 'bg-destructive shadow-lg shadow-destructive/20',
        ghost: 'bg-transparent',
      },
      size: {
        sm: 'h-10 px-4',
        md: 'h-12 px-5',
        lg: 'h-14 px-6',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

// Notice: Removed 'font-extrabold' to prevent Android ReactFontManager Typeface lookup clash
const buttonTextVariants = cva('font-heading uppercase tracking-wider text-center', {
  variants: {
    variant: {
      primary: 'text-black',
      secondary: 'text-white',
      outline: 'text-primary',
      destructive: 'text-white',
      ghost: 'text-muted-foreground',
    },
    size: {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
      icon: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export interface ButtonProps
  extends PressableProps,
    VariantProps<typeof buttonVariants> {
  label?: string;
  loading?: boolean;
  children?: React.ReactNode;
  enableHaptics?: boolean;
}

export function Button({
  label,
  loading,
  variant,
  size,
  className,
  children,
  enableHaptics = true,
  onPress,
  disabled,
  ...props
}: ButtonProps) {
  const handlePress = (e: any) => {
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.(e);
  };

  return (
    <Pressable
      className={buttonVariants({ variant, size, className })}
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      hitSlop={8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#000000' : '#22c55e'} size="small" />
      ) : (
        children || (
          <Text className={buttonTextVariants({ variant, size })}>{label}</Text>
        )
      )}
    </Pressable>
  );
}
```

##### Pattern 3.3: High-Performance Pitch Card with `expo-image` & `FlashList`
```tsx
import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { type Venue } from '@/features/venues/schemas/venueSchema';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface PitchCardProps {
  venue: Venue;
}

export const PitchCard = memo(function PitchCard({ venue }: PitchCardProps) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/pitch/[id]', params: { id: venue.id } })}
      className="bg-card border border-card-border rounded-2xl overflow-hidden mb-4 active:opacity-90"
      accessibilityRole="button"
      accessibilityLabel={`View details for ${venue.name}, ${venue.location}`}
    >
      <View className="relative h-48 w-full bg-surface">
        <Image
          source={{ uri: venue.coverImage }}
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          contentFit="cover"
          transition={300}
          cachePolicy="memory-disk"
          className="h-full w-full"
        />
        <View className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex-row items-center space-x-1">
          <Ionicons name="star" size={14} color="#22c55e" />
          <Text className="text-white font-heading text-xs ml-1">{venue.rating.toFixed(1)}</Text>
        </View>
      </View>

      <View className="p-4">
        <Text className="text-white font-heading text-lg mb-1" numberOfLines={1}>
          {venue.name}
        </Text>
        <View className="flex-row items-center mb-3">
          <Ionicons name="location-sharp" size={14} color="#94a3b8" />
          <Text className="text-muted-foreground font-body text-xs ml-1 flex-1" numberOfLines={1}>
            {venue.location}
          </Text>
        </View>

        <View className="flex-row items-center justify-between pt-3 border-t border-card-border">
          <View>
            <Text className="text-muted-foreground text-[10px] uppercase tracking-wider font-body">
              Starting from
            </Text>
            <Text className="text-primary font-display text-xl">
              {venue.pricePerHour} <Text className="text-xs text-white">{venue.currency}/hr</Text>
            </Text>
          </View>
          <View className="bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-lg">
            <Text className="text-primary font-heading text-xs uppercase tracking-wider">
              Book Slot
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});
```

#### Phase 3 Migration Checklist
- [ ] Replace all hardcoded hex classes with semantic `@theme` tokens in `global.css`.
- [ ] Implement CVA UI component library (`Button`, `Input`, `Card`, `Badge`, `Modal`).
- [ ] Replace `react-native.Image` with `expo-image` across all feature components.
- [ ] Replace `FlatList` in `src/features/venues/components/VenueFeed.tsx` with `@shopify/flash-list` (`estimatedItemSize={320}`).
- [ ] Audit touch targets to ensure minimum 48x48dp dimensions and add `accessibilityRole` / `accessibilityLabel`.
- [ ] Verification: Measure frame rate during feed scrolling and confirm steady 60 FPS with zero blank cells.

---

## 5. Cross-Phase Risk Mitigation & Migration Strategy

| Risk Category | Potential Failure Mode | Severity | Mitigation Strategy & Safeguards |
|---|---|---|---|
| **Native Module Incompatibility** | NativeWind v5 preview or `paymob-reactnative` plugin failing on Android prebuild | **High** | Pin `lightningcss` version in package overrides; maintain isolated EAS dev-client build workflows for native verification. |
| **Data Migration & Loss** | Legacy `AsyncStorage` keys failing to parse under new Zod schemas | **High** | Implement `z.preprocess()` backward-compatible migration adapter in `src/features/venues/schemas/venueSchema.ts` that automatically normalizes legacy `address`, `imageUrl`, and `pricing` fields. |
| **State Synchronization Split-Brain** | Storing financial state in both Zustand and TanStack Query leading to divergent balances | **High** | Enforce pure session identifiers in Zustand (`userId`, `token`) and keep all wallet balances, transactions, and user profiles exclusively in TanStack Query. |
| **Android Typography Regressions** | Passing `font-extrabold` alongside custom pre-weighted font families causing Roboto fallback | **Medium** | Ensure Tailwind typography tokens use font utility classes alone without redundant `fontWeight` classes. |
| **FlashList Recycling Bugs** | Component state leaking between recycled list cells | **Medium** | Ensure NO internal `useState` is used for row selection in cell items; pass all selection state down via props from the parent feed container. Never attach `key` prop inside `renderItem`. |
| **Deep Link Route Regressions** | External notifications or QR codes breaking due to route renaming | **Medium** | Retain legacy route wrappers in `src/app/` (e.g. `src/app/pitch/[id].tsx` and `src/app/player-card.tsx` delegating to feature modules). |
| **Theme Token Runtime Drift** | Components rendering unstyled if CSS variables fail resolution | **Low** | Keep `@import "nativewind/theme";` in `global.css` and define fallback hex values in Tailwind `@theme` configuration. |

---

## 6. Comprehensive Verification Commands

To verify the architecture, type safety, and code standards throughout all phases:

```bash
# 1. Type Safety & Route Generation Check
npx tsc --noEmit

# 2. ESLint & Static Analysis Check
npm run lint

# 3. Hardcoded Hex Token Scan (Target: 0 matches)
npx ripgrep "bg-\[#|text-\[#|border-\[#" src/

# 4. Route 'as any' Bypass Scan (Target: 0 matches)
npx ripgrep "as any" src/app/

# 5. Native Image Scan (Ensure 100% expo-image adoption, Target: 0 matches)
npx ripgrep "from ['\"]react-native['\"].*Image\b" src/

# 6. Expo Prebuild & Build Verification
npx expo prebuild --clean
```
