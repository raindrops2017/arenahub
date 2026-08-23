# Specification & Best Practices Mining Report: Modern React Native & Expo SDK 54 Standards

**Author**: Spec Miner (`spec_miner_best_practices_1`)  
**Date**: 2026-08-15  
**Target Environment**: Expo SDK 54 (`~54.0.35`), React Native `0.81.5`, React `19.1.0`, NativeWind `v5.0.0-preview.4` (Tailwind CSS `v4.3.3` / `react-native-css` `^3.0.7`)  
**Scope**: Client-Side Architecture, State & Caching, Type Safety & Validation, Design Tokens & Styling, High-Performance UI, and Expo SDK 54 Native Platform Standards.

---

## 1. Executive Summary

This specification mining report defines the authoritative modern engineering standards for high-performance cross-platform mobile development on the **Expo SDK 54** and **React Native 0.81+ / React 19** stack. It synthesizes official documentation, native runtime specifications, and established industry architectural blueprints to establish non-negotiable target state definitions across six architectural dimensions.

### Core Stack Baseline
- **Runtime & Framework**: Expo SDK 54 (`expo@~54.0.35`, `expo-router@~6.0.24`, `expo-system-ui@~6.0.9`, `expo-image@~3.0.11`, `expo-haptics@~15.0.8`)
- **Native Engine**: React Native 0.81.5 on the **New Architecture** (Fabric UI Renderer, TurboModules, JSI direct bindings, Bridgeless runtime enabled by default)
- **UI & React Runtime**: React 19.1.0 with React Compiler auto-memoization, Actions, `useActionState`, `useOptimistic`, and `use()` resource unwrapping
- **Styling Architecture**: NativeWind v5 (`preview.4`) backed by `react-native-css` v3 and Tailwind CSS v4 CSS-first configuration (`@theme` directives, CSS variables)
- **Server State & Networking**: TanStack Query v5 (`@tanstack/react-query@^5.x`) with hierarchical `queryOptions` key factories and NetInfo connectivity management
- **Client & UI State**: Zustand v5 (`zustand@^5.x`) with atomic slice stores and AsyncStorage persistence adapters
- **Runtime Validation**: Zod v3 (`zod@^3.24+`) for end-to-end type safety, API DTO validation, and route parameter parsing
- **List & Asset Performance**: Shopify FlashList (`@shopify/flash-list@^1.7+`), `expo-image` v3 with blurhash memory-disk caching, and `react-native-reanimated` v4.1+ worklet animations

---

