# Milestone 2: Dashboard Venue Form & Modal Analysis Report

**Date**: 2026-08-25  
**Author**: `explorer_m2_2`  
**Working Directory**: `D:/test-mobile-app/.agents/explorer_m2_orchestrator4_2`  
**Scope**: Dashboard Venue Data Flow, `minimumDepositAmount` & `existingImages` Handling, UI/Styling Specification, Test Inventory  

---

## Executive Summary

This report presents a complete investigation of the admin dashboard's venue management subsystems (`VenueFormModal.tsx`, `VenueDetailModal.tsx`, `VenuesPage.tsx`, `venueApi.ts`, `apiClient.ts`, `types/index.ts`, and `mockStore.ts`) in coordination with the NestJS backend contracts (`nest-server/src/modules/venue/dto/venue.dto.ts` and `venue.service.ts`).

### Key Findings:
1. **Mock Store Disconnected**: `mockStore.ts` is fully deprecated and unused. All dashboard venue operations communicate directly via `venueApi.ts` and `apiClient.ts` to live NestJS endpoints (`POST /venue`, `PATCH /venue/:id`, `GET /venue`).
2. **`existingImages` Lifecycle Working**: The dashboard form correctly prepares `existingImages`, `keepImages`, `removedImages`, `deleteImages`, and multi-file binary uploads (`images`). Backend `CreateVenueDto` and `UpdateVenueDto` support all these fields decorated with `@ParseArray()`.
3. **`minimumDepositAmount` Missing in Dashboard UI**: While the backend entity (`Venue.minimumDepositAmount`), DTOs (`CreateVenueDto`, `UpdateVenueDto`), and unit tests (`venue.service.spec.ts`) fully support `minimumDepositAmount`, the dashboard currently lacks:
   - `minimumDepositAmount?: number;` field in `dashboard/src/types/index.ts`.
   - `minimumDepositAmount` state, input control, and `FormData` append in `VenueFormModal.tsx`.
   - `minimumDepositAmount` display in `VenueDetailModal.tsx`.
   - Explicit property normalization in `venueApi.ts:normalizeVenue()`.
4. **Dashboard Styling & Constraints**: UI uses Tailwind CSS v4 and TailAdmin component conventions (`Modal`, `Button`, `Badge`, `DollarLineIcon`, `TimeIcon`). Input constraints and styling classes are cataloged below.
5. **Test Inventory**: Dashboard has no local Jest/Vitest test runner in `dashboard/package.json`; validation relies on TypeScript compilation and Vite build (`npm run build`, verified passing). Backend unit tests (`venue.service.spec.ts`) and global invariant tests (`__tests__/e2e_booking_payment_suite.js`) validate the domain logic and DTO rules.

---

## 1. End-to-End Data Flow Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Dashboard (React 19 / Vite)                     │
│                                                                        │
│  VenueFormModal.tsx ──────────► VenuesPage.tsx ────────► venueApi.ts   │
│  (State & FormData)             (Save Handlers)          (API client)  │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │ HTTP multipart/form-data
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    NestJS Backend (nest-server)                        │
│                                                                        │
│  VenueController (FilesInterceptor) ──► VenueService (S3 + Repo)       │
│  CreateVenueDto / UpdateVenueDto   ──► MongoDB Venue Model            │
└────────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Flow:
1. **Modal Form (`VenueFormModal.tsx`)**:
   - `useEffect` synchronizes modal state when `editingVenue` changes or when opening create mode.
   - User inputs data (name, address, coordinates, sports types, operating hours, base price, custom peak rates, amenities, photos).
   - `handleSubmit(e)` performs client-side validation, constructs a standard browser `FormData` object, and calls `onSave(formData, isEditing, venueId)`.
2. **Page Coordinator (`VenuesPage.tsx`)**:
   - `handleSaveVenueSubmit(formData, isEditing, venueId)` checks `isEditing`.
   - If editing: calls `venueApi.updateVenue(venueId, formData)` (`PATCH /api/v1/venue/:id`).
   - If creating: calls `venueApi.createVenue(formData)` (`POST /api/v1/venue`).
   - On success: closes modal and triggers `refreshVenues()`, which fetches all active venues via `venueApi.getAllVenues()` (`GET /api/v1/venue`).
3. **API Service (`venueApi.ts`) & HTTP Client (`apiClient.ts`)**:
   - `apiClient.ts` detects that `body instanceof FormData`, omitting `Content-Type: application/json` so the browser sets `multipart/form-data; boundary=...`.
   - Injects `Authorization: Bearer <accessToken>`.
   - Handles automatic 401 token refresh if expired.
   - Unwraps `{ success: true, data: ... }` NestJS envelope.
   - `venueApi.ts` normalizes response objects with `normalizeVenue(raw)`.
