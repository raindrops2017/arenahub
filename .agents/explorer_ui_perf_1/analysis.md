# Comprehensive Codebase Audit: UI/UX, Performance & Expo SDK 54 Architecture

**Auditor**: Explorer 2 (UI, Performance & SDK 54 Explorer)  
**Workspace**: `D:/test-mobile-app`  
**Date**: 2026-08-15  
**Audit Scope**: Client-side application (`app/`, `components/`, `context/`, `services/`, `data/`, `types/`, root configurations, assets).  
**Strict Exclusion**: Backend servers (`server/`, `nest-server/`).

---

## 1. Executive Summary

This in-depth audit investigates the client-side codebase of the ArenaHub mobile application across three architectural dimensions:
- **Dimension 4: UI/UX Consistency, NativeWind v5 Styling & Animations**
- **Dimension 5: Performance, Memory & Resource Optimization**
- **Dimension 6: Expo SDK 54 Conventions & Deprecation Avoidance**

### Key High-Level Findings:
1. **Styling & Design Tokens**: While NativeWind v5 (`^5.0.0-preview.4`) and Tailwind CSS v4 (`^4.3.3`) are installed with `@theme` tokens declared in `global.css`, the codebase suffers from severe **token abandonment**. Over 190 instances of hardcoded arbitrary hex colors (e.g. `bg-[#04060c]`, `bg-[#070b14]`, `text-[#22c55e]`, `border-[#141d2e]`) and inline font style overrides (`style={{ fontFamily: "Montserrat_900Black" }}`) permeate screens and components. This completely disables system dark/light mode switching, bloats runtime CSS class generation, and eliminates theme consistency.
2. **Animation Inactivity & UI Primitives**: `react-native-reanimated` (`~4.1.1`) is installed in `package.json` but **completely unused across the entire codebase** (zero imports). Animations are either absent or anti-patterned (e.g., using web CSS class `transition-all duration-300` on native Views, which has no effect in React Native). The app lacks reusable atomic design primitives (no `<Button>`, `<Card>`, `<Input>`, `<Badge>`, `<Typography>`, or `<BottomSheet>` components).
3. **List Virtualization & Image Performance**: The app relies on unoptimized standard React Native `FlatList` without `@shopify/flash-list` view recycling. Most critically, while `expo-image` (`~3.0.11`) is installed in `package.json`, it is **never imported anywhere**; all screens use standard `react-native.Image`, discarding hardware decoding, progressive blurhash placeholders, and persistent multi-tier disk caching for remote stadium imagery.
4. **React 19 & Re-render Cascades**: Despite `"reactCompiler": true` being enabled in `app.json`, unmemoized context values (`AuthContext.Provider` value object instantiated inline) and inline list callbacks (`renderPitchCard` in `app/index.tsx`) cause complete component subtree re-renders on every state update.
5. **Expo SDK 54 & Architecture Compliance**: Critical SDK 54 lifecycle and layout requirements are breached:
   - `expo-splash-screen` is configured in `app.json` but never controlled in `app/_layout.tsx`, causing blank dark-screen flashes during font loading.
   - `GestureHandlerRootView` is missing from `app/_layout.tsx`, breaking gesture handlers on Android.
   - Dual status bar management (declarative `expo-status-bar` in `_layout.tsx` vs imperative `react-native.StatusBar` in every screen) causes conflicting screen transitions.
   - Static `Dimensions.get("window")` at module scope breaks responsiveness on foldables, tablets, and orientation changes.
   - Typed routes (`experiments.typedRoutes: true`) are systematically bypassed using `as any` casting across navigation calls.

---

## 2. Dimension 4: UI/UX Consistency, NativeWind v5 Styling & Animations

### 4.1 Theme Token Abandonment vs. Hardcoded Hex Values

#### Observation
In `global.css` (lines 7–20), semantic design tokens are configured in the Tailwind v4 `@theme` block:
```css
@theme {
    --color-background: #04060c;
    --color-surface: #070b14;
    --color-card: #070b14;
    --color-muted: #141d2e;
    --color-muted-foreground: #94a3b8;
    --color-primary: #22c55e;
    --color-accent: #22c55e;
    --color-secondary: #60a5fa;
    --color-text-primary: #ffffff;
    --color-text-secondary: #cbd5e1;
    --color-border: rgba(255, 255, 255, 0.12);
    --color-card-border: #141d2e;
}
```
However, a filesystem scan reveals **190+ occurrences** of hardcoded arbitrary hex values in `className` strings and inline style objects across `app/` and `components/`.