## 2. Authoritative Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Architecture | Feature-Sliced Domain Boundaries | Modular encapsulation of business logic (`features/<domain>`) isolated from routing | Feature DTOs, domain hooks, UI components | Self-contained domain modules with clean public API | Build-time ESLint boundary violation errors | FSD Standard / Industry Arch Specs |
| 2 | Architecture | Thin Expo Router Routing Layer | Pure file-based navigation routing files in `app/` delegating immediately to feature modules | Dynamic/static route segments (`[id].tsx`, `_layout.tsx`) | Mounted screen containers, header options, safe navigation | 404 Unmatched Route / Route Segment Errors | Expo Router v6 Specs / Docs |
| 3 | State & Caching | TanStack Query v5 `queryOptions` | Centralized, type-safe query key factories and query configurations | Query key tuple, async query function, stale/cache time | Typed `QueryOptions` object consumable by `useQuery` | Automatic error handling via `isError`, error boundary bubble | TanStack Query v5 Docs |
| 4 | State & Caching | Zustand Atomic Slice Stores | Decoupled client UI state management without React Context provider nesting overhead | State mutation actions, initial client state | Reactive slice selectors, atomic setter actions | Immutable state transitions, state rollback | Zustand v5 Specification |
| 5 | Type Safety | Zod Runtime DTO Validation | Schema validation of untyped API network responses and form inputs | Inbound JSON / form data payloads | Validated TypeScript typed DTO (`z.infer<T>`) | Throws `ZodError` with structured field issues | Zod Documentation |
| 6 | Type Safety | Expo Typed Routing | Auto-generated TypeScript route definitions enabling type-safe `<Link>` and `router.push` | Route configuration in `app.json` (`experiments.typedRoutes`) | Static `.expo/types/router.d.ts` route types | TypeScript compilation error on invalid route paths | Expo Router v6 / SDK 54 Specs |
| 7 | Styling | NativeWind v5 CSS-First Tokens | Design token definition via Tailwind v4 `@theme` blocks and CSS variables in `global.css` | CSS variable definitions (`--color-surface-primary`, etc.) | Compiled native styling via `react-native-css` | Build-time PostCSS/LightningCSS parse errors | NativeWind v5 / Tailwind v4 Specs |
| 8 | UI Performance | Shopify FlashList View Recycling | High-performance virtualized list reusing cell native views instead of destroying them | `data`, `renderItem`, `estimatedItemSize` | 60/120 FPS continuous scrolling with zero blank flashes | Performance degradation warning if `key` prop is attached | Shopify FlashList Specs |
| 9 | UI Performance | `expo-image` Hardware Pipeline | Hardware-accelerated image component with blurhash placeholders and dual caching | Image source URI, blurhash string, cache policy | Hardware decoded Bitmap rendered smoothly | `onError` event callback, fallback placeholder rendered | Expo SDK 54 `expo-image` Docs |
| 10 | Platform / Native | Android Mandatory Edge-to-Edge | Built-in edge-to-edge drawing under system status and navigation bars on Android (API 36) | System window insets, status bar style | Full-bleed native canvas with safe area padding | Content clipping behind navigation bar if unhandled | React Native 0.81 / Expo SDK 54 Specs |
| 11 | Platform / Native | `expo-system-ui` Root Synchronization | Native window background color coordination to prevent white flash during splash dismiss | Hex/RGB background color (`SystemUI.setBackgroundColorAsync`) | Native window background style applied synchronously | Rejected promise if native module fails | Expo SDK 54 Docs |
| 12 | React 19 | React Compiler Auto-Memoization | Build-time AST compiler analyzing dependencies and injecting fine-grained memoization | Standard React functional components and hooks | Optimized native bytecode without manual `useMemo`/`useCallback` | De-optimizes to standard execution on Rule violations | React 19 Architecture Docs |

---

## 3. Discovered Edge Cases & Failure Modes

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | FlashList Cell Recycling | Providing dynamic `key` prop on root JSX element inside `renderItem` | Destroys cell recycling mechanism, causing view recreation, memory spikes, and severe scroll jank. |
| 2 | FlashList Layout Calculation | Omitting or vastly under-estimating `estimatedItemSize` | Causes blank cells during rapid scrolling and abrupt layout jumps as items resize dynamically. |
| 3 | Expo Typed Routing Search Params | Passing object query params without explicit string serialization or generic typing | `useLocalSearchParams` returns `string | string[] | undefined`, causing runtime crashes if treated as parsed numbers/booleans without Zod coercion. |
| 4 | Android Edge-to-Edge Keyboard | Opening software keyboard without `KeyboardAvoidingView` or `react-native-keyboard-controller` | Input fields get obscured behind the native Android keyboard due to default full-bleed window behavior in RN 0.81. |
| 5 | NativeWind v5 CSS Variables | Using dynamic inline runtime CSS variable injection via `style` prop without Tailwind compilation | `react-native-css` cannot resolve dynamic uncompiled CSS variables at runtime; fails silently or falls back to transparent. |
| 6 | TanStack Query Offline Recovery | App backgrounding and resuming without `NetInfo` / AppState event binding | Stale cached queries fail to auto-refetch, causing outdated pricing and availability data to persist on screen. |
| 7 | React 19 Hook Lifecycle (`use`) | Calling `use(Promise)` inside nested loops or after early return conditions | Violates React 19 concurrent resource rules, resulting in component suspension deadlocks or unhandled promise rejections. |
| 8 | Monolithic React Context | Updating a single scalar property in a large context provider (e.g. `isPitchAvailable`) | Triggers full-subtree re-rendering of all consumers across the entire screen hierarchy, degrading FPS during user interaction. |

---

## 4. In-Depth Analysis: The 6 Architectural Dimensions

---

### Dimension 1: Feature-Driven Modular Architecture (Domain Boundaries vs Layer Fragmentation)

