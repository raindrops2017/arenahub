# Adversarial Architectural Challenge & Stress-Test Report

**Author**: Challenger 1 (Adversarial Architectural Verifier)  
**Target Document**: `D:/test-mobile-app/.agents/orchestrator_1/MASTER_ARCHITECTURAL_BLUEPRINT.md`  
**Target Application**: ArenaHub Mobile Client (Expo SDK 54 / React Native 0.81.5 / React 19.1.0 / NativeWind v5)  
**Date**: 2026-08-15  
**Final Verdict**: **REQUEST_CHANGES** (Actionable architectural adjustments and risk mitigations required before execution)

---

## 1. Executive Summary & Overall Risk Assessment

**Overall Risk Assessment**: **HIGH (Mitigable with Specific Architecture Adjustments)**

The Master Architectural Blueprint produced by `orchestrator_1` represents a rigorous, highly sophisticated modernization strategy for the ArenaHub mobile client. It accurately diagnoses the primary architectural deficiencies: 800+ line God components, Context API re-render cascades, lack of server-state caching, plaintext token storage, and missing New Architecture primitives.

However, an exhaustive adversarial stress-test reveals **7 Critical & High runtime failure modes, breaking changes, and state synchronization hazards** that would cause production crashes, silent data corruption, or broken user experiences if implemented verbatim:

1. **Legacy AsyncStorage Zod Parsing Crash (Critical)**: Direct `VenueSchema.parse()` over existing stored JSON will crash 100% of legacy installs due to field name divergence (`coverImage` vs `imageUrls`, `location` vs `address`, `pricePerHour` vs `pricing`).
2. **Dual-State Desynchronization Trap (High)**: Storing `walletBalance` and user profile in Zustand + SecureStore while managing balance queries in TanStack Query creates split-brain state where UI headers show stale financial data.
3. **Android React Native Custom Font Resolution Failure (High)**: Combining `--font-heading: Montserrat_900Black` with `font-extrabold` (`fontWeight: '800'`) causes native Android Typeface lookups to fail and silently fall back to default Roboto.
4. **FlashList Cell Recycling & Native CSS Transition Traps (High)**: Applying web CSS transitions (`transition-transform`, `active:scale-[0.99]`) on native `<Pressable>` fails silently on mobile; dynamic item heights without `getItemType` risk scroll jank.
5. **NativeWind v5 / Tailwind v4 Variable Bridge Breakage (High)**: Omitting `@import "nativewind/theme";` in `global.css` severs CSS variable resolution in React Native StyleSheet.
6. **Deep Linking & Route Deletion Regressions (Medium)**: Omitting `/player-card` from `src/app/` breaks external deep links; throwing unhandled errors in `safeParse` crashes routes instead of showing graceful fallbacks.
7. **Missing Dependency Declarations (Medium)**: CVA primitives in Pattern 3.2 rely on `class-variance-authority`, `clsx`, and `tailwind-merge`, which are absent from `package.json` and the Phase 0 checklist.

---

## 2. Adversarial Challenges & Stress-Test Findings

---

### Challenge 1 (CRITICAL): The Zod Runtime Parsing Trap on Legacy AsyncStorage Data

- **Assumption Challenged**: The blueprint assumes that introducing `VenueSchema` (`Pattern 1.2`) and parsing storage data via `z.array(VenueSchema).parse(data)` (`Pattern 2.1`) is a clean drop-in replacement for existing storage layers.
- **Attack Scenario & Empirical Proof**:
  In the existing codebase:
  1. `services/storageService.ts` stores venues under `app_v1_venues` using the `Venue` type from `types/index.ts`.
  2. The stored JSON contains:
     ```json
     {
       "id": "arena-1",
       "name": "ARENA 1 - Zayed Sports Hub",
       "sportsTypes": ["5-A-SIDE", "7-A-SIDE"],
       "address": "El-Bustan St, Sheikh Zayed City, Giza",
       "pricing": { "defaultPricePerHour": 200, "currency": "EGP" },
       "imageUrls": ["https://images.unsplash.com/..."]
     }
     ```
  3. The proposed `VenueSchema` in `Pattern 1.2` strictly requires:
     - `coverImage: z.string().url()` (Field `coverImage` DOES NOT EXIST in legacy data; legacy used `imageUrls: string[]` or `imageUrl: string`).
     - `location: z.string()` (Field `location` DOES NOT EXIST in `storageService.ts`; legacy used `address`).
     - `pricePerHour: z.number().positive()` (Field `pricePerHour` DOES NOT EXIST at root in `storageService.ts`; legacy used `pricing.defaultPricePerHour`).
     - `sportsTypes: z.array(SportTypeSchema)` (Legacy `mockPitches.ts` used singular `type: '5-A-SIDE'`).

  When `venueQueries.list()` or `venueQueries.detail()` runs `VenueSchema.parse(data)`, Zod will throw an immediate `ZodError`:
  ```
  ZodError: [
    { "code": "invalid_type", "expected": "string", "path": ["location"], "message": "Required" },
    { "code": "invalid_type", "expected": "string", "path": ["coverImage"], "message": "Required" },
    { "code": "invalid_type", "expected": "number", "path": ["pricePerHour"], "message": "Required" }
  ]
  ```
