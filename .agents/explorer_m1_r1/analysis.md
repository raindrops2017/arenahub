# Milestone 1 Technical Specification & Implementation Blueprint

**Target Directory**: `D:/test-mobile-app/.agents/explorer_m1_r1/analysis.md`  
**Author**: `teamwork_preview_explorer`  
**Date**: 2026-08-07  
**Milestone**: M1 — Shared Mock Data Store & Persistence  

---

## 1. Executive Summary & Architecture Overview

Milestone 1 establishes the unified data foundation for both the **TailAdmin Admin Dashboard** (`D:/test-mobile-app/dashboard`) and the **Expo Mobile App** (`D:/test-mobile-app`).

To enable seamless client demonstration without a live backend server, M1 provides:
1. **Shared TypeScript Entity Definitions**: Nest.js DTO-compliant interfaces for `Venue`, `Customer`, `SystemUser`, `Wallet`, `WalletTransaction`, and `Booking`.
2. **Dashboard Reactive Mock Store (`mockStore.ts`)**: Browser `localStorage` engine with `window.storage` multi-tab sync, custom same-window event dispatchers, and seed datasets.
3. **Mobile App Storage Service (`storageService.ts`)**: Expo SDK v54 `@react-native-async-storage/async-storage` wrapper with fallback to `localStorage` for web view mode.
4. **Synchronized Storage Keys (`app_v1_*`)**: Shared key schema allowing live cross-platform reactive state updates.

---

## 2. Shared TypeScript Types Blueprint

Create identical type definition files at:
- `D:/test-mobile-app/dashboard/src/types/index.ts`
- `D:/test-mobile-app/types/index.ts`

