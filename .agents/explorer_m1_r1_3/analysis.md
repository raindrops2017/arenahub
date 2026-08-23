# Milestone 1: Storage Adapter & Reactive Sync Architectural Specifications

**Agent**: `teamwork_preview_explorer`  
**Working Directory**: `D:/test-mobile-app/.agents/explorer_m1_r1_3`  
**Date**: 2026-08-07  
**Status**: Completed Analysis  

---

## 1. Executive Summary

Milestone 1 establishes the cross-platform persistence and real-time state synchronization layer connecting the **TailAdmin Admin Dashboard** (Vite + React 19 SPA) and the **Expo Mobile App** (Expo v54 + React Native).

Currently:
1. The **Mobile App** relies on static mock data (`data/mockPitches.ts`) and unpersisted React state (`context/AuthContext.tsx`). It lacks `@react-native-async-storage/async-storage`.
2. The **Dashboard** uses hardcoded template component state without central persistence.
3. No cross-platform or cross-tab synchronization mechanism exists.

To fulfill **Requirement R7** and underpin **Milestones M2-M6**, Milestone 1 delivers:
- **Unified Storage Keys & Storage Adapter Specification** (`app_v1_*`)
- **Idempotent Seed Dataset Initializer**
- **3-Tier Reactive Sync Engine**: (1) Browser `storage` event, (2) Custom `shared_store_updated` DOM event, and (3) `BroadcastChannel` inter-context bus
- **Mobile `@react-native-async-storage/async-storage` Integration & Async Bridge**

---

## 2. Storage Adapter Specifications

### 2.1 Storage Key Registry (`app_v1_*`)

All entity collections and app configuration settings stored in browser `localStorage` or mobile `AsyncStorage` MUST use the standardized `app_v1_` namespace prefix to isolate data and prevent key collisions.

| Storage Key | Type | Description | Entity Ref |
|-------------|------|-------------|------------|
| `app_v1_venues` | `Venue[]` | Sports facility venues with sports types, custom hourly rates, working hours, images | Nest.js `Venue` |
| `app_v1_customers` | `Customer[]` | Customer directory with phone, status (`Active`, `On Hold`, `Suspended`, `Inactive`), wallet ID, balance | Nest.js `Customer` |
| `app_v1_users` | `SystemUser[]` | Dashboard staff users with roles (`Admin`, `Employee`, `Manager`, `Owner`) and status | System User |
| `app_v1_wallets` | `Wallet[]` | Digital system wallets for customers | System Wallet |
| `app_v1_transactions` | `WalletTransaction[]` | Financial audit ledger (Refunds, Debits, Admin Cash Payouts, Top-Ups) | Audit Log |
| `app_v1_bookings` | `Booking[]` | Slot reservations across dashboard and mobile app | Nest.js `Booking` |
| `app_v1_active_customer_id` | `string` | Active customer ID driving Mobile App profile/checkout context (Default: `cust-1`) | Session State |

---

### 2.2 Dual-Platform Adapter Abstraction Architecture

Web browser environments (`localStorage`) provide synchronous string-based storage, whereas React Native native environments (`AsyncStorage`) provide asynchronous Promise-based key-value storage. On Expo Web, `AsyncStorage` falls back to `localStorage`.

To ensure single-source implementation contracts:

```
+-----------------------------------------------------------------------+
|                         Unified App Data Store                        |
|   (dashboard/src/data/mockStore.ts  /  services/storageService.ts)    |
+-----------------------------------------------------------------------+
                                   |
                +------------------+------------------+
                |                                     |
                v                                     v
   [Web / SPA / Expo Web]                   [React Native Mobile]
   ----------------------                   ---------------------
   window.localStorage                      @react-native-async-storage
   Synchronous / String API                 Asynchronous Promise API
   Supported by `storage` & BroadcastChannel  Requires async Context/Hook Bridge
```

#### Synchronous Web Adapter (`dashboard/src/data/mockStore.ts`):
- `getItem(key: string): string | null`
- `setItem(key: string, value: string): void`
- `removeItem(key: string): void`

#### Asynchronous Mobile Adapter (`services/storageService.ts`):
- `getItemAsync(key: string): Promise<string | null>`
- `setItemAsync(key: string, value: string): Promise<void>`
- `removeItemAsync(key: string): Promise<void>`

---

### 2.3 Idempotent Seed Initializer Logic

When the app bootstraps (on Dashboard load or Mobile App startup), the storage adapter checks if `app_v1_venues` is populated. If empty or null, it performs an idempotent initialization step writing the complete default mock dataset into storage.

```typescript
export function initializeSeedData(forceReset: boolean = false): void {
  const existingVenues = getItem('app_v1_venues');
  if (!existingVenues || forceReset) {
    setItem('app_v1_venues', JSON.stringify(SEED_VENUES));
    setItem('app_v1_customers', JSON.stringify(SEED_CUSTOMERS));
    setItem('app_v1_users', JSON.stringify(SEED_USERS));
    setItem('app_v1_wallets', JSON.stringify(SEED_WALLETS));
    setItem('app_v1_transactions', JSON.stringify(SEED_TRANSACTIONS));
    setItem('app_v1_bookings', JSON.stringify(SEED_BOOKINGS));
    setItem('app_v1_active_customer_id', 'cust-1');
  }
}
```