#### Evidence Chain:
- `app/_layout.tsx:19,25,30`: `bg-[#04060c]`, `backgroundColor: "#04060c"` instead of `bg-background`.
- `app/index.tsx:38,41,51,61,85,99,110,130,147,161,174,178,191,226,227,237,261`: Extensive arbitrary classes `bg-[#04060c]`, `bg-[#070b14]`, `border-[#141d2e]`, `border-[#22c55e]/40`, `text-[#22c55e]`, `text-[#60a5fa]`.
- `app/pitch/[id].tsx:272,290,342,364,401,402,407,415,423,459,463,464,473,517,518,523,536,537,555,556,581,595,601,606,608,619,623,638,640,642,651,656,663,674,681,688,703,712,715,742,753,763,765,777,791`: 50+ instances of `#04060c`, `#070b14`, `#060a12`, `#141d2e`, `#22c55e`, `#60a5fa`, `#ef4444`, `#eab308`.
- `app/player-card.tsx:19,26,40,42,62,64,69,71,81,83,86,95,97`: Repeated `#04060c`, `#070b14`, `#22c55e`, `#60a5fa`.
- `app/profile.tsx:107,114,128,130,139,141,144,149,150,168,173,189,195,196,219,220,245,246,276,292,293,303,328,329,339,356,366,387,392,404,414,427,439,443,453,457`: 38+ hardcoded hex occurrences.
- `app/(auth)/login.tsx:36,49,55,60,67,68,69,74,108,109,115,122,133,134,140,147,162,176,198,202,206`.
- `app/(auth)/verify.tsx:81,94,100,114,130,132,133,149,153,157,164,170`.
- `app/(auth)/profile-setup.tsx:47,59,64,69,93,96,131,132,142,156,160,164`.
- `components/AdBannerCarousel.tsx:108,123,126,157,165,183,199,201,202,219,223`.
- `components/FifaCardDisplay.tsx:58,88,96,103,111,125,127,146,158,161,167,170,177,180,186,192,195,200,203,209,212,220`.

#### Technical Rationale & Impact
1. **Broken Theme Switching**: Although `app.json` has `"userInterfaceStyle": "automatic"`, dark/light theme switching cannot work because colors are static hex strings in className templates.
2. **CSS Runtime Overhead**: In NativeWind v5 / `react-native-css`, each distinct arbitrary class (`bg-[#070b14]`, `border-[#22c55e]/40`, `bg-[#060a12]`) forces the runtime compiler to evaluate and cache a dedicated style rule instead of referencing standard utility classes (`bg-card`, `border-primary/40`, `bg-surface`).
3. **Fragility & Drift**: Changing brand accents or surface shades requires modifying hundreds of lines across 12+ files rather than adjusting a single token variable in `global.css`.

---

### 4.2 Typography & Font Token Abstraction

#### Observation
Custom fonts are loaded in `app/_layout.tsx` (lines 6–7, 11–16):
- `Montserrat_700Bold`, `Montserrat_800ExtraBold`, `Montserrat_900Black`
- `BebasNeue_400Regular`

Throughout all screens and components, font styling is applied imperatively via inline styles:
- `style={{ fontFamily: "Montserrat_900Black" }}` (repeated 38+ times)
- `style={{ fontFamily: "Montserrat_800ExtraBold" }}` (repeated 26+ times)
- `style={{ fontFamily: "Montserrat_700Bold" }}` (repeated 29+ times)
- `style={{ fontFamily: "BebasNeue_400Regular" }}` (repeated 12+ times)

#### Technical Rationale & Impact
- **Loss of Tailwind Ergonomics**: Developers must mix `className` and `style={{ fontFamily: ... }}` on almost every single `<Text>` node.
- **No Font Token Hierarchy**: Tailwind v4 supports custom font family utility mappings directly in `@theme` (e.g. `--font-display: BebasNeue_400Regular;`, `--font-heading: Montserrat_900Black;`, `--font-body: Montserrat_700Bold;`), allowing clean usage like `className="font-heading text-xl text-primary"`.
- **Lack of Text Primitives**: There is no typography component (e.g. `<Heading>`, `<Body>`, `<Label>`) encapsulating font family, letter spacing, uppercase transformations, and accessibility scaling.

---

### 4.3 Missing Animations & Reanimated Inactivity

#### Observation
1. In `package.json:41`, `"react-native-reanimated": "~4.1.1"` is installed.
2. A search for `react-native-reanimated`, `useSharedValue`, `useAnimatedStyle`, `withTiming`, `withSpring`, or `Animated` across `app/` and `components/` yields **zero imports**.
3. In `components/AdBannerCarousel.tsx:182`, the pagination dot indicator attempts to animate using web CSS classes:
   ```tsx
   className={`h-1.5 rounded-full transition-all duration-300 ${isSelected ? "w-6 bg-[#22c55e]" : "w-1.5 bg-white/20"}`}
   ```
   In React Native, CSS transitions like `transition-all duration-300` are **ignored** by native rendering engines unless driven by Reanimated or layout animation presets.
4. Modal sheets (`FifaPlayerCardModal.tsx`, `DetailsScreen` booking ticket modal, `AdBannerCarousel` info modal) use React Native's default `<Modal animationType="fade">` with zero swipe-to-dismiss gesture handling, rubber-banding, or spring physics.

#### Technical Rationale & Impact
- Underutilized dependencies: Reanimated adds binary footprint to the bundle without providing any interactive benefit.
- Degraded UX: Taps on cards, filter pills, date selectors, and time slot grids lack tactile spring feedback, micro-interactions, or fluid layout animations.

