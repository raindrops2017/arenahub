# Comprehensive UI Analysis & Specification Report: Venue Form & Modal Patterns

**Agent ID**: `explorer_m3_3`  
**Role**: Venue Form & Modal UI Pattern Explorer  
**Target Application**: TailAdmin Dashboard (`D:/test-mobile-app/dashboard/src`)  
**Milestone**: M3 (Venue Management CRUD Module)  
**Date**: 2026-08-07  

---

## Executive Summary

This report establishes the complete structural design, form state schema, validation rules, component props contract, visual layout (Tailwind CSS v4), and component architecture for the **Add/Edit Venue Modal** (`VenueFormModal.tsx`) and **Delete Confirmation Modal** (`DeleteVenueModal.tsx`) within the TailAdmin Dashboard (`dashboard/src`).

The design fully aligns with:
1. Nest.js `Venue` backend entity schema (in `dashboard/src/types/index.ts`).
2. Persisted state operations in `mockStore.ts` (`addVenue`, `updateVenue`, `saveVenue`, `deleteVenue`).
3. TailAdmin UI component patterns observed in `UsersPage.tsx`, `CustomersPage.tsx`, and `components/ui/modal/index.tsx`.

---

## 1. Inspection of Existing Dashboard Modal & Form Patterns

### 1.1 Modal Container Architecture (`components/ui/modal/index.tsx`)
- **Overlay & Backdrop**: Fixed backdrop overlay using Tailwind backdrop blur (`bg-gray-400/50 backdrop-blur-[32px]`) with `z-99999` stacking context.
- **Dialog Box**: Rounded container (`relative w-full rounded-3xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden`). Max width controlled via parent modal wrapper (e.g. `max-w-2xl` or `max-w-3xl`).
- **Escape & Body Scroll Locking**: Handled automatically by `Modal` component via `useEffect` event listeners on `Escape` key and `document.body.style.overflow = "hidden"`.
- **Close Button**: Positioned absolutely top-right (`sm:right-6 sm:top-6`), styled with dark/light mode surface hover state.

### 1.2 Form Layout & Control Patterns (as seen in `UsersPage.tsx` & `CustomersPage.tsx`)
- **Section Headers & Subtitles**:
  - Modal Title: `text-lg font-bold text-gray-800 dark:text-white/90`
  - Subtitle: `text-xs text-gray-500 dark:text-gray-400`
- **Error Banner**: Red alert box for aggregate validation/server errors:
  - `rounded-lg bg-error-50 p-3 text-xs text-error-600 dark:bg-error-500/15 dark:text-error-400`
- **Form Controls & Inputs**:
  - Labels: `mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300` with required asterisk `<span className="text-error-500">*</span>`.
  - Inputs (Text, Number, Select):
    `w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white`
- **Action Buttons**:
  - Container: `mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800`
  - Buttons: `<Button variant="outline" onClick={onClose}>Cancel</Button>` and `<Button type="submit">Save Venue</Button>`.

---

## 2. Complete Specification for `VenueFormModal.tsx`

### 2.1 Component Interface & Props Contract
```typescript
import { Venue } from '../../types';

export interface VenueFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue?: Venue | null; // null for Create mode, Venue object for Edit mode
  onSave?: (venue: Venue) => void;
}
```

### 2.2 Form State TypeScript Schema (`VenueFormData`)
```typescript
import { SportsType, VenueStatus } from '../../types';

export interface CustomPricingRuleForm {
  id: string;
  label: string;      // e.g. "Evening Peak Rate", "Weekend Surge"
  startHour: string;  // e.g. "18:00"
  endHour: string;    // e.g. "00:00"
  pricePerHour: number | "";
}

export interface VenueFormData {
  name: string;
  sportsTypes: SportsType[];
  address: string;
  lat: number | "";
  lng: number | "";
  openTime: string;   // e.g. "08:00 AM" or "08:00"
  closeTime: string;  // e.g. "02:00 AM" or "23:00"
  daysOpen: string[]; // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  defaultHourlyPrice: number | "";
  currency: 'EGP' | 'USD';
  customHourlyPrices: CustomPricingRuleForm[];
  amenities: string[];
  imageUrls: string[];
  status: VenueStatus;
  description: string;
}
```