---

## 3. Multi-Tab & Reactive Event Synchronization

### 3.1 The 3-Tier Reactive Sync Architecture

Standard `localStorage` mutation in browser JavaScript does NOT trigger the window `storage` event in the same tab that performed the write operation. It only triggers in *other* open tabs.

To solve this and ensure instant state reflection across components, pages, tabs, and platforms, we specify a **3-Tier Sync Strategy**:

```
 [Tab 1 Component Edit] 
         |
         +---> (1) Mutates localStorage.setItem(key, data)
         |
         +---> (2) Dispatches Same-Tab DOM CustomEvent ('shared_store_updated')
         |         ==> Instantly triggers re-renders in Tab 1 React Components
         |
         +---> (3) Posts to BroadcastChannel ('arena_hub_sync')
         |         ==> Instantly triggers listeners in Tab 2, Mobile Web, & Workers
         |
         +---> (4) Browser triggers native window 'storage' event in Tab 2 / Tab 3
```

---

### 3.2 Tier 1: Native Window Storage Event Listener (Cross-Tab Sync)

When an admin updates a customer's status (e.g. to `Suspended`) or processes an admin cash payout in Tab 1:

```typescript
window.addEventListener('storage', (event: StorageEvent) => {
  if (event.key && event.key.startsWith('app_v1_')) {
    notifySubscribers(event.key, event.newValue ? JSON.parse(event.newValue) : null);
  }
});
```

---

### 3.3 Tier 2: Same-Tab Custom DOM Event Dispatcher

When a component in the dashboard creates a venue or booking in the same tab:

```typescript
export function setItem(key: string, value: string): void {
  window.localStorage.setItem(key, value);
  
  // Custom event for same-window subscribers
  const customEvent = new CustomEvent('shared_store_updated', {
    detail: { key, value: JSON.parse(value), timestamp: Date.now() }
  });
  window.dispatchEvent(customEvent);
}

// Subscriber Registration
export function subscribeToStore(callback: (key: string, data: any) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    callback(detail.key, detail.value);
  };
  window.addEventListener('shared_store_updated', handler);
  return () => window.removeEventListener('shared_store_updated', handler);
}
```

---

### 3.4 Tier 3: BroadcastChannel Synchronization

`BroadcastChannel` provides a high-speed, dedicated broadcast channel for all browser contexts sharing the same origin (`http://localhost:5173` or preview URLs).

```typescript
const SYNC_CHANNEL_NAME = 'arena_hub_sync';
let syncChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  
  syncChannel.onmessage = (event: MessageEvent) => {
    const { type, key, payload } = event.data;
    if (type === 'STORE_UPDATE' && key) {
      notifySubscribers(key, payload);
    }
  };
}

export function broadcastUpdate(key: string, payload: any): void {
  if (syncChannel) {
    syncChannel.postMessage({
      type: 'STORE_UPDATE',
      key,
      payload,
      timestamp: Date.now()
    });
  }
}
```

---

## 4. Mobile `@react-native-async-storage/async-storage` Integration

### 4.1 Dependency Installation Blueprint

To integrate `@react-native-async-storage/async-storage` into `D:/test-mobile-app`:

1. Run installation:
   ```bash
   npx expo install @react-native-async-storage/async-storage
   ```
   *Note*: In Expo SDK 54, `npx expo install` automatically selects the verified version (`~2.1.0` or compatible native build for React Native 0.81.5).

2. Verify `package.json` includes:
   ```json
   "dependencies": {
     "@react-native-async-storage/async-storage": "^2.1.0"
   }
   ```

---

### 4.2 Platform-Conditional Mobile Storage Adapter

In `D:/test-mobile-app/services/storageService.ts`:

```typescript
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const mobileStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    }
    return await AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
        window.dispatchEvent(new CustomEvent('shared_store_updated', { detail: { key, value } }));
      }
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
        window.dispatchEvent(new CustomEvent('shared_store_updated', { detail: { key } }));
      }
      return;
    }
    await AsyncStorage.removeItem(key);
  }
};
```

---

### 4.3 Mobile App Async Bridge & Context Integration

Because `AsyncStorage` returns Promises, React components cannot directly call `getItem` synchronously during initial render. Mobile state MUST be managed via a React Context (`AuthContext` or `SharedDataContext`) with async `useEffect` initialization.

#### Reactive State Flow in Mobile App:
1. `AuthProvider` mounts on app start.
2. `useEffect` calls `storageService.getVenues()` and `storageService.getCustomer(activeCustomerId)`.
3. Sets local React `useState` for `venues`, `activeCustomer`, `walletBalance`, and `transactions`.
4. When mobile actions occur (e.g. Pitch Checkout via Wallet or Booking Cancellation):
   - Mutates memory state instantly.
   - Calls `mobileStorageAdapter.setItem(...)` asynchronously.
   - Dispatches transaction entry to `app_v1_transactions`.