---

### 4.4 Component Abstraction & Atomic Design Void

#### Observation
The codebase suffers from extreme "God Component" sprawl with zero atomic UI primitives:
- `app/pitch/[id].tsx` contains **803 lines** in a single file combining date selection, time slot grid, payment method picker, Paymob SDK lifecycle, QR rendering, ticket modal, and failure modal.
- `app/profile.tsx` contains **474 lines** combining avatar management, personal info inputs, playing position picker, preferred foot selector, push notification switches, and modal triggers.
- `components/` contains only 4 specialized widgets (`AdBannerCarousel.tsx`, `FifaCardDisplay.tsx`, `FifaPlayerCardModal.tsx`, `QRCodeWidget.tsx`).

There are **zero reusable base components** in `components/`:
- **No `<Button>`**: Every screen duplicates raw `<TouchableOpacity className="w-full bg-[#22c55e] py-4 rounded-2xl flex-row items-center justify-center shadow-lg" activeOpacity={0.85}>` with hardcoded text and loading spinners.
- **No `<Input>` / `<TextField>`**: Input containers, icon adornments, focus borders, and placeholder text colors are copy-pasted in `login.tsx`, `verify.tsx`, `profile-setup.tsx`, and `profile.tsx`.
- **No `<Card>` / `<Surface>`**: Card styles (`bg-[#070b14] border border-[#141d2e] rounded-2xl p-4`) are duplicated across all screens.
- **No `<Badge>` / `<Chip>`**: Category tabs, pitch feature badges, and slot pills repeat identical badge styling logic.

---

### 4.5 Responsive Layout Fragility (Module-Level Dimensions)

#### Observation
In `components/AdBannerCarousel.tsx:19` and `components/FifaCardDisplay.tsx:6`:
```tsx
// AdBannerCarousel.tsx:19
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CAROUSEL_WIDTH = SCREEN_WIDTH - 40;
const CAROUSEL_HEIGHT = 160;

// FifaCardDisplay.tsx:6
const { width } = Dimensions.get("window");
```

#### Technical Rationale & Impact
- Calling `Dimensions.get("window")` at top-level module evaluation executes once when the JavaScript file is imported.
- If the device changes orientation (portrait to landscape), enters split-screen / multi-window multitasking on Android / iPadOS, or unfolds on foldable devices, `SCREEN_WIDTH` and `width` become **stale and inaccurate**, causing layout truncation, broken snapping intervals (`snapToInterval={CAROUSEL_WIDTH + 12}`), and misaligned cards.
- **Remediation**: Must use React Native's reactive `useWindowDimensions()` hook inside the component function body.

---

### 4.6 Touch Targets & Accessibility Vacuum

#### Observation
A scan for accessibility attributes (`accessibilityRole`, `accessibilityLabel`, `accessibilityHint`, `accessible`) across `app/` and `components/` returns **zero matches**.

#### Critical Vulnerabilities:
1. **Icon-Only Touch Targets**: Back buttons (`<Ionicons name="arrow-back" />`), share buttons, favorite/heart buttons, trophy modal triggers, and close modal icons have no `accessibilityLabel` or `accessibilityRole="button"`. Screen readers (VoiceOver, TalkBack) announce them only as generic unlabelled elements.
2. **Small Touch Targets Without HitSlop**:
   - Header action buttons (`h-10 w-10`, 40×40dp) are below the WCAG 2.2 Level AA standard of **44×44pt (iOS)** and **48×48dp (Android)**.
   - Date picker right-chevron pill (`w-10 h-16`, `pitch/[id].tsx:433`) and FIFA card close icon (`FifaPlayerCardModal.tsx:28`) lack `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}`.
3. **Form Inputs**: Phone inputs, OTP digit boxes, and profile fields lack `accessibilityLabel`, `accessibilityLiveRegion`, and descriptive error announcements for screen readers.

---

## 3. Dimension 5: Performance, Memory & Resource Optimization

### 5.1 React 19 Compiler Readiness & Unnecessary Re-renders

#### Observation
In `app.json:47`, `"reactCompiler": true` is enabled under `experiments`. However, the current code violates multiple Rules of React and memoization patterns:

1. **Context Provider Inline Value Object**:
   In `context/AuthContext.tsx:183–201`:
   ```tsx
   <AuthContext.Provider
     value={{
       isAuthenticated,
       user,
       pendingBooking,
       authPhone,
       authMethod,
       setAuthPhoneAndMethod,
       verifyOTP,
       loginWithPhone,
       completeProfile,
       updateProfile,
       setPendingBooking,
       logout,
     }}
   >
     {children}
   </AuthContext.Provider>
   ```
   The `value` prop is an inline object literal instantiated anew on every render. Because `AuthContext` bundles high-frequency form state (`authPhone`, `authMethod`) with root auth state (`user`, `isAuthenticated`), typing a single phone digit in `LoginScreen` updates `authPhone`, regenerating the `value` reference and triggering full re-renders of all subscribing screens (`HomeScreen`, `DetailsScreen`, `PlayerCardScreen`, `ProfileScreen`).