### 2.3 Field Specifications & UI Control Design

#### Section A: Core Venue Profile
1. **Venue Name**:
   - Field Type: Text Input
   - Required: Yes
   - Placeholder: `"e.g. ARENA 1 - Zayed Sports Hub"`
   - UI Layout: Full width (`col-span-12`).

2. **Sports Types Multi-Select Grid**:
   - Field Type: Interactive Multi-Select Checkbox Pills / Buttons.
   - Available Options (Aligned with Nest.js schema & user request):
     - `5-A-SIDE` (Football 5v5)
     - `7-A-SIDE` (Football 7v7)
     - `11-A-SIDE` (Football 11v11)
     - `PADEL` (Padel Tennis)
     - `BASKETBALL` (Basketball)
     - `TENNIS` (Tennis)
     - `VOLLEYBALL` (Volleyball)
     - `BADMINTON` (Badminton)
   - Layout: 4-column responsive grid (`grid grid-cols-2 sm:grid-cols-4 gap-2`).
   - Active Pill Style: `bg-brand-500 text-white border-brand-500 font-semibold shadow-xs`
   - Inactive Pill Style: `bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300`

#### Section B: Address & Geographic Coordinates
3. **Address Input**:
   - Field Type: Text Input
   - Placeholder: `"e.g. El-Bustan St, Sheikh Zayed City, Giza"`

4. **Coordinates Inputs (2-Column Grid)**:
   - Latitude (`lat`): Number input (`step="0.0001"`, placeholder: `30.0444`)
   - Longitude (`lng`): Number input (`step="0.0001"`, placeholder: `30.9833`)
   - Helper Preset Button: `"Detect / Set Default Cairo Coords"` (populates `30.0444`, `31.2357`).

#### Section C: Operating Schedule & Standard Pricing
5. **Working Hours Dropdowns**:
   - Opening Time (`openTime`): Dropdown with values from `"06:00 AM"` to `"11:30 PM"` in 30-min intervals.
   - Closing Time (`closeTime`): Dropdown with values from `"12:00 PM"` to `"05:00 AM"` (overnight supported).

6. **Default Hourly Price & Currency**:
   - Default Price: Number input (`step="1"`, placeholder: `200`).
   - Currency: Dropdown selector (`EGP` default, `USD`).

#### Section D: Custom Hourly Pricing Rules Builder
7. **Custom Rates List & Builder**:
   - Dynamic array builder allowing venue managers to specify time-based rate overrides (e.g. evening floodlight surge pricing).
   - Each rule row contains:
     - **Rule Label**: Text input (e.g., `"Peak Night Rate"`).
     - **Start Time**: Dropdown (e.g., `"18:00"`).
     - **End Time**: Dropdown (e.g., `"00:00"`).
     - **Price/Hr**: Number input (e.g., `280`).
     - **Remove Button**: TrashBinIcon button (`text-error-500 hover:text-error-700`).
   - `"Add Custom Rate Rule"` button with `<PlusIcon className="w-4 h-4" />`.

#### Section E: Amenities Checkbox Grid
8. **Amenities Grid**:
   - Supported Options:
     - `Parking`
     - `Showers`
     - `Floodlights`
     - `Locker Rooms`
     - `Wifi`
     - `Refreshments`
     - `Equipment Rental`
     - `Cafeteria`
     - `Air Conditioned Lounge`
   - Layout: 3-column checkbox grid (`grid grid-cols-2 sm:grid-cols-3 gap-2.5`).
   - UI Card Style: Bordered card with checkbox indicator and icon. Selected items display brand color border and light fill (`bg-brand-50/50 border-brand-500 dark:bg-brand-500/10`).