### 2.1 File Content Blueprint
```typescript
// Shared Types matching Nest.js Schemas

export type SportsType = '5-A-SIDE' | '7-A-SIDE' | '11-A-SIDE' | 'PADEL';
export type VenueStatus = 'Active' | 'Maintenance' | 'Inactive';

export interface CustomPricingRate {
  id: string;
  startHour: string; // e.g. "18:00"
  endHour: string;   // e.g. "23:00"
  pricePerHour: number;
}

export interface Venue {
  id: string;
  name: string;
  sportsTypes: SportsType[];
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
  status: VenueStatus;
  createdAt: string;
  updatedAt: string;
}

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

export interface Wallet {
  id: string;
  customerId: string;
  customerName: string;
  balance: number;
  currency: string; // 'EGP'
  updatedAt: string;
}

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

## 3. Dashboard Persistent Mock Store Blueprint (`mockStore.ts`)

Create file at `D:/test-mobile-app/dashboard/src/data/mockStore.ts`.

### 3.1 Storage Keys
```typescript
export const STORAGE_KEYS = {
  VENUES: 'app_v1_venues',
  CUSTOMERS: 'app_v1_customers',
  USERS: 'app_v1_users',
  WALLETS: 'app_v1_wallets',
  TRANSACTIONS: 'app_v1_transactions',
  BOOKINGS: 'app_v1_bookings',
  ACTIVE_CUSTOMER_ID: 'app_v1_active_customer_id',
} as const;
```

### 3.2 Seed Initial Data Sets
```typescript
export const SEED_VENUES: Venue[] = [
  {
    id: 'arena-1',
    name: 'ARENA 1 - Zayed Sports Hub',
    sportsTypes: ['5-A-SIDE', '7-A-SIDE'],
    address: 'El-Bustan St, Sheikh Zayed City, Giza',
    coordinates: { lat: 30.0444, lng: 30.9833 },
    workingHours: { openTime: '08:00 AM', closeTime: '02:00 AM', daysOpen: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    pricing: {
      defaultPricePerHour: 200,
      currency: 'EGP',
      customHourlyRates: [
        { id: 'rate-1', startHour: '18:00', endHour: '00:00', pricePerHour: 280 }
      ]
    },
    amenities: ['Floodlights', 'Changing Rooms', 'Showers', 'Parking', 'Cafeteria'],
    imageUrls: ['https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800'],
    rating: 4.8,
    reviewCount: 42,
    description: 'Premier 5-a-side turf pitch equipped with high-intensity LED floodlights.',
    status: 'Active',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-08-01T12:00:00Z',
  },
  {
    id: 'champions-stadium',
    name: 'CHAMPIONS PARK',
    sportsTypes: ['11-A-SIDE', '7-A-SIDE'],
    address: 'Olympic City, New Cairo',
    coordinates: { lat: 30.0255, lng: 31.4912 },
    workingHours: { openTime: '09:00 AM', closeTime: '12:00 AM', daysOpen: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    pricing: {
      defaultPricePerHour: 450,
      currency: 'EGP',
      customHourlyRates: []
    },
    amenities: ['FIFA Turf', 'VIP Locker Rooms', 'Spectator Stand', 'Medical Room'],
    imageUrls: ['https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800'],
    rating: 4.9,
    reviewCount: 88,
    description: 'Full-size 11-a-side stadium turf for professional and amateur tournaments.',
    status: 'Active',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-08-02T12:00:00Z',
  },
  {
    id: 'santiago-padel',
    name: 'SANTIAGO PADEL CLUB',
    sportsTypes: ['PADEL'],
    address: 'District 5, Katameya, Cairo',
    coordinates: { lat: 29.9911, lng: 31.4233 },
    workingHours: { openTime: '07:00 AM', closeTime: '01:00 AM', daysOpen: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    pricing: {
      defaultPricePerHour: 300,
      currency: 'EGP',
      customHourlyRates: [
        { id: 'rate-padel-1', startHour: '17:00', endHour: '23:00', pricePerHour: 380 }
      ]
    },
    amenities: ['Panoramic Glass Courts', 'Racket Rental', 'Air Conditioned Lounge', 'Juice Bar'],
    imageUrls: ['https://images.unsplash.com/photo-1626248801379-51a0748a5f96?w=800'],
    rating: 4.7,
    reviewCount: 31,
    description: 'Modern indoor/outdoor padel tennis courts with world-class glass walls.',
    status: 'Active',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-08-05T12:00:00Z',
  },
  {
    id: 'metro-arena',
    name: 'METRO ARENA 7',
    sportsTypes: ['7-A-SIDE'],
    address: 'Maadi Sports Club, Road 9, Cairo',
    coordinates: { lat: 29.9602, lng: 31.2569 },
    workingHours: { openTime: '08:00 AM', closeTime: '12:00 AM', daysOpen: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    pricing: {
      defaultPricePerHour: 280,
      currency: 'EGP',
      customHourlyRates: []
    },
    amenities: ['Syntethic Grass', 'Night Lighting', 'Cafeteria', 'Free WiFi'],
    imageUrls: ['https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800'],
    rating: 4.6,
    reviewCount: 54,
    description: 'Spacious 7-a-side pitch located in the heart of Maadi.',
    status: 'Active',
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-08-04T12:00:00Z',
  }
];

export const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Ahmed Hassan',
    phone: '+201001234567',
    email: 'ahmed.hassan@gmail.com',
    favoritePosition: 'Midfielder',
    status: 'Active',
    walletId: 'wall-1',
    walletBalance: 1500,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-08-07T10:00:00Z',
  },
  {
    id: 'cust-2',
    name: 'Mohamed Salah',
    phone: '+201119876543',
    email: 'mo.salah@gmail.com',
    favoritePosition: 'Forward',
    status: 'Active',
    walletId: 'wall-2',
    walletBalance: 3200,
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z',
  },
  {
    id: 'cust-3',
    name: 'Omar Ramsey',
    phone: '+201223334444',
    email: 'omar.ramsey@yahoo.com',
    favoritePosition: 'Defender',
    status: 'On Hold',
    walletId: 'wall-3',
    walletBalance: 400,
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-08-05T10:00:00Z',
  },
  {
    id: 'cust-4',
    name: 'Youssef Ibrahim',
    phone: '+201556667777',
    email: 'youssef.ibrahim@outlook.com',
    favoritePosition: 'Goalkeeper',
    status: 'Suspended',
    walletId: 'wall-4',
    walletBalance: 0,
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-08-04T10:00:00Z',
  },
  {
    id: 'cust-5',
    name: 'Karim Zaki',
    phone: '+201098889999',
    email: 'karim.zaki@gmail.com',
    favoritePosition: 'Winger',
    status: 'Inactive',
    walletId: 'wall-5',
    walletBalance: 100,
    createdAt: '2026-04-15T10:00:00Z',
    updatedAt: '2026-08-03T10:00:00Z',
  }
];

export const SEED_USERS: SystemUser[] = [
  {
    id: 'user-1',
    name: 'Sarah Admin',
    email: 'sarah.admin@venueops.com',
    phone: '+201000000001',
    role: 'Admin',
    status: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'user-2',
    name: 'Khaled Staff',
    email: 'khaled.staff@venueops.com',
    phone: '+201000000002',
    role: 'Employee',
    status: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    createdAt: '2026-01-05T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'user-3',
    name: 'Tarek Manager',
    email: 'tarek.manager@venueops.com',
    phone: '+201000000003',
    role: 'Manager',
    status: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    createdAt: '2026-01-08T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'user-4',
    name: 'Hany Owner',
    email: 'hany.owner@venueops.com',
    phone: '+201000000004',
    role: 'Owner',
    status: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    createdAt: '2026-01-02T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  }
];

export const SEED_WALLETS: Wallet[] = [
  { id: 'wall-1', customerId: 'cust-1', customerName: 'Ahmed Hassan', balance: 1500, currency: 'EGP', updatedAt: '2026-08-07T10:00:00Z' },
  { id: 'wall-2', customerId: 'cust-2', customerName: 'Mohamed Salah', balance: 3200, currency: 'EGP', updatedAt: '2026-08-06T10:00:00Z' },
  { id: 'wall-3', customerId: 'cust-3', customerName: 'Omar Ramsey', balance: 400, currency: 'EGP', updatedAt: '2026-08-05T10:00:00Z' },
  { id: 'wall-4', customerId: 'cust-4', customerName: 'Youssef Ibrahim', balance: 0, currency: 'EGP', updatedAt: '2026-08-04T10:00:00Z' },
  { id: 'wall-5', customerId: 'cust-5', customerName: 'Karim Zaki', balance: 100, currency: 'EGP', updatedAt: '2026-08-03T10:00:00Z' },
];

export const SEED_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'tx-1',
    walletId: 'wall-1',
    customerId: 'cust-1',
    customerName: 'Ahmed Hassan',
    type: 'TOP_UP',
    amount: 2000,
    balanceAfter: 2000,
    description: 'Initial Wallet Top Up',
    createdBy: 'Customer',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'tx-2',
    walletId: 'wall-1',
    customerId: 'cust-1',
    customerName: 'Ahmed Hassan',
    type: 'BOOKING_DEBIT',
    amount: -500,
    balanceAfter: 1500,
    description: 'Booking payment for ARENA 1 slot',
    referenceId: 'book-1',
    createdBy: 'System',
    createdAt: '2026-08-05T14:00:00Z',
  },
  {
    id: 'tx-3',
    walletId: 'wall-2',
    customerId: 'cust-2',
    customerName: 'Mohamed Salah',
    type: 'TOP_UP',
    amount: 4000,
    balanceAfter: 4000,
    description: 'Online Credit Card Top Up',
    createdBy: 'Customer',
    createdAt: '2026-08-02T11:00:00Z',
  },
  {
    id: 'tx-4',
    walletId: 'wall-2',
    customerId: 'cust-2',
    customerName: 'Mohamed Salah',
    type: 'BOOKING_DEBIT',
    amount: -800,
    balanceAfter: 3200,
    description: 'Booking payment for CHAMPIONS PARK',
    referenceId: 'book-2',
    createdBy: 'System',
    createdAt: '2026-08-06T16:00:00Z',
  },
  {
    id: 'tx-5',
    walletId: 'wall-1',
    customerId: 'cust-1',
    customerName: 'Ahmed Hassan',
    type: 'REFUND_CREDIT',
    amount: 300,
    balanceAfter: 1800,
    description: 'Full refund for cancelled slot',
    referenceId: 'book-3',
    createdBy: 'Admin (Sarah)',
    createdAt: '2026-08-07T09:00:00Z',
  },
  {
    id: 'tx-6',
    walletId: 'wall-1',
    customerId: 'cust-1',
    customerName: 'Ahmed Hassan',
    type: 'ADMIN_PAYOUT',
    amount: -300,
    balanceAfter: 1500,
    description: 'Manual Cash Payout by Admin Sarah',
    createdBy: 'Admin (Sarah)',
    createdAt: '2026-08-07T09:30:00Z',
  }
];

export const SEED_BOOKINGS: Booking[] = [
  {
    id: 'book-1',
    venueId: 'arena-1',
    venueName: 'ARENA 1 - Zayed Sports Hub',
    customerId: 'cust-1',
    customerName: 'Ahmed Hassan',
    customerPhone: '+201001234567',
    date: '2026-08-07',
    startTime: '06:00 PM',
    endTime: '07:00 PM',
    slotId: 'slot-18-19',
    price: 280,
    currency: 'EGP',
    paymentMethod: 'Wallet Balance',
    paymentStatus: 'Paid',
    status: 'Confirmed',
    createdAt: '2026-08-05T14:00:00Z',
    updatedAt: '2026-08-05T14:00:00Z',
  },
  {
    id: 'book-2',
    venueId: 'champions-stadium',
    venueName: 'CHAMPIONS PARK',
    customerId: 'cust-2',
    customerName: 'Mohamed Salah',
    customerPhone: '+201119876543',
    date: '2026-08-07',
    startTime: '08:00 PM',
    endTime: '09:00 PM',
    slotId: 'slot-20-21',
    price: 450,
    currency: 'EGP',
    paymentMethod: 'Credit Card',
    paymentStatus: 'Paid',
    status: 'Confirmed',
    createdAt: '2026-08-06T16:00:00Z',
    updatedAt: '2026-08-06T16:00:00Z',
  },
  {
    id: 'book-3',
    venueId: 'santiago-padel',
    venueName: 'SANTIAGO PADEL CLUB',
    customerId: 'cust-1',
    customerName: 'Ahmed Hassan',
    customerPhone: '+201001234567',
    date: '2026-08-08',
    startTime: '07:00 PM',
    endTime: '08:00 PM',
    slotId: 'slot-19-20',
    price: 380,
    currency: 'EGP',
    paymentMethod: 'Wallet Balance',
    paymentStatus: 'Refunded',
    status: 'Cancelled',
    cancellationReason: 'Schedule conflict',
    refundOption: 'FULL',
    refundAmount: 380,
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-07T09:00:00Z',
  },
  {
    id: 'book-4',
    venueId: 'metro-arena',
    venueName: 'METRO ARENA 7',
    customerId: 'cust-3',
    customerName: 'Omar Ramsey',
    customerPhone: '+201223334444',
    date: '2026-08-07',
    startTime: '09:00 PM',
    endTime: '10:00 PM',
    slotId: 'slot-21-22',
    price: 280,
    currency: 'EGP',
    paymentMethod: 'Cash',
    paymentStatus: 'Pending',
    status: 'Confirmed',
    createdAt: '2026-08-07T08:00:00Z',
    updatedAt: '2026-08-07T08:00:00Z',
  }
];
```

### 3.3 Storage Engine Implementation Blueprint
```typescript
import {
  Venue, Customer, SystemUser, Wallet, WalletTransaction, Booking,
  CustomerStatus, PaymentMethod
} from '../types';

export const EVENT_NAME = 'app_v1_store_updated';

function notifyListeners() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }
}