2. **Unmemoized List Callbacks**:
   In `app/index.tsx:33–143`, `renderPitchCard` is declared as an inline function inside the `HomeScreen` component body without `useCallback`. When `selectedCategory` or auth status updates, `renderPitchCard` reference changes, forcing `FlatList` to re-render all visible pitch cards.
3. **Unmemoized Array Filtering**:
   In `app/index.tsx:29`:
   ```tsx
   const filteredPitches = MOCK_PITCHES.filter((pitch) =>
     selectedCategory === "ALL" ? true : pitch.type === selectedCategory
   );
   ```
   Executed on every render cycle without `useMemo`.
4. **Dead / Orphaned State Allocation**:
   In `app/index.tsx:27,270–276`, `const [showFifaCardModal, setShowFifaCardModal] = useState<boolean>(false);` allocates state and mounts `FifaPlayerCardModal`, but `setShowFifaCardModal(true)` is never invoked anywhere in `HomeScreen` (lines 173 and 189 navigate to `/player-card` instead).

---

### 5.2 List Virtualization: FlashList vs FlatList

#### Observation
1. In `app/index.tsx:249–267`, the primary pitch feed is rendered using standard React Native `FlatList`.
2. In `components/AdBannerCarousel.tsx:93–171`, promotional banners are rendered using standard `FlatList`.
3. `@shopify/flash-list` is **not installed** in `package.json`.

#### Technical Bottlenecks in Current FlatList Usage:
1. **Missing `getItemLayout`**: Without `getItemLayout`, `FlatList` cannot pre-calculate item offsets on the native thread. It dynamically measures every card on layout, causing frame drops and blank render flashes during fast fling scrolls.
2. **No View Recycling**: Standard `FlatList` creates and destroys native view hierarchies as items leave the window. `@shopify/flash-list` recycles underlying native view cells, reducing UI thread memory usage by up to 80% and maintaining steady 60/120 FPS on Android devices.
3. **`scrollToIndex` Crash Vulnerability**: In `AdBannerCarousel.tsx:50`, `flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true })` is called inside an auto-rotation timer without an `onScrollToIndexFailed` error handler and without `getItemLayout`. If the list is not fully laid out or index calculation desynchronizes, this causes an uncaught native exception on Android.

---

### 5.3 Image Caching & Memory Bloat: `expo-image` vs `react-native.Image`

#### Observation
`package.json:25` includes `"expo-image": "~3.0.11"`. However:
- `app/index.tsx:7,42`: `import { Image } from "react-native";`
- `app/pitch/[id].tsx:5,282`: `import { Image } from "react-native";`
- `components/AdBannerCarousel.tsx:5,111`: `import { Image } from "react-native";`
- `components/FifaCardDisplay.tsx:2,120`: `import { Image } from "react-native";`

**Zero files import or use `expo-image`.**

#### Performance & Memory Impact:
| Capability | React Native `Image` (Current) | `expo-image` (Target) |
|---|---|---|
| **Multi-Tier Disk & Memory Caching** | Limited OS HTTP cache | Dedicated LRU memory cache + persistent disk cache |
| **Progressive Placeholders** | None (blank until loaded) | Native Blurhash / Thumbhash instant placeholder support |
| **Decoding Engine** | Default platform decoder | Hardware-accelerated Glide (Android) & SDWebImage (iOS) |
| **Cross-Dissolve Transitions** | None (abrupt pop-in) | Native cross-dissolve animation (`transition={300}`) |
| **Memory Footprint** | Retains uncompressed bitmaps | Automatic downsampling & memory recycling |

Because the application downloads high-resolution Unsplash stadium and banner images (1200px wide, e.g. `https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=1200`), using standard `Image` causes heavy RAM consumption, image flicker on scroll, and unnecessary network re-fetches.

---

### 5.4 Asset Bundling & Dynamic Calculation Overhead

#### Observation
1. **Root Directory Asset Clutter**:
   - `Mbappe_231747-1.png` (157 KB) and `gpt-image-2_...jpg` (154 KB) reside directly in the project root folder `D:/test-mobile-app/` rather than organized under `assets/images/` or static CDN storage.
2. **Template Leftovers**: Default Expo template icons (`assets/images/react-logo*.png`, `partial-react-logo.png`) remain in `assets/images/`.
3. **Dynamic QR Code Runtime Overhead**:
   In `components/QRCodeWidget.tsx:22–97`, a 21×21 QR matrix is computed imperatively on every render using nested loops and string concatenation (`pathString += M...`) without `useMemo`.

---

## 4. Dimension 6: Expo SDK 54 Conventions & Deprecation Avoidance

### 4.1 Expo Router Conventions & Typed Routes Violation