- **Blast Radius**: 100% of existing user sessions, local caches, and initial seed loading will throw unhandled exceptions, crashing into `+error-boundary.tsx` and preventing any venues from ever rendering.
- **Required Mitigation**:
  Implement a **Backward-Compatible Schema Migration Adapter** using `z.preprocess()` or explicit migration functions that seamlessly normalize legacy `Pitch` and `Venue` representations into `VenueSchema`.

```typescript
// ✅ REQUIRED MITIGATION: Backward-Compatible Venue Schema
export const VenueSchema = z.preprocess((val: any) => {
  if (!val || typeof val !== 'object') return val;
  return {
    ...val,
    location: val.location ?? val.address ?? 'Cairo, Egypt',
    address: val.address ?? val.location ?? '',
    coverImage: val.coverImage ?? val.imageUrl ?? val.imageUrls?.[0] ?? 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6',
    imageGallery: val.imageGallery ?? val.imageUrls ?? [],
    pricePerHour: val.pricePerHour ?? val.pricing?.defaultPricePerHour ?? val.defaultHourlyPrice ?? 200,
    sportsTypes: val.sportsTypes ?? (val.type ? [val.type] : ['5-A-SIDE']),
    rating: val.rating ?? 5.0,
    reviewCount: val.reviewCount ?? val.reviewsCount ?? 0,
    amenities: val.amenities ?? val.features ?? [],
    features: val.features ?? val.amenities ?? [],
  };
}, z.object({
  id: z.string(),
  name: z.string().min(1),
  location: z.string(),
  address: z.string().optional(),
  rating: z.number().min(0).max(5).default(5.0),
  reviewCount: z.number().int().nonnegative().default(0),
  sportsTypes: z.array(z.enum(['5-A-SIDE', '7-A-SIDE', '11-A-SIDE', 'PADEL', 'TENNIS'])),
  coverImage: z.string().url(),
  imageGallery: z.array(z.string().url()).default([]),
  pricePerHour: z.number().positive(),
  currency: z.string().default('EGP'),
  amenities: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  surfaceType: z.string().default('FIFA Certified Artificial Grass'),
}));
```

---

### Challenge 2 (HIGH): State Desynchronization Trap — Zustand Auth Store vs TanStack Query Cache

- **Assumption Challenged**: The blueprint proposes storing user financial and profile data (`walletBalance`, `rating`, `name`) inside Zustand's `UserSession` in `useAuthSessionStore` (`Pattern 2.2`), while simultaneously recommending TanStack Query for wallet operations (`useWalletBalance`, `useTransactions`).
- **Attack Scenario & Empirical Proof**:
  1. User logs in. `useAuthSessionStore` saves `user = { id: "cust-1", walletBalance: 500 }` to Zustand and `expo-secure-store`.
  2. User books a pitch costing 200 EGP. `useCreateBooking` executes a TanStack Query mutation, invalidating query key `['wallet']`.
  3. TanStack Query refetches and caches new wallet balance: `300 EGP`.
  4. User navigates back to `HomeScreen` (or `Header`), which subscribes to `useAuthSessionStore((s) => s.user?.walletBalance)`.
  5. The header displays **500 EGP** (stale Zustand state), while the checkout modal displays **300 EGP** (TanStack Query cache).
  6. Furthermore, on Android Keystore, `expo-secure-store` has an atomic key size ceiling of **2048 bytes**. Storing expanding profile JSON payloads in SecureStore risks silent write rejections.
  7. On cold start, `RootLayout` in `Pattern 0.1` never calls `loadStoredSession()`, causing authenticated users to briefly flash unauthenticated before session hydration.