#### 1.1 Target State Definition
The application must transition from a "technical layer-by-layer" fragmentation (`/components`, `/services`, `/context`, `/data` in global roots) to a **Feature-Driven Modular Architecture** inspired by Feature-Sliced Design (FSD). Every domain boundary (e.g., `auth`, `pitches`, `bookings`, `wallet`, `profile`, `community`, `dashboard`) owns its complete lifecycle: API queries, domain mutations, Zod schemas, UI components, custom hooks, and state slices.

```
src/
├── app/                          # Expo Router: Thin routing layer ONLY
│   ├── (auth)/
│   │   ├── login.tsx             # Route segment (re-exports feature container)
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Explore/Home Screen route
│   │   ├── bookings.tsx          # Bookings Screen route
│   │   ├── wallet.tsx            # Wallet Screen route
│   │   └── profile.tsx           # Profile Screen route
│   ├── pitch/
│   │   └── [id].tsx              # Pitch details dynamic route
│   └── _layout.tsx               # Root layout (Providers, Fonts, Theme, Splash)
├── features/                     # Domain modules (Self-contained)
│   ├── auth/
│   │   ├── api/                  # Auth API mutations, tokens
│   │   ├── components/           # LoginForm, RegisterForm, OTPInput
│   │   ├── hooks/                # useAuthSession, useBiometrics
│   │   ├── schemas/              # authValidationSchemas.ts
│   │   └── index.ts              # Public feature API boundary
│   ├── pitches/
│   │   ├── api/                  # pitchQueries.ts, pitchMutations.ts
│   │   ├── components/           # PitchCard, PitchFilterSheet, SlotPicker
│   │   ├── hooks/                # usePitchFilters, useSlotBooking
│   │   ├── schemas/              # pitchSchemas.ts
│   │   ├── types/                # pitchTypes.ts
│   │   └── index.ts
│   ├── bookings/
│   ├── wallet/
│   ├── profile/
│   └── dashboard/
├── components/ui/                # Shared Pure Design System Primitives (No business logic)
│   ├── Button/
│   ├── Input/
│   ├── Card/
│   ├── Modal/
│   ├── BottomSheet/
│   ├── Badge/
│   └── Typography/
├── lib/                          # Infrastructure & Singletons
│   ├── queryClient.ts            # TanStack Query Client instance & defaults
│   ├── apiClient.ts              # Axios/Fetch HTTP client with interceptors
│   ├── storage.ts                # AsyncStorage / SecureStore adapters
│   └── logger.ts
└── types/                        # Global shared types (Navigation, Theme, Environment)
```

#### 1.2 Architectural Trade-offs & Anti-Patterns Comparison

| Aspect | Current / Anti-Pattern (Technical Fragmentation) | Target State (Feature-Driven Architecture) |
|---|---|---|
| **Directory Structure** | Flat folders (`/components`, `/services`, `/context`, `/data`) mixing unrelated domains. | Encapsulated domain directories (`src/features/<domain>`) with internal colocation. |
| **Routing Coupling** | Massive 600+ line screens in `app/` containing inline API calls, state hooks, styling, and business logic. | "Thin" route files in `app/` (under 30 lines) delegating immediately to feature container components. |
| **Dependency Direction** | Circular imports across `/context`, `/services`, and `/components`. | Strict top-down unidirectional flow: `app` $\rightarrow$ `features` $\rightarrow$ `components/ui` & `lib`. Features cannot import directly from peer features. |
| **Maintainability** | Refactoring one feature requires editing 8 disparate files across 6 root folders. | All domain code is colocated within a single feature directory; deletion/refactoring is isolated. |

#### 1.3 Concrete Code Pattern Blueprint: Thin Route & Domain Feature Boundary