#### Observation
`app.json:46` enables `"typedRoutes": true`. However, route navigation across the codebase systematically uses `as any` casting:
- `app/index.tsx:173`: `router.push("/player-card" as any)`
- `app/index.tsx:186`: `router.push("/(auth)/login" as any)`
- `app/index.tsx:188`: `router.push("/player-card" as any)`
- `app/pitch/[id].tsx:250`: `router.push({ pathname: "/(auth)/login" as any })`
- `app/player-card.tsx:39`: `router.push("/profile" as any)`
- `app/player-card.tsx:79`: `router.push("/profile" as any)`
- `app/profile.tsx:89`: `router.replace("/" as any)`
- `app/(auth)/login.tsx:31`: `router.push({ pathname: "/(auth)/verify" as any })`
- `app/(auth)/verify.tsx:67`: `router.replace({ pathname: "/pitch/[id]", params: { id: pendingBooking.pitchId } } as any)`
- `app/(auth)/verify.tsx:69`: `router.replace("/" as any)`
- `app/(auth)/verify.tsx:72`: `router.push({ pathname: "/(auth)/profile-setup" as any })`
- `app/(auth)/profile-setup.tsx:39`: `router.replace({ pathname: "/pitch/[id]", params: { id: pendingBooking.pitchId } } as any)`
- `app/(auth)/profile-setup.tsx:41`: `router.replace("/" as any)`

#### Missing Special Route Files:
- Missing `app/+error-boundary.tsx`: Uncaught rendering errors crash the app without a fallback UI.
- Missing `app/+not-found.tsx`: Deep-linking to an invalid route displays a default unstyled 404 screen.

---

### 4.2 Splash Screen & Font Loading Lifecycle Anti-pattern

#### Observation
`app.json:32–43` configures the `"expo-splash-screen"` plugin:
```json
[
  "expo-splash-screen",
  {
    "image": "./assets/images/splash-icon.png",
    "imageWidth": 200,
    "resizeMode": "contain",
    "backgroundColor": "#ffffff",
    "dark": { "backgroundColor": "#000000" }
  }
]
```
However, in `app/_layout.tsx` (lines 10–20):
```tsx
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Montserrat_900Black,
    BebasNeue_400Regular,
  });

  if (!fontsLoaded) {
    return <View className="flex-1 bg-[#04060c]" />;
  }
  // ...
}
```

#### Technical Defect:
1. `SplashScreen.preventAutoHideAsync()` is **never called** at module scope.
2. `SplashScreen.hideAsync()` is **never called** when fonts load.
3. Returning `<View className="flex-1 bg-[#04060c]" />` prematurely hides the native splash screen and displays a blank dark screen while fonts parse.
4. `useFonts` returns `[loaded, error]`. In the current code, `error` is unhandled. If font loading fails, `fontsLoaded` remains `false`, permanently locking the application on a blank screen.

---

### 4.3 Missing `GestureHandlerRootView` & New Architecture Compatibility

#### Observation
1. In `package.json:40`, `"react-native-gesture-handler": "~2.28.0"` is installed.
2. In `app/_layout.tsx`, the root layout wraps children in `<SafeAreaProvider>`, `<AuthProvider>`, and `<View>`, but **omits `<GestureHandlerRootView style={{ flex: 1 }}>`**.

#### Technical Risk:
In React Native 0.81+ with New Architecture (`"newArchEnabled": true` in `app.json`), gesture handlers (swipeable items, pinch/pan gestures, bottom sheets, sliders) fail to attach on Android and throw fatal crashes or silently ignore touch gestures without `GestureHandlerRootView` wrapping the root component.

---

### 4.4 Inconsistent Edge-to-Edge & Safe Area Inset Management

#### Observation
In `app.json:21`, `"edgeToEdgeEnabled": true` is configured for Android. However, screen layouts handle insets inconsistently:
- `app/index.tsx:146–149`: `<SafeAreaView edges={["top", "left", "right"]}>` wrapping the screen, but then calls `const insets = useSafeAreaInsets();` and adds `paddingBottom: Math.max(insets.bottom + 80, 100)` to `FlatList`.
- `app/pitch/[id].tsx:272`: Uses standard `<View>`, calculates `paddingTop: Math.max(insets.top + 6, 16)` for the header, and `paddingBottom: Math.max(insets.bottom + 12, 20)` for the fixed footer.
- `app/(auth)/login.tsx:35–38`, `verify.tsx`, `profile-setup.tsx`: Uses `<SafeAreaView edges={["top", "left", "right", "bottom"]}>` with internal `paddingBottom: 40`.

#### Technical Defect:
Mixing `<SafeAreaView>` containers with manual `insets.bottom` padding creates **double bottom spacing** on Android 15 edge-to-edge gesture navigation bars and iOS Home Indicators, while screens using raw `<View>` without container normalization risk clipping content behind the status bar or dynamic island during transitions.

---

### 4.5 Dual Status Bar Controller Conflict

#### Observation
1. `app/_layout.tsx:3,26`: Imports `{ StatusBar } from "expo-status-bar"` and mounts:
   ```tsx
   <StatusBar style="light" translucent backgroundColor="transparent" />
   ```
