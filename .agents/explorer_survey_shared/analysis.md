# Data Entities, Schemas, and Shared Persistence Analysis

**Location**: `D:/test-mobile-app/.agents/explorer_survey_shared/analysis.md`  
**Author**: `teamwork_preview_explorer`  
**Date**: 2026-08-07  

---

## 1. Executive Summary

This report surveys the data entities, Nest.js-compatible schemas, mock datasets, and persistence capabilities across the **TailAdmin Admin Dashboard** (`D:/test-mobile-app/dashboard`) and the **Expo Mobile App** (`D:/test-mobile-app`).

Currently:
- **Mobile App**: Uses static array `MOCK_PITCHES` in `D:/test-mobile-app/data/mockPitches.ts` and in-memory React state in `context/AuthContext.tsx`. No local storage or cross-platform state persistence exists.
- **Dashboard**: Uses static mock props inline in template components (e.g. `RecentOrders.tsx`, `BasicTableOne.tsx`). No central state store or local storage persistence exists.

To fulfill **Requirement R7 (Shared Mock Data Store & Persistence)**, both platforms must consume a unified, synchronized mock data store backed by `localStorage` (in browser/dashboard) and `@react-native-async-storage/async-storage` (in mobile React Native, with `localStorage` fallback for Expo Web).

---

## 2. Entity Mapping & Nest.js Schemas Specification

The prototype requires 6 primary data entities. Below are the exact TypeScript interfaces matching Nest.js DTO/entity standards.

### 2.1 Venue Entity (matching Nest.js `Venue` Schema)
Represents sports facilities listed on the dashboard and mobile app.
```typescript
export interface CustomPricingRate {
  id: string;
  startHour: string; // e.g. "18:00"
  endHour: string;   // e.g. "23:00"
  pricePerHour: number;
}

export interface Venue {
  id: string;
  name: string;
  sportsTypes: ('5-A-SIDE' | '7-A-SIDE' | '11-A-SIDE' | 'PADEL')[];
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  workingHours: {
    openTime: string;  // e.g. "08:00 AM"
    closeTime: string; // e.g. "02:00 AM"
    daysOpen: string[];
  };
  pricing: {
    defaultPricePerHour: number;
    currency: 'EGP' | 'USD';
    customHourlyRates: CustomPricingRate[];
  };
  amenities: string[];
  imageUrls: string[];
  rating: number;
  reviewCount: number;
  description: string;
  status: 'Active' | 'Maintenance' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}
```

### 2.2 Customer Entity & Status Enforcement
Represents mobile app users / customers managed by admins in the dashboard.
```typescript
export type CustomerStatus = 'Active' | 'On Hold' | 'Suspended' | 'Inactive';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  favoritePosition: string; // e.g. 'Midfielder', 'Forward'
  status: CustomerStatus;
  walletId: string;
  walletBalance: number;
  createdAt: string;
  updatedAt: string;
}
```
**Status Enforcement Rules**:
1. `Active`: Full access across Dashboard and Mobile App.
2. `On Hold`: Full access with notification banner alerting user to contact staff.
3. `Suspended`: BLOCKS pitch slot checkout and wallet transactions (modal pops up blocking action).
4. `Inactive`: Archived account; prompts re-verification upon login.

### 2.3 System User Entity (Dashboard Admin/Employee Users)
Represents staff members managing the venue dashboard.
```typescript
export type UserRole = 'Admin' | 'Employee' | 'Manager' | 'Owner';
export type UserStatus = 'Active' | 'Inactive';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2.4 System Wallet Entity
Represents the customer's dedicated digital wallet for booking payments and refunds.
```typescript
export interface Wallet {
  id: string;
  customerId: string;
  customerName: string;
  balance: number;
  currency: string; // 'EGP'
  updatedAt: string;
}
```

### 2.5 Transaction Entity (Wallet Audit Log)
Tracks all financial movements affecting customer wallet balances.
```typescript
export type TransactionType = 'REFUND_CREDIT' | 'BOOKING_DEBIT' | 'ADMIN_PAYOUT' | 'TOP_UP';