export function initMockStore(): void {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(STORAGE_KEYS.VENUES)) {
    localStorage.setItem(STORAGE_KEYS.VENUES, JSON.stringify(SEED_VENUES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(SEED_CUSTOMERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.WALLETS)) {
    localStorage.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(SEED_WALLETS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(SEED_TRANSACTIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(SEED_BOOKINGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_CUSTOMER_ID)) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CUSTOMER_ID, 'cust-1');
  }
}

// Subscriptions
export function subscribeStoreChange(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = () => callback();
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key && Object.values(STORAGE_KEYS).includes(e.key as any)) {
      callback();
    }
  };

  window.addEventListener(EVENT_NAME, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

// Getters
export function getVenues(): Venue[] {
  initMockStore();
  const raw = localStorage.getItem(STORAGE_KEYS.VENUES);
  return raw ? JSON.parse(raw) : SEED_VENUES;
}

export function getCustomers(): Customer[] {
  initMockStore();
  const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
  return raw ? JSON.parse(raw) : SEED_CUSTOMERS;
}

export function getUsers(): SystemUser[] {
  initMockStore();
  const raw = localStorage.getItem(STORAGE_KEYS.USERS);
  return raw ? JSON.parse(raw) : SEED_USERS;
}

export function getWallets(): Wallet[] {
  initMockStore();
  const raw = localStorage.getItem(STORAGE_KEYS.WALLETS);
  return raw ? JSON.parse(raw) : SEED_WALLETS;
}

export function getTransactions(): WalletTransaction[] {
  initMockStore();
  const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  return raw ? JSON.parse(raw) : SEED_TRANSACTIONS;
}

export function getBookings(): Booking[] {
  initMockStore();
  const raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
  return raw ? JSON.parse(raw) : SEED_BOOKINGS;
}

export function getActiveCustomerId(): string {
  initMockStore();
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_CUSTOMER_ID) || 'cust-1';
}