2. Every individual screen imports `{ StatusBar } from "react-native"` and imperatively renders:
   - `app/index.tsx:9,150`: `<StatusBar barStyle="light-content" translucent backgroundColor="transparent" />`
   - `app/pitch/[id].tsx:8,273`: `<StatusBar barStyle="light-content" ... />`
   - `app/player-card.tsx:2,20`: `<StatusBar barStyle="light-content" ... />`
   - `app/profile.tsx:9,108`: `<StatusBar barStyle="light-content" ... />`
   - `app/(auth)/login.tsx:8,39`: `<StatusBar barStyle="light-content" ... />`
   - `app/(auth)/verify.tsx:8,84`: `<StatusBar barStyle="light-content" ... />`
   - `app/(auth)/profile-setup.tsx:8,50`: `<StatusBar barStyle="light-content" ... />`

#### Technical Defect:
Imperatively mounting React Native's core `StatusBar` component on 7 separate screen subtrees while declaring `expo-status-bar` in the root stack layout causes race conditions, status bar style flickering, and inconsistent translucent overlay rendering during Expo Router push/pop transitions.

---

### 4.6 Deprecated APIs & Linking Inconsistencies

#### Observation
1. In `components/AdBannerCarousel.tsx:11,73`:
   ```tsx
   import { Linking } from "react-native";
   Linking.openURL(banner.actionValue)...
   ```
   `package.json:27` contains `"expo-linking": "~8.0.12"`. The app should standardize on `expo-linking` (`import * as Linking from "expo-linking"`), which handles scheme routing, deep-link parsing, and platform-safe URL resolution in Expo Router v6.
2. In `app/profile.tsx:401–430`: Push notifications and match reminders switches mutate local state without interfacing with `expo-notifications` or checking system notification permissions.

---

## 5. Detailed File-by-File Audit Matrix

| File Path | Lines | Category | Concrete Issue Identified | Severity | Remediation Strategy |
|---|---|---|---|---|---|
| `app/_layout.tsx` | 11–20 | SDK 54 / UX | Missing `SplashScreen.preventAutoHideAsync()` & `hideAsync()`; unhandled font load error causes blank screen flash | **HIGH** | Implement `expo-splash-screen` lifecycle in `useEffect`; handle `fontError`. |
| `app/_layout.tsx` | 23–36 | SDK 54 / Gestures | Missing `<GestureHandlerRootView style={{ flex: 1 }}>` | **HIGH** | Wrap root tree in `GestureHandlerRootView`. |
| `app/_layout.tsx` | 19,25,30 | NativeWind | Hardcoded `#04060c` background values | **MEDIUM** | Use semantic `bg-background` and theme tokens. |
| `app/_layout.tsx` | — | Expo Router | Missing `+error-boundary.tsx` and `+not-found.tsx` | **MEDIUM** | Add global error boundary and 404 route handlers. |
| `app/index.tsx` | 7, 42 | Performance | Standard `react-native.Image` used instead of `expo-image` | **HIGH** | Replace with `Image` from `expo-image`, add blurhash and caching. |
| `app/index.tsx` | 249–267 | Performance | `FlatList` used without `@shopify/flash-list` recycling or `getItemLayout` | **HIGH** | Migrate to `FlashList` with `estimatedItemSize={320}`. |
| `app/index.tsx` | 33–143 | Performance | `renderPitchCard` recreated every render; unmemoized `filter` | **MEDIUM** | Wrap callback in `useCallback` or extract to memoized `PitchCard` component. |
| `app/index.tsx` | 38–261 | NativeWind | 25+ hardcoded hex colors (`#04060c`, `#070b14`, `#22c55e`, `#60a5fa`) | **HIGH** | Replace with semantic tokens (`bg-card`, `border-border`, `text-primary`). |
| `app/index.tsx` | 53,64,76.. | NativeWind / UI | Repeated inline `style={{ fontFamily: ... }}` | **MEDIUM** | Configure font families in `@theme` and use font utility classes. |
| `app/index.tsx` | 173, 186 | Expo Router | Navigation `as any` type bypasses | **MEDIUM** | Use typed routes (`Href<string>`). |
| `app/index.tsx` | 27, 270 | Performance | Dead `showFifaCardModal` state never triggered | **LOW** | Remove unused state and orphaned modal. |
| `app/pitch/[id].tsx` | 1–803 | Architecture / UI | 803-line God Component; all selectors and modals inline | **CRITICAL** | Deconstruct into `DateSelector`, `TimeSlotGrid`, `PaymentMethodSelector`, `MatchTicketModal`. |
| `app/pitch/[id].tsx` | 5, 282 | Performance | `react-native.Image` used for hero stadium header | **HIGH** | Replace with `expo-image` with transition and cache policy. |
| `app/pitch/[id].tsx` | 272–795 | NativeWind | 50+ hardcoded hex colors and inline dimensions | **HIGH** | Adopt theme tokens and CVA component variants. |
| `app/pitch/[id].tsx` | 630–799 | UI / UX | Raw `Modal` without Reanimated sheet gestures | **MEDIUM** | Migrate to gesture-dismissible bottom sheet modal. |
| `app/player-card.tsx` | 19–104 | NativeWind | Hardcoded hex colors and inline font styles | **MEDIUM** | Refactor to design tokens and typography components. |
| `app/profile.tsx` | 1–474 | Architecture / UI | 474-line monolithic screen; duplicate input styling | **HIGH** | Extract reusable `<Input>`, `<SwitchRow>`, and `<OptionPillGroup>` components. |
| `app/profile.tsx` | 107–457 | NativeWind | 38+ hardcoded hex colors | **HIGH** | Replace with `bg-background`, `bg-card`, `text-primary`. |
| `app/(auth)/*` | Multiple | NativeWind / UI | 60+ hardcoded hex values in auth flow | **HIGH** | Standardize auth UI on shared `<AuthLayout>` and atomic inputs. |
| `components/AdBannerCarousel.tsx`| 19 | Responsiveness | Module-level `Dimensions.get("window")` | **HIGH** | Replace with `useWindowDimensions()` hook. |
| `components/AdBannerCarousel.tsx`| 5, 111 | Performance | `react-native.Image` used for banners | **HIGH** | Replace with `expo-image`. |
| `components/AdBannerCarousel.tsx`| 50 | Robustness | `scrollToIndex` without `onScrollToIndexFailed` | **HIGH** | Add safe scroll error handler and `getItemLayout`. |
| `components/AdBannerCarousel.tsx`| 182 | NativeWind / UI | Web CSS `transition-all duration-300` on native View | **MEDIUM** | Use Reanimated `useAnimatedStyle` for dot width animation. |
| `components/FifaCardDisplay.tsx` | 6 | Responsiveness | Module-level `Dimensions.get("window")` | **MEDIUM** | Pass dynamic width or use `useWindowDimensions()`. |
| `components/FifaCardDisplay.tsx` | 2, 120 | Performance | `react-native.Image` used for player avatar | **MEDIUM** | Replace with `expo-image`. |
| `components/QRCodeWidget.tsx` | 22–97 | Performance | Unmemoized 21x21 matrix path computation | **MEDIUM** | Memoize SVG path generation with `useMemo`. |
| `context/AuthContext.tsx` | 183–201 | Performance | Unmemoized context value object triggers full-tree re-renders | **HIGH** | Split context or memoize value with `useMemo` & `useCallback`. |
| All screens | Multiple | Accessibility | Zero `accessibilityLabel`, `accessibilityRole`, or `hitSlop` | **HIGH** | Add accessible props and minimum 48dp touch areas to all buttons. |
| All screens | Multiple | SDK 54 | Conflicting imperative `StatusBar` in screens vs `expo-status-bar` in layout | **MEDIUM** | Remove duplicate `StatusBar` imports; manage centrally via layout or `expo-status-bar`. |