```tsx
// ==========================================
// File: src/features/pitches/index.ts (Public Feature Boundary)
// ==========================================
export { PitchDetailsContainer } from './components/PitchDetailsContainer';
export { PitchCard } from './components/PitchCard';
export { usePitchDetailsQuery, pitchOptions } from './api/pitchQueries';
export type { Pitch, PitchSlot } from './types/pitchTypes';

// ==========================================
// File: src/app/pitch/[id].tsx (Thin Route File)
// ==========================================
import React from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { PitchDetailsContainer } from '@/features/pitches';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function PitchDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    throw new Error('Pitch ID is required');
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Pitch Details', 
          headerBackTitle: 'Explore',
          headerShown: true 
        }} 
      />
      <ErrorBoundary fallbackMessage="Unable to load pitch details.">
        <PitchDetailsContainer pitchId={id} />
      </ErrorBoundary>
    </>
  );
}
```

---

### Dimension 2: Modern State & Data Caching Patterns (TanStack Query v5 + Zustand v5 + React 19)

#### 2.1 Target State Definition
Ecosystem data must be strictly bifurcated into **Server State** and **Client State**:
1. **Server State (Remote, Asynchronous, Cached, Shared)**: Managed solely via **TanStack Query v5**. Handled with `queryOptions` key factories, stale-time caching, background prefetching, optimistic mutations, and automated NetInfo online/offline refetching.
2. **Client State (Local, Synchronous, Ephemeral, Persistent UI Settings)**: Managed solely via **Zustand v5**. Atomic slice pattern, selector-based subscriptions to prevent unnecessary renders, and `persist` middleware backed by `AsyncStorage`.
3. **Form & Transient Action State**: Managed via React 19 `useActionState` and `useOptimistic` or React Hook Form with Zod resolvers.

#### 2.2 Architectural Trade-offs & Anti-Patterns Comparison

| Aspect | Current / Anti-Pattern (Bloated Context & Raw Fetch) | Target State (TanStack Query v5 + Zustand v5) |
|---|---|---|
| **Data Fetching** | Raw `fetch` / `axios` calls buried in `useEffect` inside screens with manual `useState(loading)`, `useState(error)`. | Declarative `useQuery(pitchOptions.detail(id))` with automated retry, caching, and lifecycle management. |
| **Cache Management** | Manual sync into monolithic global Context or local state; no invalidation strategy; stale data on navigation. | Zero manual cache sync. Query key hierarchical invalidation: `queryClient.invalidateQueries({ queryKey: pitchKeys.all })`. |
| **Re-render Scope** | Updating one user setting in `AppContext` re-renders every component wrapped in `AppContext.Provider`. | Fine-grained selector subscriptions: `const isDark = useThemeStore(s => s.isDark)` only re-renders on `isDark` diffs. |
| **Offline Resilience** | App shows blank white screen or crashes on network disconnection. | Cached data is displayed instantly from memory-disk (`staleTime: 5 mins`); background refetch fires upon NetInfo reconnection. |

#### 2.3 Concrete Code Pattern Blueprint: Query Key Factory & Zustand Slice

```typescript
// ==========================================
// File: src/features/pitches/api/pitchQueries.ts
// ==========================================
import { queryOptions, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { Pitch, pitchSchema, pitchListSchema } from '../schemas/pitchSchemas';

export const pitchKeys = {
  all: ['pitches'] as const,
  lists: () => [...pitchKeys.all, 'list'] as const,
  list: (filters: { sport?: string; date?: string }) => [...pitchKeys.lists(), filters] as const,
  details: () => [...pitchKeys.all, 'detail'] as const,
  detail: (id: string) => [...pitchKeys.details(), id] as const,
};

export const pitchOptions = {
  list: (filters: { sport?: string; date?: string } = {}) =>
    queryOptions({
      queryKey: pitchKeys.list(filters),
      queryFn: async () => {
        const response = await apiClient.get('/pitches', { params: filters });
        return pitchListSchema.parse(response.data);
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: pitchKeys.detail(id),
      queryFn: async () => {
        const response = await apiClient.get(`/pitches/${id}`);
        return pitchSchema.parse(response.data);
      },
      staleTime: 1000 * 60 * 10,
    }),
};

export function usePitchDetailsQuery(id: string) {
  return useQuery(pitchOptions.detail(id));
}
```