// Save Helpers
export function saveVenues(venues: Venue[]): void {
  localStorage.setItem(STORAGE_KEYS.VENUES, JSON.stringify(venues));
  notifyListeners();
}

export function saveCustomers(customers: Customer[]): void {
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  notifyListeners();
}

export function saveUsers(users: SystemUser[]): void {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  notifyListeners();
}

export function saveWallets(wallets: Wallet[]): void {
  localStorage.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(wallets));
  notifyListeners();
}

export function saveTransactions(txs: WalletTransaction[]): void {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
  notifyListeners();
}

export function saveBookings(bookings: Booking[]): void {
  localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  notifyListeners();
}

export function setActiveCustomerId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_CUSTOMER_ID, id);
  notifyListeners();
}

// Business Mutations
export function addVenue(venueData: Omit<Venue, 'id' | 'createdAt' | 'updatedAt'>): Venue {
  const venues = getVenues();
  const now = new Date().toISOString();
  const newVenue: Venue = {
    ...venueData,
    id: `venue-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };
  venues.unshift(newVenue);
  saveVenues(venues);
  return newVenue;
}

export function updateVenue(id: string, updates: Partial<Venue>): Venue {
  const venues = getVenues();
  const idx = venues.findIndex(v => v.id === id);
  if (idx === -1) throw new Error('Venue not found');
  const updated: Venue = { ...venues[idx], ...updates, updatedAt: new Date().toISOString() };
  venues[idx] = updated;
  saveVenues(venues);
  return updated;
}

export function deleteVenue(id: string): void {
  const venues = getVenues().filter(v => v.id !== id);
  saveVenues(venues);
}

export function addCustomer(customerData: Omit<Customer, 'id' | 'walletId' | 'createdAt' | 'updatedAt'> & { initialBalance?: number }): Customer {
  const customers = getCustomers();
  const wallets = getWallets();
  const now = new Date().toISOString();
  const custId = `cust-${Date.now()}`;
  const wallId = `wall-${Date.now()}`;
  const initialBalance = customerData.initialBalance || 0;

  const newWallet: Wallet = {
    id: wallId,
    customerId: custId,
    customerName: customerData.name,
    balance: initialBalance,
    currency: 'EGP',
    updatedAt: now,
  };

  const newCustomer: Customer = {
    id: custId,
    name: customerData.name,
    phone: customerData.phone,
    email: customerData.email,
    favoritePosition: customerData.favoritePosition || 'Midfielder',
    status: customerData.status || 'Active',
    walletId: wallId,
    walletBalance: initialBalance,
    createdAt: now,
    updatedAt: now,
  };

  wallets.push(newWallet);
  customers.unshift(newCustomer);
  saveWallets(wallets);
  saveCustomers(customers);

  if (initialBalance > 0) {
    const txs = getTransactions();
    txs.unshift({
      id: `tx-${Date.now()}`,
      walletId: wallId,
      customerId: custId,
      customerName: customerData.name,
      type: 'TOP_UP',
      amount: initialBalance,
      balanceAfter: initialBalance,
      description: 'Initial balance credit on registration',
      createdBy: 'Admin',
      createdAt: now,
    });
    saveTransactions(txs);
  }

  return newCustomer;
}

export function updateCustomer(id: string, updates: Partial<Customer>): Customer {
  const customers = getCustomers();
  const idx = customers.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Customer not found');
  const updated: Customer = { ...customers[idx], ...updates, updatedAt: new Date().toISOString() };
  customers[idx] = updated;
  saveCustomers(customers);
  return updated;
}

export function processAdminCashPayout(customerId: string, amount: number, note: string, adminName: string): WalletTransaction {
  const customers = getCustomers();
  const wallets = getWallets();
  const txs = getTransactions();

  const custIdx = customers.findIndex(c => c.id === customerId);
  if (custIdx === -1) throw new Error('Customer not found');
  const cust = customers[custIdx];

  if (cust.status === 'Suspended') {
    throw new Error('Wallet transactions are blocked for Suspended customers');
  }
  if (cust.walletBalance < amount) {
    throw new Error('Insufficient wallet balance for cash payout');
  }

  const newBalance = cust.walletBalance - amount;
  cust.walletBalance = newBalance;
  cust.updatedAt = new Date().toISOString();
  customers[custIdx] = cust;

  const wallIdx = wallets.findIndex(w => w.customerId === customerId);
  if (wallIdx !== -1) {
    wallets[wallIdx].balance = newBalance;
    wallets[wallIdx].updatedAt = new Date().toISOString();
  }

  const newTx: WalletTransaction = {
    id: `tx-${Date.now()}`,
    walletId: cust.walletId,
    customerId: cust.id,
    customerName: cust.name,
    type: 'ADMIN_PAYOUT',
    amount: -amount,
    balanceAfter: newBalance,
    description: `Manual Cash Payout: ${note}`,
    createdBy: adminName,
    createdAt: new Date().toISOString(),
  };

  txs.unshift(newTx);

  saveCustomers(customers);
  saveWallets(wallets);
  saveTransactions(txs);

  return newTx;
}

export function addBooking(bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Booking {
  const customers = getCustomers();
  const wallets = getWallets();
  const bookings = getBookings();
  const txs = getTransactions();

  const cust = customers.find(c => c.id === bookingData.customerId);
  if (cust && cust.status === 'Suspended') {
    throw new Error('Suspended customers are blocked from booking pitch slots');
  }

  if (bookingData.paymentMethod === 'Wallet Balance') {
    if (!cust || cust.walletBalance < bookingData.price) {
      throw new Error('Insufficient wallet balance to place booking');
    }

    const newBalance = cust.walletBalance - bookingData.price;
    cust.walletBalance = newBalance;
    cust.updatedAt = new Date().toISOString();
    saveCustomers(customers);

    const wallIdx = wallets.findIndex(w => w.customerId === cust.id);
    if (wallIdx !== -1) {
      wallets[wallIdx].balance = newBalance;
      saveWallets(wallets);
    }

    const now = new Date().toISOString();
    const bookId = `book-${Date.now()}`;
    const newBooking: Booking = {
      ...bookingData,
      id: bookId,
      paymentStatus: 'Paid',
      status: 'Confirmed',
      createdAt: now,
      updatedAt: now,
    };

    txs.unshift({
      id: `tx-${Date.now()}`,
      walletId: cust.walletId,
      customerId: cust.id,
      customerName: cust.name,
      type: 'BOOKING_DEBIT',
      amount: -bookingData.price,
      balanceAfter: newBalance,
      description: `Pitch Booking Debit - ${bookingData.venueName}`,
      referenceId: bookId,
      createdBy: 'Customer',
      createdAt: now,
    });

    bookings.unshift(newBooking);
    saveBookings(bookings);
    saveTransactions(txs);
    return newBooking;
  } else {
    const now = new Date().toISOString();
    const newBooking: Booking = {
      ...bookingData,
      id: `book-${Date.now()}`,
      paymentStatus: bookingData.paymentMethod === 'Credit Card' ? 'Paid' : 'Pending',
      status: 'Confirmed',
      createdAt: now,
      updatedAt: now,
    };
    bookings.unshift(newBooking);
    saveBookings(bookings);
    return newBooking;
  }
}

export function cancelBooking(bookingId: string, refundOption: 'FULL' | 'PARTIAL' | 'NONE', reason: string, partialAmount?: number): Booking {
  const bookings = getBookings();
  const customers = getCustomers();
  const wallets = getWallets();
  const txs = getTransactions();

  const idx = bookings.findIndex(b => b.id === bookingId);
  if (idx === -1) throw new Error('Booking not found');

  const b = bookings[idx];
  let refundAmt = 0;
  if (refundOption === 'FULL') {
    refundAmt = b.price;
  } else if (refundOption === 'PARTIAL') {
    refundAmt = partialAmount || Math.round(b.price / 2);
  }

  const updatedBooking: Booking = {
    ...b,
    status: 'Cancelled',
    paymentStatus: refundAmt > 0 ? (refundAmt === b.price ? 'Refunded' : 'Partially Refunded') : b.paymentStatus,
    cancellationReason: reason,
    refundOption,
    refundAmount: refundAmt,
    updatedAt: new Date().toISOString(),
  };

  bookings[idx] = updatedBooking;
  saveBookings(bookings);

  if (refundAmt > 0 && b.customerId) {
    const custIdx = customers.findIndex(c => c.id === b.customerId);
    if (custIdx !== -1) {
      const cust = customers[custIdx];
      const newBalance = cust.walletBalance + refundAmt;
      cust.walletBalance = newBalance;
      cust.updatedAt = new Date().toISOString();
      customers[custIdx] = cust;
      saveCustomers(customers);

      const wallIdx = wallets.findIndex(w => w.customerId === cust.id);
      if (wallIdx !== -1) {
        wallets[wallIdx].balance = newBalance;
        saveWallets(wallets);
      }

      txs.unshift({
        id: `tx-${Date.now()}`,
        walletId: cust.walletId,
        customerId: cust.id,
        customerName: cust.name,
        type: 'REFUND_CREDIT',
        amount: refundAmt,
        balanceAfter: newBalance,
        description: `Booking Refund (${refundOption}): ${reason}`,
        referenceId: b.id,
        createdBy: 'System',
        createdAt: new Date().toISOString(),
      });
      saveTransactions(txs);
    }
  }

  return updatedBooking;
}
```

---

## 4. Mobile App Storage Service Blueprint (`storageService.ts`)

Create file at `D:/test-mobile-app/services/storageService.ts`.

### 4.1 Storage Implementation Blueprint
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Venue, Customer, Wallet, WalletTransaction, Booking,
  CustomerStatus, PaymentMethod
} from '../types';

export const STORAGE_KEYS = {
  VENUES: 'app_v1_venues',
  CUSTOMERS: 'app_v1_customers',
  USERS: 'app_v1_users',
  WALLETS: 'app_v1_wallets',
  TRANSACTIONS: 'app_v1_transactions',
  BOOKINGS: 'app_v1_bookings',
  ACTIVE_CUSTOMER_ID: 'app_v1_active_customer_id',
};

// Safe storage wrapper for React Native + Web
const storageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) return val;
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    } catch {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      window.dispatchEvent(new CustomEvent('app_v1_store_updated', { detail: { key, value } }));
    }
  }
};