- **Blast Radius**: Split-brain state, stale wallet balances, user confusion, and cold-start auth state desynchronization.
- **Required Mitigation**:
  1. **Strict Separation of Concerns**: Zustand must ONLY hold authentication credentials and token state: `{ token: string | null, userId: string | null, isAuthenticated: boolean, isLoading: boolean }`.
  2. **Single Source of Truth for Domain Data**: All user profile, wallet balance, and transaction data must be queried, mutated, and cached solely via TanStack Query (`userQueries.profile(userId)`, `walletQueries.balance(userId)`).
  3. In `src/app/_layout.tsx`, invoke `useAuthSessionStore.getState().loadStoredSession()` inside the splash screen font-loading effect.

```typescript
// ✅ REQUIRED MITIGATION: Pure Session Store
interface AuthSessionState {
  token: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (token: string, userId: string) => Promise<void>;
  clearSession: () => Promise<void>;
  loadStoredSession: () => Promise<void>;
}
```

---

### Challenge 3 (HIGH): Android React Native Custom Font Resolution Failure

- **Assumption Challenged**: Combining `--font-heading: Montserrat_900Black` with Tailwind font-weight utility classes (`font-extrabold`, `font-bold`) in `Pattern 0.2`, `Pattern 3.2`, and `Pattern 3.3` produces bold custom typography.
- **Attack Scenario & Empirical Proof**:
  In React Native on Android:
  1. `@expo-google-fonts/montserrat` loads typeface files mapped directly to font family identifiers: `Montserrat_900Black`, `Montserrat_700Bold`, `BebasNeue_400Regular`.
  2. In `Pattern 3.2` (line 791):
     `const buttonTextVariants = cva('font-heading font-extrabold uppercase tracking-wider text-center', ...)`
  3. `font-heading` resolves to `fontFamily: "Montserrat_900Black"`.
  4. `font-extrabold` resolves to `fontWeight: "800"`.
  5. On Android, the native Typeface resolution system attempts to load `"Montserrat_900Black-ExtraBold"` or apply synthetic bolding to an already black typeface. Because no such font asset exists in the Android asset catalog, Android's `ReactFontManager` fails to match the typeface and **silently falls back to system default Roboto sans-serif**!
  6. The exact same defect is present in:
     - `Pattern 0.2` (line 389): `<Text className="text-white text-2xl font-extrabold text-center mb-2 font-heading">`
     - `Pattern 3.3` (line 900): `<Text className="text-white font-heading text-lg font-extrabold mb-1">`
- **Blast Radius**: Complete visual typography breakage across all Android devices; app renders plain Roboto instead of Montserrat Black.
- **Required Mitigation**:
  Prohibit combining `font-bold` / `font-extrabold` with custom font family classes that already represent specific weights. Configure `@theme` font tokens to encapsulate family AND weight semantics, and enforce `fontWeight: 'normal'` / `font-normal` whenever a specific weight font is applied.

```css
/* ✅ CORRECTED global.css @theme typography */
@theme {
    --font-heading: Montserrat_900Black;
    --font-heading-bold: Montserrat_700Bold;
    --font-display: BebasNeue_400Regular;
    --font-body: Montserrat_700Bold;
}
```
In JSX / CVA:
```tsx
// ✅ Correct: Do NOT add font-extrabold when using font-heading
const buttonTextVariants = cva('font-heading uppercase tracking-wider text-center', ...);
```

---

### Challenge 4 (HIGH): FlashList Cell Recycling & Native CSS Micro-Interaction Traps

- **Assumption Challenged**: The blueprint proposes replacing `FlatList` with `@shopify/flash-list` and adding web CSS transitions (`active:scale-[0.99] transition-transform`) to `PitchCard` in `Pattern 3.3`.
- **Attack Scenario & Empirical Proof**:
  1. **Web CSS Transition Ineffectiveness**:
     `<Pressable className="... active:scale-[0.99] transition-transform">`
     In React Native, CSS `transition-transform` and `active:scale-[...]` are web CSS properties that do not produce animated transitions on native iOS/Android views. The press micro-interaction either snaps abruptly or fails entirely.
  2. **FlashList Recycling Dimension Jumps**:
     In `Phase 3 checklist`, `estimatedItemSize={320}` is recommended. However, venue cards with multi-line names, dynamic promotional tags, or varying distance strings will have heights between 290px and 360px.
     Without `getItemType` or consistent card dimensions, FlashList recycling causes noticeable scroll blanking and layout jumps during fast fling scrolling on Android.
  3. **Internal State Leaks**:
     If child components inside `FlashList` contain internal `useState` (such as favorite toggles, expanded amenities, or selected date pills), FlashList recycles the underlying native cell view, causing state from row 2 to appear on row 15 during scrolling.