```typescript
// ==========================================
// File: src/features/booking/model/useBookingFilterStore.ts
// ==========================================
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BookingFilterState {
  selectedSport: string;
  selectedDate: string;
  priceRange: [number, number];
  setSport: (sport: string) => void;
  setDate: (date: string) => void;
  setPriceRange: (range: [number, number]) => void;
  resetFilters: () => void;
}

const initialFilters = {
  selectedSport: 'football',
  selectedDate: new Date().toISOString().split('T')[0],
  priceRange: [0, 500] as [number, number],
};

export const useBookingFilterStore = create<BookingFilterState>()(
  persist(
    (set) => ({
      ...initialFilters,
      setSport: (selectedSport) => set({ selectedSport }),
      setDate: (selectedDate) => set({ selectedDate }),
      setPriceRange: (priceRange) => set({ priceRange }),
      resetFilters: () => set(initialFilters),
    }),
    {
      name: 'booking-filter-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ selectedSport: state.selectedSport }), // Only persist preferred sport
    }
  )
);
```

---

### Dimension 3: End-to-End Type Safety & Runtime Schema Validation

#### 3.1 Target State Definition
The application enforces complete static and runtime type integrity:
1. **TypeScript Strictness**: `tsconfig.json` configured with `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`.
2. **Runtime DTO Validation via Zod**: All backend API responses and forms validated at the network boundary using Zod schemas (`safeParse`). Types are strictly inferred via `z.infer<typeof Schema>`.
3. **Expo Router Typed Routing**: `experiments.typedRoutes: true` enabled in `app.json`. Navigation paths (`router.push('/pitch/[id]')`) and search parameters are statically verified at compile time.
4. **Resilient Error Boundaries**: Route-level and feature-level `ErrorBoundary` components capturing runtime exceptions and displaying actionable fallback UI.

#### 3.2 Concrete Code Pattern Blueprint: Zod Schemas & Typed Route Search Params

```typescript
// ==========================================
// File: src/features/pitches/schemas/pitchSchemas.ts
// ==========================================
import { z } from 'zod';

export const pitchSlotSchema = z.object({
  id: z.string().uuid(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format HH:mm'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format HH:mm'),
  price: z.number().nonnegative(),
  isAvailable: z.boolean(),
});

export const pitchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3, 'Pitch name too short'),
  sportType: z.enum(['football', 'padel', 'basketball', 'tennis']),
  location: z.object({
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    city: z.string(),
  }),
  hourlyRate: z.number().positive(),
  rating: z.number().min(0).max(5).default(5.0),
  images: z.array(z.string().url()),
  blurhash: z.string().optional(),
  slots: z.array(pitchSlotSchema).default([]),
  amenities: z.array(z.string()).default([]),
});

export const pitchListSchema = z.array(pitchSchema);

export type Pitch = z.infer<typeof pitchSchema>;
export type PitchSlot = z.infer<typeof pitchSlotSchema>;

// Route Search Params Schema
export const pitchRouteParamsSchema = z.object({
  id: z.string().min(1),
  date: z.string().optional(),
  referral: z.string().optional(),
});
export type PitchRouteParams = z.infer<typeof pitchRouteParamsSchema>;
```

```tsx
// ==========================================
// File: src/components/ui/ErrorBoundary.tsx
// ==========================================
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught exception:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center p-6 bg-surface-primary">
          <Text className="text-xl font-bold text-text-primary mb-2">Something went wrong</Text>
          <Text className="text-sm text-text-muted text-center mb-6">
            {this.props.fallbackMessage || this.state.error?.message || 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity
            onPress={this.handleReset}
            className="bg-brand-primary px-6 py-3 rounded-full active:opacity-80"
          >
            <Text className="text-white font-semibold text-base">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
```

---

### Dimension 4: Design Token Architecture & Styling Consistency (NativeWind v5 / Tailwind v4)

#### 4.1 Target State Definition
The styling system is standardized on **NativeWind v5** (`react-native-css` engine) and **Tailwind CSS v4** with a **CSS-first design token architecture**.
1. **Zero Hardcoded Magic Values**: All colors, radiuses, shadows, and spacings are consumed via semantic design tokens in `global.css`.
2. **Dynamic Dark Mode**: CSS variables adapt based on device color scheme or user override (`dark:` variant classes).
3. **Component Variant Primitives (`cva`)**: Standardized variant generation via `class-variance-authority` and `clsx` / `tailwind-merge`.