// Async Store Getters
export async function getVenuesAsync(): Promise<Venue[]> {
  const raw = await storageAdapter.getItem(STORAGE_KEYS.VENUES);
  return raw ? JSON.parse(raw) : [];
}

export async function getCustomersAsync(): Promise<Customer[]> {
  const raw = await storageAdapter.getItem(STORAGE_KEYS.CUSTOMERS);
  return raw ? JSON.parse(raw) : [];
}

export async function getActiveCustomerAsync(): Promise<Customer | null> {
  const activeId = (await storageAdapter.getItem(STORAGE_KEYS.ACTIVE_CUSTOMER_ID)) || 'cust-1';
  const customers = await getCustomersAsync();
  return customers.find(c => c.id === activeId) || customers[0] || null;
}

export async function getWalletsAsync(): Promise<Wallet[]> {
  const raw = await storageAdapter.getItem(STORAGE_KEYS.WALLETS);
  return raw ? JSON.parse(raw) : [];
}

export async function getTransactionsAsync(customerId?: string): Promise<WalletTransaction[]> {
  const raw = await storageAdapter.getItem(STORAGE_KEYS.TRANSACTIONS);
  const all: WalletTransaction[] = raw ? JSON.parse(raw) : [];
  if (customerId) {
    return all.filter(t => t.customerId === customerId);
  }
  return all;
}