- **Blast Radius**: Broken micro-interactions, scroll stutter, and state leakage across list rows.
- **Required Mitigation**:
  1. Use React Native `Pressable` style function `({ pressed }) => [...]` or `react-native-reanimated` with `useAnimatedStyle` for press micro-interactions.
  2. Explicitly enforce that all cell components (`PitchCard`) are 100% controlled via props with ZERO internal selection state.
  3. Provide calibrated `estimatedItemSize={330}` with strict container height constraints.

```tsx
// ✅ CORRECTED PitchCard Press Feedback
export const PitchCard = memo(function PitchCard({ venue }: PitchCardProps) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/pitch/[id]', params: { id: venue.id } })}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      className="bg-card border border-card-border rounded-2xl overflow-hidden mb-4"
      accessibilityRole="button"
      accessibilityLabel={`View details for ${venue.name}, ${venue.location}`}
    >
      {/* Card Content */}
    </Pressable>
  );
});
```

---

### Challenge 5 (HIGH): NativeWind v5 / Tailwind CSS v4 CSS Variable Resolution Breakage

- **Assumption Challenged**: Pattern 3.1 specifies `global.css` starting with `@import "tailwindcss";` without `@import "nativewind/theme";`.
- **Attack Scenario & Empirical Proof**:
  In NativeWind v5 preview (`nativewind@^5.0.0-preview.4` + `tailwindcss@^4.3.3` + `react-native-css`):
  1. The current working project's `global.css` explicitly imports:
     ```css
     @import "tailwindcss/theme.css" layer(theme);
     @import "tailwindcss/preflight.css" layer(base);
     @import "tailwindcss/utilities.css";
     @import "nativewind/theme";
     ```
  2. Removing `@import "nativewind/theme";` severs NativeWind's custom CSS variable bridge. When classes like `bg-background`, `bg-surface`, or `text-primary` are processed, Tailwind v4 outputs CSS variables (`var(--color-background)`), which React Native's native style engine cannot resolve.
  3. Consequently, screens render with transparent backgrounds, white unreadable text on white screens, or crash Metro bundler during CSS asset compilation.
- **Blast Radius**: Complete CSS theme failure and unstyled screens across both iOS and Android.
- **Required Mitigation**:
  Preserve `@import "nativewind/theme";` in `global.css` and maintain the pinned `lightningcss: "1.30.1"` override in `package.json`.

---

### Challenge 6 (MEDIUM): Deep Linking & Expo Router Route Regressions

- **Assumption Challenged**: Reorganizing routes into `src/app/(tabs)/...` and `src/app/pitch/[id].tsx` retains compatibility with existing deep links and route parameters.
- **Attack Scenario & Empirical Proof**:
  1. **Route Deletion Regression (`/player-card`)**:
     In the target directory structure (`lines 430–447`), `player-card.tsx` has been moved to `features/passport/` but has NO route wrapper in `src/app/`!
     Any user opening the app via `testmobileapp://player-card`, pushing `/player-card`, or restoring a deep link will hit `+not-found.tsx`.
  2. **Unhandled Route Parameter Exception**:
     In `Pattern 1.1` (`PitchDetailsRoute`):
     ```typescript
     const RouteParamsSchema = z.object({
       id: z.string().min(1, 'Venue ID is required'),
     });
     export default function PitchDetailsRoute() {
       const params = useLocalSearchParams();
       const parsed = RouteParamsSchema.safeParse(params);
       if (!parsed.success) {
         throw new Error('Invalid venue route parameters');
       }
       return <PitchDetailsContainer venueId={parsed.data.id} />;
     }
     ```
     If an external intent opens `testmobileapp://pitch/` without an ID, or with unexpected array params (`params = { id: ["1", "2"] }`), `safeParse` fails and **throws a runtime Error directly in the component render phase**. This unmounts the screen and throws the user into the full-screen Global Error Boundary instead of showing an inline empty state or redirecting.