---

## 6. Target Modern Implementation Blueprints (Before vs After)

### 6.1 Blueprint 1: NativeWind v5 Theme Tokens & Atomic Typography

#### Before (Anti-pattern in `app/index.tsx`):
```tsx
// Hardcoded hex values, inline font family styles, no design tokens
<TouchableOpacity
  activeOpacity={0.9}
  className="mb-6 overflow-hidden rounded-2xl bg-[#070b14] border border-[#141d2e]"
>
  <View className="absolute top-3 left-3 bg-[#04060c]/80 backdrop-blur-md px-3 py-1 rounded-full border border-[#22c55e]/40">
    <Text
      style={{ fontFamily: "Montserrat_800ExtraBold" }}
      className="text-xs text-[#22c55e] tracking-widest uppercase"
    >
      {item.type}
    </Text>
  </View>
  <Text
    style={{ fontFamily: "Montserrat_900Black" }}
    className="text-xl text-white uppercase tracking-wider"
  >
    {item.name}
  </Text>
</TouchableOpacity>
```

#### After (Clean Target with NativeWind v5 `@theme` Tokens):
```css
/* global.css */
@theme {
  --color-background: #04060c;
  --color-surface: #070b14;
  --color-card: #070b14;
  --color-card-border: #141d2e;
  --color-primary: #22c55e;
  --color-primary-muted: rgba(34, 197, 94, 0.2);
  --color-secondary: #60a5fa;

  --font-display: BebasNeue_400Regular;
  --font-heading: Montserrat_900Black;
  --font-subheading: Montserrat_800ExtraBold;
  --font-body: Montserrat_700Bold;
}
```
```tsx
// Clean, token-driven component with zero inline styles
<TouchableOpacity
  activeOpacity={0.9}
  accessibilityRole="button"
  accessibilityLabel={`View pitch details for ${item.name}`}
  className="mb-6 overflow-hidden rounded-2xl bg-card border border-card-border active:scale-[0.99] transition-transform"
>
  <View className="absolute top-3 left-3 bg-background/80 backdrop-blur-md px-3 py-1 rounded-full border border-primary/40">
    <Text className="font-subheading text-xs text-primary tracking-widest uppercase">
      {item.type}
    </Text>
  </View>
  <Text className="font-heading text-xl text-text-primary uppercase tracking-wider">
    {item.name}
  </Text>
</TouchableOpacity>
```

---

### 6.2 Blueprint 2: High-Performance List Virtualization (`FlashList` + `expo-image`)