export async function getBookingsAsync(customerId?: string): Promise<Booking[]> {
  const raw = await storageAdapter.getItem(STORAGE_KEYS.BOOKINGS);
  const all: Booking[] = raw ? JSON.parse(raw) : [];
  if (customerId) {
    return all.filter(b => b.customerId === customerId);
  }
  return all;
}

// Async Actions
export async function createBookingAsync(params: {
  venueId: string;
  venueName: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  paymentMethod: PaymentMethod;
}): Promise<Booking> {
  const customer = await getActiveCustomerAsync();
  if (!customer) throw new Error('No active customer session found');

  if (customer.status === 'Suspended') {
    throw new Error('Account Suspended: Pitch slot booking is disabled for your account.');
  }

  const customers = await getCustomersAsync();
  const custIdx = customers.findIndex(c => c.id === customer.id);
  const wallets = await getWalletsAsync();
  const bookings = await getBookingsAsync();
  const txs = await getTransactionsAsync();

  if (params.paymentMethod === 'Wallet Balance') {
    if (customer.walletBalance < params.price) {
      throw new Error(`Insufficient System Wallet Balance (${customer.walletBalance} EGP). Please select another payment method.`);
    }

    const newBalance = customer.walletBalance - params.price;
    customer.walletBalance = newBalance;
    if (custIdx !== -1) customers[custIdx] = customer;

    const wallIdx = wallets.findIndex(w => w.customerId === customer.id);
    if (wallIdx !== -1) wallets[wallIdx].balance = newBalance;

    const now = new Date().toISOString();
    const bookId = `book-${Date.now()}`;
    const newBooking: Booking = {
      id: bookId,
      venueId: params.venueId,
      venueName: params.venueName,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
      slotId: `slot-${Date.now()}`,
      price: params.price,
      currency: 'EGP',
      paymentMethod: 'Wallet Balance',
      paymentStatus: 'Paid',
      status: 'Confirmed',
      createdAt: now,
      updatedAt: now,
    };

    txs.unshift({
      id: `tx-${Date.now()}`,
      walletId: customer.walletId,
      customerId: customer.id,
      customerName: customer.name,
      type: 'BOOKING_DEBIT',
      amount: -params.price,
      balanceAfter: newBalance,
      description: `Mobile Wallet Checkout - ${params.venueName}`,
      referenceId: bookId,
      createdBy: 'Customer',
      createdAt: now,
    });

    bookings.unshift(newBooking);

    await storageAdapter.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    await storageAdapter.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(wallets));
    await storageAdapter.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
    await storageAdapter.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));

    return newBooking;
  } else {
    const now = new Date().toISOString();
    const newBooking: Booking = {
      id: `book-${Date.now()}`,
      venueId: params.venueId,
      venueName: params.venueName,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
      slotId: `slot-${Date.now()}`,
      price: params.price,
      currency: 'EGP',
      paymentMethod: params.paymentMethod,
      paymentStatus: params.paymentMethod === 'Credit Card' ? 'Paid' : 'Pending',
      status: 'Confirmed',
      createdAt: now,
      updatedAt: now,
    };

    bookings.unshift(newBooking);
    await storageAdapter.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
    return newBooking;
  }
}