4. **Backend Processing (`nest-server`)**:
   - `VenueController` routes `POST /venue` and `PATCH /venue/:id` through `FilesInterceptor('images', 5, multer_cloud(...))`.
   - `CreateVenueDto` / `UpdateVenueDto` validate types via `class-validator` and `class-transformer` (`@ParseArray()`, `@ParseByJson()`, `@ParseBoolean()`).
   - `VenueService` uploads new files to S3 via `S3Service.uploadFiles()`, deletes removed photos from S3, maps amenities against `ALLOWED_AMENITIES`, and persists the document into MongoDB.
   - Returns venue object with presigned S3 URLs (`s3Service.getPreSignedUrls`).

---

## 2. Deep Dive: `existingImages` and `minimumDepositAmount`

### A. `existingImages` & Image Lifecycle

| Stage | Implementation Location | Behavior | Status |
|-------|-------------------------|----------|--------|
| **Form Initial Load** | `VenueFormModal.tsx:110` | Loads `editingVenue.images` into `existingImages` state. | ✅ Compatible |
| **User Deletion** | `VenueFormModal.tsx:198-204` | Moves removed item to `removedImages` state and filters `existingImages`. | ✅ Compatible |
| **Form Submission** | `VenueFormModal.tsx:264-275` | Sends `existingImages` (JSON array string), `keepImages` (repeated fields), `removedImages` (JSON array string), and `deleteImages` (repeated fields). | ✅ Compatible |
| **Backend DTO Validation** | `venue.dto.ts:160-198` | `existingImages`, `keepImages`, `removedImages`, `deleteImages` all decorated with `@IsOptional() @ParseArray() @IsArray() @IsString({ each: true })`. | ✅ Compatible |
| **Backend S3 Deletion** | `venue.service.ts:314-344` | Removes deleted keys from S3 and retains kept keys in MongoDB `images`. | ✅ Compatible |

### B. `minimumDepositAmount`

| Component | Current Status | Required Milestone 2 Update |
|-----------|----------------|------------------------------|
| **`nest-server/src/modules/venue/entities/venue.entity.ts`** | `@Prop({ type: Number, default: 0 }) minimumDepositAmount?: number;` | None (Already Implemented) |
| **`nest-server/src/modules/venue/dto/venue.dto.ts`** | `@IsOptional() @IsNumber() @Min(0) @Type(() => Number) minimumDepositAmount?: number;` | None (Already Implemented) |
| **`nest-server/src/modules/venue/venue.service.ts`** | `minimumDepositAmount: minimumDepositAmount || 0` on create; updates on patch. | None (Already Implemented) |
| **`dashboard/src/types/index.ts`** | Missing `minimumDepositAmount?: number;` in `Venue` interface. | **Add `minimumDepositAmount?: number;`** |
| **`dashboard/src/services/api/venueApi.ts`** | Implicitly spread in `normalizeVenue`. | **Explicitly normalize `minimumDepositAmount: Number(raw.minimumDepositAmount ?? 0)`** |
| **`dashboard/src/components/venue/VenueFormModal.tsx`** | Missing state, form input, and `FormData` append. | **Add state, default values, form input field, and `formData.append("minimumDepositAmount", ...)`** |
| **`dashboard/src/components/venue/VenueDetailModal.tsx`** | Missing display of deposit amount. | **Add deposit amount badge/card in pricing summary grid** |

---

## 3. UI Field Specifications & Styling Conventions

### TailAdmin / Tailwind CSS v4 Styling Pattern System:
- **Card Wrapper**: `p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-4`
- **Section Heading**: `text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300`
- **Field Label**: `block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5`
- **Input Text/Number Control**: `w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white`
- **Required Star**: `<span className="text-red-500">*</span>`

### Comprehensive Field Inventory in `VenueFormModal.tsx`:

| Field Name | Form Key | Input Element | Type / Step / Min / Max | Default / Example | Required |
|------------|----------|---------------|-------------------------|-------------------|----------|
| Venue Name | `venueName` | `<input type="text">` | `text`, string | `Camp Nou Arena Cairo` | Yes |
| Physical Address | `address` | `<input type="text">` | `text`, string | `123 Stadium Road, Cairo` | Yes |
| Latitude | `locationAlt` | `<input type="number">` | `number`, `step="0.0001"` | `30.0444` | Yes |
| Longitude | `locationLang` | `<input type="number">` | `number`, `step="0.0001"` | `31.2357` | Yes |
| Sports Types | `sportsType` | Multi-select Toggle Buttons | Array of strings | `["Football", "Padel"]` | Yes (min 1) |
| Start Working Hour | `startWorkingHours` | `<input type="number">` | `number`, `min="0"`, `max="23"`, `step="1"` | `8` | Yes |
| End Working Hour | `endWorkingHours` | `<input type="number">` | `number`, `min="1"`, `max="24"`, `step="1"` | `24` | Yes |
| Base Price / Hour | `defaultHourPrice` | `<input type="number">` | `number`, `min="1"`, `step="1"` | `250` | Yes |
| **Minimum Deposit / Slot** *(To Add)* | `minimumDepositAmount` | `<input type="number">` | `number`, `min="0"`, `step="1"` | `0` (or `50`) | No (defaults to 0) |
| Peak Hour Overrides | `customHourPrices` | Custom Rule Builder | Hour: `0-23`, Rate: `min="1"` | `[{ hour: 19, pricePerHour: 350 }]` | No |
| Amenities | `amenities` | Multi-select Checkboxes | Array of strings | `["Parking", "FloodLights", "WiFi"]` | No |
| Venue Photos | `images` / `keepImages` | `<input type="file" multiple>` + Image previews with remove buttons | PNG/JPG/WEBP files + existing URLs | Gallery list | No |
| Status | `isActive` | `<select>` | `"Active"` / `"Inactive"` | `"Active"` | Yes |

### UI Field Placement for `minimumDepositAmount` in `VenueFormModal.tsx`:
Place `minimumDepositAmount` inside the "Operating Hours & Base Pricing" section card by updating the grid layout to a 4-column responsive grid (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`):
```tsx
<div>
  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
    Deposit / Slot (EGP)
  </label>
  <input
    type="number"
    min="0"
    step="1"
    value={minimumDepositAmount}
    onChange={(e) => setMinimumDepositAmount(e.target.value === "" ? "" : Number(e.target.value))}
    placeholder="0 for full payment"
    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
  />
  <span className="block text-[10px] text-gray-400 mt-0.5">0 = full payment required</span>
</div>
```

### UI Field Placement for `minimumDepositAmount` in `VenueDetailModal.tsx`:
Display in the summary grid under "Operating Hours & Pricing Summary Grid":
```tsx
<div>
  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
    <DollarLineIcon className="w-4 h-4 text-brand-500" /> REQUIRED DEPOSIT / SLOT
  </div>
  <p className="text-sm font-bold text-gray-900 dark:text-white">
    {venue.minimumDepositAmount && venue.minimumDepositAmount > 0
      ? `${venue.minimumDepositAmount} EGP`
      : "Full Payment (No Deposit)"}
  </p>
  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
    {venue.minimumDepositAmount && venue.minimumDepositAmount > 0
      ? "Remaining balance due at venue"
      : "Full price charged upon booking"}
  </p>
</div>
```

---

## 4. Test Suite Inventory & Verification Methods

### Summary of Existing Tests:
1. **Dashboard Build & Typecheck**:
   - Script: `npm run build` in `dashboard/` (executes `tsc -b && vite build`).
   - Verified: **Passes with exit code 0** (278 modules transformed, clean production assets output).
2. **Backend Unit Tests**:
   - File: `nest-server/src/modules/venue/venue.service.spec.ts`.
   - Covers: `createVenue` and `updateVenue` with `minimumDepositAmount` (R3) and `existingImages`/`keepImages` (R5).
3. **Global E2E & Invariant Test Suite**:
   - Files: `__tests__/e2e_booking_payment_suite.js`, `__tests__/run_all_e2e.js`.
   - Covers: DTO payload validation (`validateCreateVenuePayload`), deposit calculations (`computePaymentSplit`), and multi-slot group pricing (`calculateGroupBookingCost`).

---

## 5. Concrete Action Plan for Milestone 2 Implementation

1. **`dashboard/src/types/index.ts`**:
   - Add `minimumDepositAmount?: number;` to the `Venue` interface.
2. **`dashboard/src/services/api/venueApi.ts`**:
   - In `normalizeVenue(raw)`, add `minimumDepositAmount: Number(raw.minimumDepositAmount ?? 0),`.
3. **`dashboard/src/components/venue/VenueFormModal.tsx`**:
   - Add state: `const [minimumDepositAmount, setMinimumDepositAmount] = useState<number | "">(0);`.
   - In `useEffect`: initialize `setMinimumDepositAmount(editingVenue.minimumDepositAmount ?? 0)` for edit, `setMinimumDepositAmount(0)` for create.
   - In `handleSubmit`: `formData.append("minimumDepositAmount", String(Number(minimumDepositAmount || 0)));`.
   - In JSX: add numeric input for "Deposit / Slot (EGP)" with `min="0"`, `step="1"`, and helper text.
4. **`dashboard/src/components/venue/VenueDetailModal.tsx`**:
   - Render deposit information in the pricing summary section.
5. **Verification**:
   - Run `npm run build` in `dashboard/` to ensure 0 TypeScript / JSX errors.
   - Run `node __tests__/e2e_booking_payment_suite.js` to ensure 100% invariant pass rate.