#### 4.2 Concrete Code Pattern Blueprint: `global.css` & CVA Design System Button

```css
/* ==========================================
   File: global.css (Tailwind CSS v4 + NativeWind v5 Tokens)
   ========================================== */
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css";
@import "nativewind/theme";

@layer theme {
  :root {
    --color-surface-primary: #ffffff;
    --color-surface-secondary: #f8fafc;
    --color-surface-elevated: #ffffff;
    --color-surface-card: #f1f5f9;
    
    --color-brand-primary: #10b981;
    --color-brand-primary-hover: #059669;
    --color-brand-dark: #064e3b;
    
    --color-accent-gold: #f59e0b;
    --color-accent-blue: #3b82f6;
    
    --color-text-primary: #0f172a;
    --color-text-secondary: #475569;
    --color-text-muted: #94a3b8;
    
    --color-border-subtle: #e2e8f0;
    --color-border-strong: #cbd5e1;
    
    --radius-sm: 6px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-full: 9999px;
  }

  .dark {
    --color-surface-primary: #0a0e17;
    --color-surface-secondary: #111827;
    --color-surface-elevated: #1e293b;
    --color-surface-card: #151d2e;
    
    --color-brand-primary: #10b981;
    --color-brand-primary-hover: #34d399;
    
    --color-text-primary: #f8fafc;
    --color-text-secondary: #cbd5e1;
    --color-text-muted: #64748b;
    
    --color-border-subtle: #1e293b;
    --color-border-strong: #334155;
  }
}
```

```tsx
// ==========================================
// File: src/components/ui/Button/Button.tsx
// ==========================================
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';
import * as Haptics from 'expo-haptics';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-xl transition active:scale-98',
  {
    variants: {
      variant: {
        primary: 'bg-brand-primary active:bg-brand-primary-hover shadow-sm',
        secondary: 'bg-surface-elevated border border-border-subtle active:bg-surface-card',
        accent: 'bg-accent-gold active:opacity-90',
        outline: 'border-2 border-brand-primary bg-transparent',
        ghost: 'bg-transparent active:bg-surface-card',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-12 px-5',
        lg: 'h-14 px-7',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

const textVariants = cva('font-semibold text-center select-none', {
  variants: {
    variant: {
      primary: 'text-white',
      secondary: 'text-text-primary',
      accent: 'text-surface-primary',
      outline: 'text-brand-primary',
      ghost: 'text-text-primary',
    },
    size: {
      sm: 'text-xs',
      md: 'text-base',
      lg: 'text-lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export interface ButtonProps
  extends TouchableOpacityProps,
    VariantProps<typeof buttonVariants> {
  label: string;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  label,
  variant,
  size,
  fullWidth,
  isLoading,
  leftIcon,
  rightIcon,
  className,
  disabled,
  onPress,
  ...props
}: ButtonProps) {
  const handlePress = (e: any) => {
    if (disabled || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(e);
  };

  return (
    <TouchableOpacity
      className={clsx(buttonVariants({ variant, size, fullWidth }), className, (disabled || isLoading) && 'opacity-50')}
      disabled={disabled || isLoading}
      onPress={handlePress}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? '#ffffff' : '#10b981'} size="small" />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text className={textVariants({ variant, size })}>{label}</Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}
```

---

### Dimension 5: High-Performance Mobile UI (FlashList, expo-image, Reanimated v4)

#### 5.1 Target State Definition
The UI layer is engineered for constant 60/120 FPS frame rates without memory leaks or scroll stutter:
1. **Virtualized Cell Recycling**: Standard `FlatList` and `ScrollView` for lists replaced with `@shopify/flash-list`. Requires exact `estimatedItemSize` and zero `key` props inside `renderItem`.
2. **Hardware-Accelerated Images (`expo-image`)**: Replaces standard React Native `Image`. Implements dual memory-disk caching (`cachePolicy="memory-disk"`), blurhash placeholders, and hardware downscaling.
3. **Native Thread Animations**: Animations implemented with `react-native-reanimated` v4 running on UI worklets (transforms and opacities only). Layout properties (`width`, `height`, `margin`) are animated using Reanimated Layout Transitions (`LinearTransition`).