#### Section F: Image Gallery Builder with Live Preview
9. **Image URLs Builder**:
   - Dynamic list of image URL strings with live thumbnail preview cards.
   - Each entry features:
     - Live Thumbnail Box: `w-14 h-14 rounded-lg object-cover border border-gray-200` displaying the loaded image preview or fallback icon if empty/broken.
     - Text Input: URL string (`https://images.unsplash.com/...`).
     - Delete Button: `<TrashBinIcon />`.
   - Sample Presets: Quick-add buttons for stock high-res pitch images (Turf, Stadium, Padel Court).

#### Section G: Status & Description
10. **Status**: Select dropdown (`Active`, `Maintenance`, `Inactive`).
11. **Description**: Textarea for additional venue policies or pitch details.

---

## 3. Validation Rules & Form Error Handling

### 3.1 Field Validation Rules Matrix

| Field | Condition / Constraint | Error Message |
|---|---|---|
| `name` | String non-empty, `length >= 3` | `"Venue name is required (minimum 3 characters)."` |
| `sportsTypes` | Array non-empty, `sportsTypes.length >= 1` | `"Please select at least one sports type."` |
| `address` | String non-empty, `length >= 5` | `"Address is required."` |
| `lat` | Required number, range `-90 <= lat <= 90` | `"Latitude must be between -90 and 90."` |
| `lng` | Required number, range `-180 <= lng <= 180` | `"Longitude must be between -180 and 180."` |
| `openTime`, `closeTime` | Non-empty strings | `"Please select open and close working hours."` |
| `defaultHourlyPrice` | Required number, `defaultHourlyPrice > 0` | `"Default hourly price must be greater than 0."` |
| `customHourlyPrices` | Each rule must have `label`, `pricePerHour > 0`, `startHour !== endHour` | `"Custom pricing rules must have a valid label, positive price, and distinct times."` |
| `imageUrls` | Non-empty strings must start with `http://` or `https://` | `"Image URLs must start with http:// or https://."` |

### 3.2 Error Presentation Strategy
- Top Modal Alert Banner: Shows primary error message if validation fails on form submission.
- Field-Level Highlight: Red border (`border-error-500`) applied to invalid inputs.

---

## 4. Delete Confirmation Modal Specification (`DeleteVenueModal.tsx`)

### 4.1 Component Interface
```typescript
import { Venue } from '../../types';

export interface DeleteVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: Venue | null;
  onConfirmDelete: (venueId: string) => void;
}
```

### 4.2 Behavior & UI Details
1. **Header**: Red Warning Hexagon Icon (`AlertHexaIcon` / `TrashBinIcon` in red badge container) with title `"Delete Venue Confirmation"`.
2. **Body Warning**:
   - `"Are you sure you want to permanently delete '${venue?.name}'?"`
   - `"This action is irreversible and will remove all pitch metadata, pricing rules, and amenities from the dashboard."`
3. **Active Bookings Safety Check**:
   - Queries `mockStore.getBookings().filter(b => b.venueId === venue.id && (b.status === 'Confirmed' || b.status === 'Completed'))`.
   - If active bookings exist, displays a amber warning box:
     `"Warning: This venue has X associated booking records. Deleting the venue removes it from future booking availability."`
4. **Action Buttons**:
   - Cancel: `<Button variant="outline" onClick={onClose}>Cancel</Button>`
   - Delete Confirm: `<Button onClick={() => onConfirmDelete(venue.id)} className="bg-error-600 hover:bg-error-700 text-white">Delete Venue</Button>`

---

## 5. Verification Method

To verify the implementation once built in M3:
1. **Create Venue Workflow**: Open modal -> fill form -> submit -> verify new venue appears in table and persists in `localStorage` under `app_v1_venues`.
2. **Edit Venue Workflow**: Click Edit -> change name, price, amenities -> save -> verify updated data.
3. **Delete Venue Workflow**: Click Delete -> confirm in `DeleteVenueModal` -> verify venue removed from table & store.
4. **Validation Verification**: Attempt submission with empty name or negative price -> verify error banner blocks submission.