---

## 5. Complete Implementation Artifact Specifications

### 5.1 Dashboard Store Implementation (`dashboard/src/data/mockStore.ts`)

Implementers MUST place this file in `D:/test-mobile-app/dashboard/src/data/mockStore.ts` (and expose exports for components):

```typescript
// D:/test-mobile-app/dashboard/src/data/mockStore.ts
export interface Venue {
  id: string;
  name: string;
  sportsTypes: ('5-A-SIDE' | '7-A-SIDE' | '11-A-SIDE' | 'PADEL')[];
  address: string;
  coordinates: { lat: number; lng: number };
  workingHours: { openTime: string; closeTime: string; daysOpen: string[] };
  pricing: { defaultPricePerHour: number; currency: 'EGP' | 'USD'; customHourlyRates: any[] };
  amenities: string[];
  imageUrls: string[];
  rating: number;
  reviewCount: number;
  description: string;
  status: 'Active' | 'Maintenance' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  favoritePosition: string;
  status: 'Active' | 'On Hold' | 'Suspended' | 'Inactive';
  walletId: string;
  walletBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Admin' | 'Employee' | 'Manager' | 'Owner';
  status: 'Active' | 'Inactive';
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  customerId: string;
  customerName: string;
  balance: number;
  currency: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  customerId: string;
  customerName: string;
  type: 'REFUND_CREDIT' | 'BOOKING_DEBIT' | 'ADMIN_PAYOUT' | 'TOP_UP';
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
  createdBy: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  venueId: string;
  venueName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  slotId: string;
  price: number;
  currency: string;
  paymentMethod: 'Wallet Balance' | 'Cash' | 'Credit Card';
  paymentStatus: 'Paid' | 'Pending' | 'Refunded' | 'Partially Refunded';
  status: 'Confirmed' | 'Completed' | 'Cancelled';
  cancellationReason?: string;
  refundOption?: 'FULL' | 'PARTIAL' | 'NONE';
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
}

// Keys
export const STORAGE_KEYS = {
  VENUES: 'app_v1_venues',
  CUSTOMERS: 'app_v1_customers',
  USERS: 'app_v1_users',
  WALLETS: 'app_v1_wallets',
  TRANSACTIONS: 'app_v1_transactions',
  BOOKINGS: 'app_v1_bookings',
  ACTIVE_CUSTOMER_ID: 'app_v1_active_customer_id',
};

// Storage Utilities & Reactive Bus
type Listener = (key: string, data: any) => void;
const listeners: Set<Listener> = new Set();

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  broadcastChannel = new BroadcastChannel('arena_hub_sync');
  broadcastChannel.onmessage = (event) => {
    if (event.data?.type === 'STORE_UPDATE') {
      listeners.forEach(cb => cb(event.data.key, event.data.payload));
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('app_v1_')) {
      const data = e.newValue ? JSON.parse(e.newValue) : null;
      listeners.forEach(cb => cb(e.key!, data));
    }
  });

  window.addEventListener('shared_store_updated', (e: any) => {
    if (e.detail?.key) {
      listeners.forEach(cb => cb(e.detail.key, e.detail.value));
    }
  });
}

export function subscribeToStore(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getStoredData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : fallback;
}

export function setStoredData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  const jsonStr = JSON.stringify(data);
  localStorage.setItem(key, jsonStr);

  window.dispatchEvent(new CustomEvent('shared_store_updated', {
    detail: { key, value: data }
  }));

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'STORE_UPDATE', key, payload: data });
  }
}
```

---

### 5.2 Mobile App Storage Service (`services/storageService.ts`)

Implementers MUST place this file in `D:/test-mobile-app/services/storageService.ts`:

```typescript
// D:/test-mobile-app/services/storageService.ts
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../dashboard/src/data/mockStore'; // or co-located definition

export const storageService = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      if (Platform.OS === 'web') {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      }
      const item = await AsyncStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },

  async set<T>(key: string, data: T): Promise<void> {
    try {
      const json = JSON.stringify(data);
      if (Platform.OS === 'web') {
        localStorage.setItem(key, json);
        window.dispatchEvent(new CustomEvent('shared_store_updated', { detail: { key, value: data } }));
      } else {
        await AsyncStorage.setItem(key, json);
      }
    } catch (e) {
      console.error('Storage set error:', e);
    }
  }
};
```

---

## 6. Implementation Checklist for M1 Developers

- [ ] Install `@react-native-async-storage/async-storage` in `D:/test-mobile-app`.
- [ ] Create `dashboard/src/data/mockStore.ts` with complete `app_v1_*` seed initializers and reactive event bus.
- [ ] Create `services/storageService.ts` in `D:/test-mobile-app`.
- [ ] Update `context/AuthContext.tsx` in Mobile App to load active customer balance and profile from `storageService`.
- [ ] Test cross-tab sync by opening Dashboard and Mobile Web side-by-side in browser windows.
