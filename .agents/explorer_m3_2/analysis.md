# Venue Entity Schema & Storage Analysis (M3 Data Layer)

## Executive Summary
This analysis evaluates the Venue entity schema, data storage architecture, mock seed dataset, and CRUD functions in `D:/test-mobile-app/dashboard/src` (`types/index.ts` and `data/mockStore.ts`). 
- **Schema Alignment**: The `Venue` interface in `types/index.ts` fully captures all required fields matching Nest.js server entity standards (sports types, coordinates, working hours, hierarchical pricing, custom hourly rules, amenities, image URLs, and lifecycle status).
- **Seed Data Compliance**: `SEED_VENUES` contains 4 realistic sample venues (`ARENA 1`, `CHAMPIONS PARK`, `SANTIAGO PADEL CLUB`, `METRO ARENA 7`) with complete field coverage including Cairo/Giza GPS coordinates, custom pricing rules, amenities, operating schedules, and image galleries.
- **Store Capabilities & Gaps**: `mockStore.ts` provides `getVenues`, `saveVenues`, `addVenue`, `saveVenue`, `updateVenue`, and `deleteVenue`. However, **`getVenueById(id: string)` is missing**, and `updateVenue` needs explicit dual-field normalization between nested `pricing` objects and top-level convenience properties (`defaultHourlyPrice`, `customHourlyPrices`).

---

## 1. Venue Entity Schema Inspection (`types/index.ts`)

### Existing Interfaces & Types
```typescript
export type SportsType = '5-A-SIDE' | '7-A-SIDE' | '11-A-SIDE' | 'PADEL';
export type VenueStatus = 'Active' | 'Maintenance' | 'Inactive';

export interface CustomPricingRate {
  id: string;
  startHour: string; // e.g. "18:00"
  endHour: string;   // e.g. "23:00"
  pricePerHour: number;
}

export interface VenuePricing {
  defaultPricePerHour: number;
  currency: 'EGP' | 'USD';
  customHourlyRates: CustomPricingRate[];
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
  pricing: VenuePricing;
  defaultHourlyPrice?: number;
  customHourlyPrices?: CustomPricingRate[];
  amenities: string[];
  imageUrls: string[];
  imageGallery?: string[];
  rating?: number;
  reviewCount?: number;
  description?: string;
  status: VenueStatus;
  createdAt: string;
  updatedAt: string;
}
```

### Alignment with Nest.js Standards & Sub-type Mapping
- **`SportsType`**: Supports multi-sport filtering (`5-A-SIDE`, `7-A-SIDE`, `11-A-SIDE`, `PADEL`).
- **`VenuePricing` & `CustomPricingRate`**: Represents base hourly rates alongside peak/custom hourly rules (e.g. evening pricing rules).
- **`coordinates`**: Holds precise latitude and longitude (`lat`, `lng`) for map rendering and distance calculations.
- **`workingHours`**: Captures daily operating windows (`openTime`, `closeTime`) and active days (`daysOpen`).
- **`amenities` & `imageUrls`**: Standard arrays for pitch features and gallery management.

### Recommended Type Alias Enhancements for `types/index.ts`
To ensure clean component typing in the M3 UI without inline object clutter:
```typescript
export type CustomPricingRule = CustomPricingRate;
export type Coordinates = { lat: number; lng: number };
export type WorkingHours = { openTime: string; closeTime: string; daysOpen: string[] };
```

---

## 2. Mock Data Store & CRUD Functions Inspection (`mockStore.ts`)

### Inventory of Existing Venue Methods

| Function | Signature | Status | Description |
|---|---|---|---|
| `getVenues` | `(): Venue[]` | ✅ Implemented | Retrieves venues from `localStorage` (`app_v1_venues`) or returns `SEED_VENUES`. |
| `getVenueById` | `(id: string): Venue \| undefined` | ❌ **Missing** | Should fetch a single venue by ID from `getVenues()`. |
| `saveVenues` | `(venues: Venue[]): void` | ✅ Implemented | Writes JSON to `localStorage` and triggers `notifyListeners()`. |
| `addVenue` | `(venueData: Omit<Venue, 'id' \| 'createdAt' \| 'updatedAt'>): Venue` | ✅ Implemented | Assigns `venue-${Date.now()}`, normalizes pricing/gallery, unshifts, and saves. |
| `saveVenue` | `(venue: Partial<Venue> & { id?: string; name: string }): Venue` | ✅ Implemented | Routes to `updateVenue` if `venue.id` exists, else calls `addVenue`. |
| `updateVenue` | `(id: string, updates: Partial<Venue>): Venue` | ⚠️ Needs Refinement | Performs shallow merge (`...existing, ...updates`), risks de-syncing top-level and nested pricing properties if updated individually. |
| `deleteVenue` | `(id: string): void` | ✅ Implemented | Filters out matching ID and saves store. |

---

## 3. Seed Dataset Verification (`SEED_VENUES`)

The `SEED_VENUES` array contains 4 realistic sample venues representing diverse sport types across Greater Cairo:

| Field | `arena-1` | `champions-stadium` | `santiago-padel` | `metro-arena` |
|---|---|---|---|---|
| **Name** | ARENA 1 - Zayed Sports Hub | CHAMPIONS PARK | SANTIAGO PADEL CLUB | METRO ARENA 7 |
| **Sports Types** | 5-A-SIDE, 7-A-SIDE | 11-A-SIDE, 7-A-SIDE | PADEL | 7-A-SIDE |
| **Address** | El-Bustan St, Sheikh Zayed, Giza | Olympic City, New Cairo | District 5, Katameya, Cairo | Maadi Sports Club, Road 9 |
| **Coordinates** | `{ lat: 30.0444, lng: 30.9833 }` | `{ lat: 30.0255, lng: 31.4912 }` | `{ lat: 29.9911, lng: 31.4233 }` | `{ lat: 29.9602, lng: 31.2569 }` |
| **Working Hours** | 08:00 AM - 02:00 AM (7 days) | 09:00 AM - 12:00 AM (7 days) | 07:00 AM - 01:00 AM (7 days) | 08:00 AM - 12:00 AM (7 days) |
| **Default Price** | 200 EGP/hr | 450 EGP/hr | 300 EGP/hr | 280 EGP/hr |
| **Custom Pricing** | 18:00-00:00 @ 280 EGP | None | 17:00-23:00 @ 380 EGP | None |
| **Amenities** | Floodlights, Locker Rooms, Showers, Parking, Cafe | FIFA Turf, VIP Lockers, Spectator Stand, Medical | Panoramic Glass, Racket Rental, AC Lounge, Bar | Synthetic Grass, Night Lights, Cafe, WiFi |
| **Image URLs** | Valid Unsplash URL | Valid Unsplash URL | Valid Unsplash URL | Valid Unsplash URL |
| **Status** | Active | Active | Active | Active |

**Verdict**: The mock dataset is 100% realistic and satisfies all prompt criteria.

---

## 4. Helper Methods & Validation Rules Needed for M3 Implementation

### 1. New Helper Method: `getVenueById`
```typescript
export function getVenueById(id: string): Venue | undefined {
  const venues = getVenues();
  return venues.find(v => v.id === id);
}
```

### 2. Pricing & Gallery Field Normalization in `updateVenue`
To ensure data integrity between `pricing.defaultPricePerHour` / `pricing.customHourlyRates` and top-level fields `defaultHourlyPrice` / `customHourlyPrices`:
```typescript
export function updateVenue(id: string, updates: Partial<Venue>): Venue {
  const venues = getVenues();
  const idx = venues.findIndex(v => v.id === id);
  if (idx === -1) throw new Error('Venue not found');
  const existing = venues[idx];

  const defaultHourlyPrice = updates.defaultHourlyPrice !== undefined
    ? updates.defaultHourlyPrice
    : (updates.pricing?.defaultPricePerHour !== undefined ? updates.pricing.defaultPricePerHour : existing.defaultHourlyPrice || existing.pricing.defaultPricePerHour);

  const customHourlyPrices = updates.customHourlyPrices !== undefined
    ? updates.customHourlyPrices
    : (updates.pricing?.customHourlyRates !== undefined ? updates.pricing.customHourlyRates : existing.customHourlyPrices || existing.pricing.customHourlyRates || []);

  const imageUrls = updates.imageUrls !== undefined
    ? updates.imageUrls
    : (updates.imageGallery !== undefined ? updates.imageGallery : existing.imageUrls);

  const updatedPricing: VenuePricing = {
    defaultPricePerHour: defaultHourlyPrice,
    currency: updates.pricing?.currency || existing.pricing?.currency || 'EGP',
    customHourlyRates: customHourlyPrices,
  };

  const updated: Venue = {
    ...existing,
    ...updates,
    pricing: updatedPricing,
    defaultHourlyPrice,
    customHourlyPrices,
    imageUrls,
    imageGallery: imageUrls,
    updatedAt: new Date().toISOString()
  };

  venues[idx] = updated;
  saveVenues(venues);
  return updated;
}
```

### 3. Venue Form Validation Rules (for `VenuesPage.tsx` UI)
- **Venue Name**: Required, non-empty string.
- **Sports Types**: Required, at least 1 `SportsType` selected.
- **Address & Coordinates**: Required valid address text and numerical latitude (-90 to 90) and longitude (-180 to 180).
- **Working Hours**: Open time & close time required; active days array must have at least 1 day selected.
- **Default Pricing**: `defaultPricePerHour` must be > 0.
- **Custom Hourly Pricing**: `startHour` and `endHour` formatted as "HH:mm" (24h clock) with `pricePerHour` > 0.
- **Image Gallery**: At least 1 valid image URL string provided.

---

## Conclusion & Proposed Patch
The data layer is well-structured and almost ready for Milestone 3 implementation. Implementing `getVenueById` and alias definitions (`CustomPricingRule`, `Coordinates`, `WorkingHours`) will provide a smooth developer experience for the implementer subagents building `/venues`.