export async function cancelBookingAsync(bookingId: string, reason: string): Promise<Booking> {
  const bookings = await getBookingsAsync();
  const idx = bookings.findIndex(b => b.id === bookingId);
  if (idx === -1) throw new Error('Booking not found');

  const b = bookings[idx];
  const refundAmt = b.price;

  const updatedBooking: Booking = {
    ...b,
    status: 'Cancelled',
    paymentStatus: 'Refunded',
    cancellationReason: reason,
    refundOption: 'FULL',
    refundAmount: refundAmt,
    updatedAt: new Date().toISOString(),
  };

  bookings[idx] = updatedBooking;
  await storageAdapter.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));

  if (refundAmt > 0 && b.customerId) {
    const customers = await getCustomersAsync();
    const custIdx = customers.findIndex(c => c.id === b.customerId);
    if (custIdx !== -1) {
      const cust = customers[custIdx];
      const newBalance = cust.walletBalance + refundAmt;
      cust.walletBalance = newBalance;
      cust.updatedAt = new Date().toISOString();
      customers[custIdx] = cust;

      const wallets = await getWalletsAsync();
      const wallIdx = wallets.findIndex(w => w.customerId === cust.id);
      if (wallIdx !== -1) wallets[wallIdx].balance = newBalance;

      const txs = await getTransactionsAsync();
      txs.unshift({
        id: `tx-${Date.now()}`,
        walletId: cust.walletId,
        customerId: cust.id,
        customerName: cust.name,
        type: 'REFUND_CREDIT',
        amount: refundAmt,
        balanceAfter: newBalance,
        description: `Mobile App Booking Cancellation Refund: ${reason}`,
        referenceId: b.id,
        createdBy: 'Customer',
        createdAt: new Date().toISOString(),
      });

      await storageAdapter.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
      await storageAdapter.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(wallets));
      await storageAdapter.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    }
  }

  return updatedBooking;
}
```

---

## 5. Worker Command Instructions

To set up Expo Mobile App storage dependencies:

```powershell
# Run inside D:/test-mobile-app
cd D:/test-mobile-app
npm install @react-native-async-storage/async-storage
```

---

## 6. Implementation Checklist for Implementer (`implementer_m1_r1`)

- [ ] Create `D:/test-mobile-app/dashboard/src/types/index.ts` with shared interfaces.
- [ ] Create `D:/test-mobile-app/types/index.ts` with shared interfaces.
- [ ] Create `D:/test-mobile-app/dashboard/src/data/mockStore.ts` with local storage persistence and reactive events.
- [ ] Run `npm install @react-native-async-storage/async-storage` in `D:/test-mobile-app`.
- [ ] Create `D:/test-mobile-app/services/storageService.ts` with async storage methods.
- [ ] Verify TypeScript compilation on both Dashboard and Mobile App.