#### Before (Anti-pattern in `app/index.tsx`):
```tsx
// Unoptimized FlatList + standard react-native.Image
import { FlatList, Image } from "react-native";

<FlatList
  data={filteredPitches}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <Image source={{ uri: item.imageUrl }} className="h-48 w-full" resizeMode="cover" />
  )}
/>
```

#### After (Optimized FlashList with `expo-image`):
```tsx
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import React, { useCallback } from "react";

const BLURHASH_PLACEHOLDER = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

export function PitchFeedList({ pitches, onSelectPitch }: PitchFeedListProps) {
  const renderItem = useCallback(
    ({ item }: { item: Pitch }) => (
      <PitchCardItem item={item} onSelect={onSelectPitch} />
    ),
    [onSelectPitch]
  );

  return (
    <FlashList
      data={pitches}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      estimatedItemSize={320}
      showsVerticalScrollIndicator={false}
      drawDistance={400}
    />
  );
}

// In PitchCardItem:
<Image
  source={item.imageUrl}
  placeholder={{ blurhash: BLURHASH_PLACEHOLDER }}
  contentFit="cover"
  transition={250}
  cachePolicy="memory-disk"
  className="h-48 w-full"
  accessibilityLabel={`Stadium image of ${item.name}`}
/>
```

---

### 6.3 Blueprint 3: Robust Expo SDK 54 Root Layout & Splash Lifecycle

#### Before (`app/_layout.tsx`):
```tsx
// No GestureHandlerRootView, no SplashScreen control, unhandled font error
export default function RootLayout() {
  const [fontsLoaded] = useFonts({ ... });
  if (!fontsLoaded) return <View className="flex-1 bg-[#04060c]" />;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View className="flex-1 bg-[#04060c]">
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

#### After (SDK 54 Production-Ready Root Layout):
```tsx
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useFonts, Montserrat_700Bold, Montserrat_800ExtraBold, Montserrat_900Black } from "@expo-google-fonts/montserrat";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import { AuthProvider } from "@/context/AuthContext";
import "@/global.css";

// Prevent native splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Montserrat_900Black,
    BebasNeue_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null; // Keep native splash screen mounted without blank flicker
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" translucent backgroundColor="transparent" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#04060c" },
              animation: "slide_from_right",
            }}
          />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

---

## 7. Phased Refactoring Recommendations

### Phase 0: Immediate Fixes & Critical Hygiene
1. **Splash Screen & Gesture Root**:
   - Add `SplashScreen.preventAutoHideAsync()` and `SplashScreen.hideAsync()` to `app/_layout.tsx`.
   - Wrap the root layout in `<GestureHandlerRootView style={{ flex: 1 }}>`.
2. **Root Clutter Cleanup**: Move `Mbappe_231747-1.png` and `gpt-image-2_...jpg` from root into `assets/images/`.
3. **Status Bar Consolidation**: Remove duplicate imperative `StatusBar` from all screen files; rely on `expo-status-bar` in `_layout.tsx`.

### Phase 1: NativeWind v5 Token Migration & Design System
1. **Update `global.css` `@theme`**: Define semantic colors and font family tokens (`--font-heading`, `--font-subheading`, `--font-body`, `--font-display`).
2. **Atomic UI Primitives**: Build `<Button>`, `<Input>`, `<Card>`, `<Badge>`, and `<Typography>` components in `components/ui/`.
3. **Eliminate Arbitrary Hex Colors**: Replace 190+ hardcoded hex classes with semantic token utilities (`bg-card`, `bg-background`, `border-card-border`, `text-primary`).

### Phase 2: Performance & Virtualization Overhaul
1. **Install `@shopify/flash-list`**: Replace `FlatList` in `app/index.tsx` with `FlashList` (`estimatedItemSize={320}`).
2. **Migrate to `expo-image`**: Replace all `react-native.Image` with `Image` from `expo-image` (enable blurhash placeholders and `memory-disk` cache policy).
3. **Dynamic Responsive Layouts**: Replace static `Dimensions.get("window")` with `useWindowDimensions()` in `AdBannerCarousel.tsx` and `FifaCardDisplay.tsx`.
4. **Context Memoization**: Wrap `AuthContext` value and callbacks with `useMemo` / `useCallback` to prevent cascading re-renders.

### Phase 3: Screen Modularization, Reanimated & Accessibility
1. **Deconstruct God Components**:
   - Split `app/pitch/[id].tsx` (803 lines) into modular subcomponents (`PitchHero`, `DateSelector`, `TimeSlotGrid`, `PaymentMethodSelector`, `MatchTicketModal`).
   - Split `app/profile.tsx` (474 lines) into `ProfileHeader`, `PersonalInfoForm`, and `FootballSpecsSelector`.
2. **Reanimated Interactions**: Replace static modal fades with gesture-dismissible Reanimated bottom sheets (`@gorhom/bottom-sheet` or Reanimated spring modals).
3. **Accessibility Compliance**: Add `accessibilityRole="button"`, `accessibilityLabel`, and `hitSlop` to all interactive touchables.