- **Blast Radius**: Broken deep links for `/player-card` and hard crash boundaries on malformed external URLs.
- **Required Mitigation**:
  1. Retain `src/app/player-card.tsx` as a thin route segment delegating to `<PlayerCardScreen />`.
  2. Make route parameter schemas resilient to array inputs (`z.union([z.string(), z.array(z.string()).transform(a => a[0])])`) and render a graceful `<VenueNotFound />` fallback UI instead of throwing unhandled exceptions.

```typescript
// ✅ CORRECTED PitchDetailsRoute
const RouteParamsSchema = z.object({
  id: z.union([
    z.string().min(1),
    z.array(z.string()).min(1).transform((arr) => arr[0]),
  ]),
});

export default function PitchDetailsRoute() {
  const params = useLocalSearchParams();
  const parsed = RouteParamsSchema.safeParse(params);

  if (!parsed.success || !parsed.data.id) {
    return <VenueNotFoundState onGoBack={() => router.replace('/')} />;
  }

  return <PitchDetailsContainer venueId={parsed.data.id} />;
}
```

---

### Challenge 7 (MEDIUM): Missing Dependency Declarations in Checklists

- **Assumption Challenged**: The Phase 0 installation checklist (`npx expo install @tanstack/react-query zod expo-secure-store`) includes all necessary packages for the proposed architecture.
- **Attack Scenario & Empirical Proof**:
  1. `Pattern 3.2` introduces CVA-based primitives:
     `import { cva, type VariantProps } from 'class-variance-authority';`
  2. Neither `class-variance-authority`, `clsx`, nor `tailwind-merge` are present in `package.json` or listed in the Phase 0 checklist.
  3. When developers implement Phase 3 or run `npx tsc --noEmit`, the build fails immediately with `Cannot find module 'class-variance-authority'`.
- **Blast Radius**: TypeScript compilation failures and blocked CI/CD pipelines.
- **Required Mitigation**:
  Add `class-variance-authority`, `clsx`, and `tailwind-merge` to the Phase 0 dependency installation command.

---

### Challenge 8 (MEDIUM): Android 15 Edge-to-Edge Safe Area Bottom Collisions

- **Assumption Challenged**: Placing `<SafeAreaProvider>` in root layout automatically prevents layout overlap on Android 15.
- **Attack Scenario & Empirical Proof**:
  Under Android 15 with `edgeToEdgeEnabled: true` (configured in `app.json`), the system navigation gesture bar is 100% transparent and floats directly over the bottom of the window.
  If screens or bottom sheet modals (e.g. `BookingCheckoutModal`, `PitchDetailsScreen` booking footer) use fixed bottom padding (e.g. `pb-4`), the primary action button ("Confirm Booking - 200 EGP") will be partially covered by the Android gesture pill, causing missed taps and accidental home gesture triggers.
- **Blast Radius**: Touch target occlusion and degraded UX on modern Android devices.
- **Required Mitigation**:
  Enforce that all fixed bottom action bars, modals, and sticky footers consume `useSafeAreaInsets().bottom` dynamically: `style={{ paddingBottom: Math.max(insets.bottom, 16) }}`.

---

### Challenge 9 (LOW): Residual Hardcoded Hex Tokens in Blueprint Code Examples

- **Observation**:
  In `Pattern 3.3` (PitchCard), the blueprint uses hardcoded hex colors:
  - `<Ionicons name="star" size={14} color="#22c55e" />`
  - `<Ionicons name="location-sharp" size={14} color="#94a3b8" />`
  This contradicts Objective 1 of Phase 3 ("Eliminate all 190+ arbitrary hex values").
- **Mitigation**:
  Create a typed design token constant map (`src/constants/theme.ts`) that exports semantic colors (`colors.primary`, `colors.mutedForeground`) for use in non-CSS props (such as icon color attributes and ActivityIndicator).

---

## 3. Stress-Test Verification Matrix