export interface WalletTransaction {
  id: string;
  walletId: string;
  customerId: string;
  customerName: string;
  type: TransactionType;
  amount: number; // Positive for credits/topups, negative for debits/payouts
  balanceAfter: number;
  description: string;
  referenceId?: string; // e.g., bookingId
  createdBy: string;    // 'System', 'Admin (Sarah)', 'Customer'
  createdAt: string;
}
```

### 2.6 Booking Entity
Represents pitch reservations made via Mobile App or Dashboard Standalone Booking Page.
```typescript
export type PaymentMethod = 'Wallet Balance' | 'Cash' | 'Credit Card';
export type PaymentStatus = 'Paid' | 'Pending' | 'Refunded' | 'Partially Refunded';
export type BookingStatus = 'Confirmed' | 'Completed' | 'Cancelled';

export interface Booking {
  id: string;
  venueId: string;
  venueName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // e.g. "06:00 PM"
  endTime: string;    // e.g. "07:00 PM"
  slotId: string;
  price: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  cancellationReason?: string;
  refundOption?: 'FULL' | 'PARTIAL' | 'NONE';
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Analysis of Existing Mock Data & Storage Mechanisms

### 3.1 Mobile App Existing Implementation
- **File**: `D:/test-mobile-app/data/mockPitches.ts`
- **Data**: Static `MOCK_PITCHES` array containing 4 pitches (`arena-1`, `champions-stadium`, `santiago-padel`, `metro-arena`).
- **Authentication/Session**: `D:/test-mobile-app/context/AuthContext.tsx` maintains user profile (`name`, `phone`, `authMethod`, `favoritePosition`) in memory via React state. Re-evaluates to `isAuthenticated: false` on app reload.
- **Deficiencies**:
  - No customer ID linked to system wallets.
  - Wallet balance display and wallet checkout option missing.
  - No persistent storage (`@react-native-async-storage/async-storage` not installed/configured).
  - Pitch dates are hardcoded strings ("24 MAY", "25 MAY").

### 3.2 Dashboard Existing Implementation
- **File**: `D:/test-mobile-app/dashboard/src/App.tsx`
- **Data**: Static dummy tables (`BasicTableOne.tsx`, `RecentOrders.tsx`) with hardcoded eCommerce sales data.
- **Deficiencies**:
  - No Venue CRUD, Customer list, System User list, or Booking state.
  - No shared storage or sync mechanisms.

---

## 4. Shared Mock Data Store Architecture (R7 Specification)

### 4.1 Storage Keys Standard
All keys stored in `localStorage` or `AsyncStorage` follow the prefix `app_v1_`:
- `app_v1_venues`: Array of `Venue`
- `app_v1_customers`: Array of `Customer`
- `app_v1_wallets`: Array of `Wallet`
- `app_v1_transactions`: Array of `WalletTransaction`
- `app_v1_bookings`: Array of `Booking`
- `app_v1_users`: Array of `SystemUser`
- `app_v1_active_customer_id`: Active Customer ID for Mobile App simulation (default: `cust-1`)

### 4.2 Cross-Platform Storage Adapter (`storageAdapter.ts`)
Provides unified async/sync calls working seamlessly across Vite React SPA and Expo Web / React Native:

```typescript
// Unified Storage Adapter
export const storageAdapter = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key);
      // Dispatch custom same-tab event
      window.dispatchEvent(new CustomEvent('shared_store_updated', { detail: { key, value } }));
    }
  },
  removeItem: (key: string): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      window.dispatchEvent(new CustomEvent('shared_store_updated', { detail: { key } }));
    }
  }
};
```

### 4.3 Real-Time Sync & Reactive Event System
To ensure changes made in Dashboard immediately update Mobile App (and vice versa):
1. **Window Storage Event**: Listens to `window.addEventListener('storage', ...)` for multi-tab browser synchronization.
2. **Custom Window Event**: Listens to `shared_store_updated` for instant single-page component re-renders without full page reloads.
3. **BroadcastChannel**: Broadcaster for instantaneous cross-context messaging (`new BroadcastChannel('shared_store_channel')`).

---

## 5. Seed Datasets Specification

When the app initializes and storage keys are empty, the store will populate with the following default records:

### 5.1 Default Venues (4 Items)
1. **ARENA 1** (`arena-1`): 5-A-SIDE, Zayed Sports Hub, Cairo, 200 EGP/hr.
2. **CHAMPIONS PARK** (`champions-stadium`): 11-A-SIDE, Olympic City, New Cairo, 450 EGP/hr.
3. **SANTIAGO PADEL CLUB** (`santiago-padel`): PADEL, District 5, Katameya, 300 EGP/hr.
4. **METRO ARENA 7** (`metro-arena`): 7-A-SIDE, Maadi Sports Club, Cairo, 280 EGP/hr.

### 5.2 Default Customers with Status Variations (5 Items)
1. **Ahmed Hassan** (`cust-1`): Status: `Active`, Phone: `+201001234567`, Favorite Position: `Midfielder`, Wallet: 1500 EGP.
2. **Mohamed Salah** (`cust-2`): Status: `Active`, Phone: `+201119876543`, Favorite Position: `Forward`, Wallet: 3200 EGP.
3. **Omar Ramsey** (`cust-3`): Status: `On Hold`, Phone: `+201223334444`, Favorite Position: `Defender`, Wallet: 400 EGP. *(Displays warning banner)*
4. **Youssef Ibrahim** (`cust-4`): Status: `Suspended`, Phone: `+201556667777`, Favorite Position: `Goalkeeper`, Wallet: 0 EGP. *(Blocked from checkout)*
5. **Karim Zaki** (`cust-5`): Status: `Inactive`, Phone: `+201098889999`, Favorite Position: `Winger`, Wallet: 100 EGP. *(Prompts re-verification)*

### 5.3 Default System Users (4 Items)
1. **Sarah Admin** (`user-1`): Role: `Admin`, Status: `Active`, Email: `sarah.admin@venueops.com`
2. **Khaled Staff** (`user-2`): Role: `Employee`, Status: `Active`, Email: `khaled.staff@venueops.com`
3. **Tarek Manager** (`user-3`): Role: `Manager`, Status: `Active`, Email: `tarek.manager@venueops.com`
4. **Hany Owner** (`user-4`): Role: `Owner`, Status: `Active`, Email: `hany.owner@venueops.com`

### 5.4 Default Bookings (6 Items)
Covers active, completed, and cancelled bookings with full/partial refunds for report charts and calendars.

### 5.5 Default Transactions (8 Items)
Audit entries for top-ups, booking debits, refunds, and manual admin cash payouts.

---

## 6. Implementation Action Plan for Implementers

1. **Create Shared Store Utility (`sharedStore.ts`)**:
   Place unified store file in both `dashboard/src/services/sharedStore.ts` and `src/services/sharedStore.ts` (or import from shared location).
2. **Connect Dashboard Modules**:
   - Customer Management (`/customers`): CRUD + manual cash payout modal.
   - User Management (`/users`): List, search, edit roles, toggle status.
   - Venue Management (`/venues`): CRUD matching `Venue` schema.
   - Full-Screen Booking (`/bookings/fullscreen`): Slot grid + refund modal.
   - Reports Page (`/reports`): ApexCharts fed from shared storage bookings/transactions.
3. **Connect Mobile App**:
   - Pitch list and details screens: Load venues from shared store.
   - Wallet view & checkout: Use live wallet balance and deduct payments.
   - Cancellation refund: Automatically credit system wallet balance and log transaction.
   - Customer status enforcement: Block checkout if `Suspended`, show banner if `On Hold`.