#### 5.2 Concrete Code Pattern Blueprint: High-Performance FlashList & PitchCard

```tsx
// ==========================================
// File: src/features/pitches/components/PitchList.tsx
// ==========================================
import React, { useCallback } from 'react';
import { View, Text, RefreshControl } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Pitch } from '../schemas/pitchSchemas';
import { PitchCard } from './PitchCard';

interface PitchListProps {
  pitches: Pitch[];
  isLoading: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
  onSelectPitch: (id: string) => void;
}

export function PitchList({ pitches, isLoading, isRefetching, onRefresh, onSelectPitch }: PitchListProps) {
  // Stable renderItem callback outside JSX body
  const renderItem: ListRenderItem<Pitch> = useCallback(
    ({ item }) => (
      <PitchCard 
        pitch={item} 
        onPress={() => onSelectPitch(item.id)} 
      />
    ),
    [onSelectPitch]
  );

  const keyExtractor = useCallback((item: Pitch) => item.id, []);

  return (
    <View className="flex-1 bg-surface-primary">
      <FlashList
        data={pitches}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={280} // Exact median height of PitchCard
        drawDistance={400}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 }}
        refreshControl={
          <RefreshControl 
            refreshing={isRefetching} 
            onRefresh={onRefresh} 
            tintColor="#10b981" 
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-16">
              <Text className="text-text-muted text-base">No pitches found matching your criteria.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

// ==========================================
// File: src/features/pitches/components/PitchCard.tsx
// ==========================================
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Pitch } from '../schemas/pitchSchemas';

interface PitchCardProps {
  pitch: Pitch;
  onPress: () => void;
}

export const PitchCard = React.memo(function PitchCard({ pitch, onPress }: PitchCardProps) {
  return (
    <Animated.View 
      entering={FadeInDown.duration(350).springify()}
      className="mb-4 bg-surface-card rounded-2xl overflow-hidden border border-border-subtle"
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <View className="relative w-full h-44 bg-surface-elevated">
          <Image
            source={{ uri: pitch.images[0] }}
            placeholder={pitch.blurhash || 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
            className="w-full h-full"
          />
          <View className="absolute top-3 right-3 bg-surface-primary/90 backdrop-blur-md px-3 py-1 rounded-full border border-border-subtle">
            <Text className="text-brand-primary font-bold text-xs capitalize">{pitch.sportType}</Text>
          </View>
        </View>
        
        <View className="p-4">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-text-primary font-bold text-lg">{pitch.name}</Text>
            <View className="flex-row items-center">
              <Text className="text-accent-gold font-bold text-sm mr-1">★</Text>
              <Text className="text-text-primary font-semibold text-sm">{pitch.rating.toFixed(1)}</Text>
            </View>
          </View>
          
          <Text className="text-text-muted text-sm mb-3">{pitch.location.address}</Text>
          
          <View className="flex-row justify-between items-center pt-2 border-t border-border-subtle">
            <Text className="text-text-muted text-xs">Starting from</Text>
            <Text className="text-brand-primary font-extrabold text-base">
              ${pitch.hourlyRate} <Text className="text-text-muted font-normal text-xs">/ hour</Text>
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});
```

---

### Dimension 6: Expo SDK 54 Standards & Native Engine (Fabric, TurboModules, SystemUI, Safe Area)

#### 6.1 Target State Definition
The application leverages the architectural advancements of **Expo SDK 54** and **React Native 0.81.5**:
1. **React Native New Architecture Baseline**: Fabric renderer + TurboModules + JSI enabled. The legacy JavaScript bridge is eliminated; all native view rendering and module invocations are synchronous and type-safe.
2. **Android 16 (API 36) Edge-to-Edge Compliance**: Edge-to-edge drawing is active by default on Android. App views draw behind the transparent status and navigation bars.
3. **Safe Area Insets Standards**: Top-level `SafeAreaProvider` wrapping the root layout, combined with `useSafeAreaInsets()` from `react-native-safe-area-context` for custom dynamic padding, eliminating status-bar and home-indicator overlap.
4. **`expo-system-ui` Root Background**: `SystemUI.setBackgroundColorAsync()` configured in `app/_layout.tsx` to match the active theme, preventing white flashes during native splash transition.
5. **Deprecation Elimination**: Removal of legacy `expo-av` in favor of modern `expo-audio` / `expo-video` or native platform sound APIs; removal of redundant `react-native-edge-to-edge` config plugin.