| Stress-Test Scenario | Input / Trigger | Expected Blueprint Behavior | Actual / Predicted Behavior | Result | Required Patch |
|---|---|---|---|---|---|
| **ST-1: Legacy Storage Hydration** | Existing app with `app_v1_venues` in AsyncStorage | Venues load seamlessly into feed | `ZodError: Required fields missing` -> Crash | **FAIL** | Add `z.preprocess()` migration adapter |
| **ST-2: Wallet Mutation Sync** | Booking created costing 200 EGP | Wallet updates on both home and checkout | Zustand `user.walletBalance` remains stale | **FAIL** | Move wallet state exclusively to TanStack Query |
| **ST-3: Android Typography** | Render `font-heading font-extrabold` on Android | Bold Montserrat Black text | Silent fallback to system Roboto | **FAIL** | Remove `font-extrabold` from custom font utilities |
| **ST-4: Deep Link Resolution** | Open `testmobileapp://player-card` | Navigate to Player Card screen | Route 404 / `+not-found.tsx` | **FAIL** | Add `src/app/player-card.tsx` route wrapper |
| **ST-5: Malformed Deep Link** | Open `testmobileapp://pitch/` | Polite fallback UI | Component throws unhandled Error | **FAIL** | Safe parse with fallback UI in route wrapper |
| **ST-6: CVA Primitive Build** | Import `cva` in `Button.tsx` | Clean TypeScript compilation | `Cannot find module 'class-variance-authority'` | **FAIL** | Add `class-variance-authority` to Phase 0 packages |
| **ST-7: NativeWind CSS Variable Bridge** | Apply `bg-background` with bare `@import "tailwindcss"` | Background color `#04060c` | Unresolved `var()` -> Transparent | **FAIL** | Include `@import "nativewind/theme"` in `global.css` |
| **ST-8: Android 15 Sticky Footer** | Open booking modal on Android 15 device | CTA button fully visible above gesture bar | CTA button clipped by Android gesture bar | **FAIL** | Apply `useSafeAreaInsets().bottom` to modal footers |

---

## 4. Unchallenged Areas (Verified Robust)

The following architectural recommendations in the Master Blueprint were analyzed and verified to be sound, modern, and compliant with Expo SDK 54 / React 19 standards:

1. **Feature-Sliced Design Directory Structure (`src/features/*`)**: The domain decomposition into `auth`, `venues`, `bookings`, `wallet`, and `passport` is clean, highly scalable, and resolves the 6-directory sprawl.
2. **TanStack Query v5 Key Factories (`queryOptions`)**: The hierarchical `venueKeys` and `venueQueries` structure follows TanStack Query v5 best practices, enabling type-safe cache invalidation and query deduplication.
3. **Expo SDK 54 Native Lifecycle Synchronization**: Using `SplashScreen.preventAutoHideAsync()`, `SystemUI.setBackgroundColorAsync()`, and wrapping the tree with `<GestureHandlerRootView style={{ flex: 1 }}>` and `<SafeAreaProvider>` eliminates cold-start flashes and Android New Architecture gesture crashes.
4. **Hardware-Accelerated Image Pipeline**: Adopting `expo-image` with blurhash placeholders, `contentFit="cover"`, and `cachePolicy="memory-disk"` resolves memory bloat and scroll jank from standard `react-native.Image`.
5. **Decoupled API Client & Environment Variables**: Moving Paymob keys from hardcoded source to `EXPO_PUBLIC_PAYMOB_PUBLIC_KEY` with an interceptor-based `apiClient` eliminates critical security vulnerabilities.

---

## 5. Required Roadmap & Blueprint Adjustments

To achieve full production readiness, the Master Blueprint must incorporate the following modifications:

1. **Update Phase 0 Dependency Checklist**:
   ```bash
   npx expo install @tanstack/react-query zod expo-secure-store
   npm install class-variance-authority clsx tailwind-merge
   ```
2. **Update Phase 1 Schema Definition**:
   Replace rigid `VenueSchema` with the preprocessed, backward-compatible migration schema in `src/features/venues/schemas/venueSchema.ts`. Include `src/app/player-card.tsx` in the route structure.
3. **Update Phase 2 State Architecture**:
   Strip domain data (`walletBalance`, `rating`, `name`) out of `useAuthSessionStore`. Restrict Zustand strictly to `{ token, userId, isAuthenticated, isLoading }`. Direct all balance reads to `useWalletBalance()` via TanStack Query.
4. **Update Phase 3 Styling & Typography**:
   Ensure `global.css` retains `@import "nativewind/theme"`. Prohibit `font-extrabold` / `font-bold` modifiers on `font-heading` elements. Use `style={({ pressed }) => ...}` for press micro-interactions.
5. **Update Phase 3 Layout Standards**:
   Mandate `useSafeAreaInsets().bottom` on all sticky footers, bottom sheets, and floating buttons to guarantee Android 15 edge-to-edge compliance.

---