#### 6.2 Concrete Code Pattern Blueprint: Root Layout (`app/_layout.tsx`) & Safe Area Architecture

```tsx
// ==========================================
// File: src/app/_layout.tsx (SDK 54 Root Layout)
// ==========================================
import React, { useEffect } from 'react';
import { useColorScheme, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';

import '../../global.css';

// Prevent splash screen auto-hide
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    BebasNeue_400Regular,
  });

  useEffect(() => {
    // Synchronize native window background with theme to eliminate splash transition flash
    const rootBg = isDark ? '#0a0e17' : '#ffffff';
    SystemUI.setBackgroundColorAsync(rootBg).catch(() => {});
  }, [isDark]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={isDark ? 'light' : 'dark'} translucent />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: isDark ? '#0a0e17' : '#ffffff',
            },
            animation: Platform.OS === 'android' ? 'fade_from_bottom' : 'default',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen 
            name="pitch/[id]" 
            options={{ 
              headerShown: true, 
              presentation: 'card' 
            }} 
          />
          <Stack.Screen 
            name="modal/booking-confirm" 
            options={{ 
              presentation: 'modal', 
              headerShown: false 
            }} 
          />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
```

```tsx
// ==========================================
// File: src/components/ui/ScreenContainer.tsx
// ==========================================
import React from 'react';
import { View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import clsx from 'clsx';

interface ScreenContainerProps extends ViewProps {
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  children: React.ReactNode;
}

export function ScreenContainer({
  edges = ['top', 'bottom'],
  children,
  className,
  style,
  ...props
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  const paddingStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return (
    <View
      className={clsx('flex-1 bg-surface-primary', className)}
      style={[paddingStyle, style]}
      {...props}
    >
      {children}
    </View>
  );
}
```

---

## 5. Architectural Synthesis Matrix & Decision Rules

| Dimension | Mandatory Engineering Rule | Violation Consequence |
|---|---|---|
| **1. Feature Architecture** | Route files in `app/` MUST NOT exceed 50 lines or contain inline business logic / API mutations. All features MUST export through `index.ts`. | High coupling, difficult route refactoring, navigation spaghetti. |
| **2. State & Caching** | Server data MUST NEVER be synchronized or stored in Zustand stores. All remote queries MUST use TanStack Query `queryOptions`. | Stale cache bugs, duplicate network requests, complex manual synchronization logic. |
| **3. Type Safety** | All external network responses MUST be validated with Zod before consumption in UI components. | Uncaught runtime exceptions from unexpected `null`/`undefined` fields in production. |
| **4. Design Tokens** | No hardcoded hex color strings (e.g. `#10b981`, `#1a1a1a`) are permitted in component JSX or style objects. | Broken dark mode support, inconsistent visual design, high refactoring friction. |
| **5. UI Performance** | Long or dynamic scroll lists MUST use `@shopify/flash-list` with calibrated `estimatedItemSize` and zero `key` props in cells. | High memory consumption, dropped frames during scrolling, visible blank cells. |
| **6. Expo SDK 54 Standards** | All screens MUST handle edge-to-edge system insets via `react-native-safe-area-context` and synchronize window background via `expo-system-ui`. | Overlapping text on Android navigation bars, white flash during app launch. |

---

## 6. Verification & Validation Methodology

To independently verify adherence to these standards during refactoring:
1. **Static Type Verification**: Run `npx tsc --noEmit` to confirm zero TypeScript compilation errors with strict configuration enabled.
2. **Lint & Code Style**: Run `npm run lint` (`expo lint`) to verify no circular dependencies or ESLint rule violations.
3. **Expo Router Typed Routes Validation**: Ensure `experiments.typedRoutes` generates `.expo/types/router.d.ts` cleanly during `npx expo start`.
4. **Frame Rate & Memory Profiling**: Profile in release mode on physical Android & iOS devices using React DevTools Profiler and FlashList performance monitor to ensure 60/120 FPS continuous scrolling.
