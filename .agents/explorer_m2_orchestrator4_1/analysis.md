# Milestone 2 (Dashboard Updates) — Comprehensive Investigation Report

**Agent**: `explorer_m2_1`  
**Working Directory**: `D:/test-mobile-app/.agents/explorer_m2_orchestrator4_1`  
**Scope**: Dashboard Venue Management (`VenueFormModal.tsx`, `VenueDetailModal.tsx`, `VenuesPage.tsx`, `types/index.ts`, `services/api/venueApi.ts`) and Backend Compatibility (`CreateVenueDto`, `UpdateVenueDto`, `VenueService`).

---

## 1. Executive Summary

Milestone 2 requires dashboard updates to support:
1. **Minimum Deposit Per Slot (R3)**: Adding `minimumDepositAmount` configuration in `VenueFormModal.tsx` (state, validation, UI input, FormData appending) and displaying it in `VenueDetailModal.tsx` (summary grid card).
2. **Venue Image Handling Compatibility (R5)**: Validating that image payload construction (`existingImages`, `keepImages`, `removedImages`, `deleteImages`, and `images` file uploads) in `VenueFormModal.tsx` matches backend `CreateVenueDto` and `UpdateVenueDto` exactly with zero validation errors.
3. **Type Safety (`types/index.ts`)**: Ensuring `minimumDepositAmount?: number`, `groupId?: string`, and `partially_paid` are properly defined in dashboard TypeScript definitions.
4. **Build Integrity**: Verifying that `npm run build` compiles cleanly with `tsc -b && vite build`.

---

## 2. Investigation Findings

### Finding 1: `minimumDepositAmount` in `VenueFormModal.tsx`
- **Current State**:
  - `VenueFormModal.tsx` manages `name`, `sportsTypes`, `address`, `lat`, `lng`, `startWorkingHours`, `endWorkingHours`, `defaultHourlyPrice`, `customPricingRules`, `amenities`, `existingImages`, `removedImages`, `selectedFiles`, and `status`.
  - It does NOT yet have state or an input field for `minimumDepositAmount`.
- **Required Changes**:
  1. **State Definition**:
     ```typescript
     const [minimumDepositAmount, setMinimumDepositAmount] = useState<number | "">(0);
     ```
  2. **`useEffect` Sync**:
     - On Edit (`if (editingVenue)`):
       ```typescript
       setMinimumDepositAmount(
         editingVenue.minimumDepositAmount !== undefined
           ? Number(editingVenue.minimumDepositAmount)
           : 0
       );
       ```
     - On Create (`else`):
       ```typescript
       setMinimumDepositAmount(0);
       ```
  3. **Validation in `handleSubmit`**:
     ```typescript
     if (minimumDepositAmount !== "" && (isNaN(Number(minimumDepositAmount)) || Number(minimumDepositAmount) < 0)) {
       setErrorMsg("Minimum Deposit Amount must be 0 or a positive number");
       return;
     }
     ```
  4. **FormData Payload**:
     ```typescript
     formData.append("minimumDepositAmount", String(minimumDepositAmount === "" ? 0 : Number(minimumDepositAmount)));
     ```
  5. **UI Form Layout**:
     - Inside the "Operating Hours & Base Pricing" section (`line 409-456`), expand the grid from `sm:grid-cols-3` to `sm:grid-cols-2 lg:grid-cols-4` (or 2-column layout), and add the input field:
     ```tsx
     <div>
       <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
         Min Deposit / Slot (EGP)
       </label>
       <input
         type="number"
         min="0"
         value={minimumDepositAmount}
         onChange={(e) =>
           setMinimumDepositAmount(
             e.target.value === "" ? "" : Math.max(0, Number(e.target.value))
           )
         }
         placeholder="0 (Full payment)"
         className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white font-bold"
       />
       <p className="text-[10px] text-gray-400 mt-0.5">0 = full payment upfront</p>
     </div>
     ```

---

### Finding 2: `minimumDepositAmount` in `VenueDetailModal.tsx`
- **Current State**:
  - `VenueDetailModal.tsx` has an "Operating Hours & Pricing Summary Grid" with 2 columns:
    1. Operating Hours
    2. Standard Hourly Rate
- **Required Changes**:
  1. Extract deposit value:
     ```typescript
     const minDeposit = Number(venue.minimumDepositAmount ?? 0);
     ```
  2. Change the summary grid from `sm:grid-cols-2` to `sm:grid-cols-3`:
     ```tsx
     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 dark:bg-gray-800/60 dark:border-gray-700">
       {/* Operating Hours */}
       <div>
         <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
           <TimeIcon className="w-4 h-4 text-brand-500" /> OPERATING HOURS
         </div>
         <p className="text-sm font-semibold text-gray-900 dark:text-white">
           {venue.workingHours?.openTime || `${venue.startWorkingHours}:00`} - {venue.workingHours?.closeTime || `${venue.endWorkingHours}:00`}
         </p>
         <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
           {venue.endWorkingHours - venue.startWorkingHours} hours / day open
         </p>
       </div>

       {/* Standard Hourly Rate */}
       <div>
         <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
           <DollarLineIcon className="w-4 h-4 text-brand-500" /> STANDARD HOURLY RATE
         </div>
         <p className="text-lg font-bold text-brand-600 dark:text-brand-400">
           {defaultPrice} EGP <span className="text-xs font-normal text-gray-500">/ hour</span>
         </p>
         <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
           Custom rules: {customRules.length} override(s)
         </p>
       </div>

       {/* Minimum Deposit */}
       <div>
         <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
           <DollarLineIcon className="w-4 h-4 text-brand-500" /> MINIMUM DEPOSIT / SLOT
         </div>
         <p className="text-lg font-bold text-brand-600 dark:text-brand-400">
           {minDeposit > 0 ? `${minDeposit} EGP` : "0 EGP"}
         </p>
         <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
           {minDeposit > 0 ? "Deposit required per slot" : "Full payment required"}
         </p>
       </div>
     </div>
     ```

---

### Finding 3: Image Handling & Backend Compatibility Analysis
- **Backend DTOs & Service Inspection**:
  - `CreateVenueDto` (`nest-server/src/modules/venue/dto/venue.dto.ts`):
    - `existingImages?: string[]` (`@ParseArray()`)
    - `keepImages?: string[]` (`@ParseArray()`)
    - `removedImages?: string[]` (`@ParseArray()`)
    - `deleteImages?: string[]` (`@ParseArray()`)
    - `images`: multer files (up to 5 images)
  - `UpdateVenueDto` (`nest-server/src/modules/venue/dto/venue.dto.ts`):
    - Same optional fields.
  - `VenueService` (`nest-server/src/modules/venue/venue.service.ts`):
    - In `createVenue`:
      ```typescript
      const initialImages: string[] = [];
      if (existingImages && Array.isArray(existingImages)) {
        initialImages.push(...existingImages);
      } else if (keepImages && Array.isArray(keepImages)) {
        initialImages.push(...keepImages);
      }
      ```
    - In `updateVenue`:
      ```typescript
      const toDeleteInputs = [...(removedImages || []), ...(deleteImages || [])];
      // matches and deletes from S3
      const toKeepInputs = existingImages || keepImages;
      // retains kept keys
      ```
- **Dashboard Modal Implementation (`VenueFormModal.tsx` lines 263-280)**:
  ```typescript
  // Send Kept / Remaining Existing Images to Backend
  formData.append("existingImages", JSON.stringify(existingImages));
  existingImages.forEach((img) => {
    formData.append("keepImages", img);
  });

  // Send Removed Images to Backend
  if (removedImages.length > 0) {
    formData.append("removedImages", JSON.stringify(removedImages));
    removedImages.forEach((img) => {
      formData.append("deleteImages", img);
    });
  }

  // New Images to Upload
  selectedFiles.forEach((file) => {
    formData.append("images", file);
  });
  ```
- **Compatibility Verdict**:
  - The backend uses `@ParseArray()` which converts JSON array strings (`'["http://..."]'`) or repeated form fields into string arrays.
  - S3 key matching in `matchStoredImageKey()` matches URLs, pre-signed URLs, or raw S3 keys correctly.
  - The dashboard form implementation is **100% compatible** with the backend.

---

### Finding 4: Type Definitions (`dashboard/src/types/index.ts`)
- **`Venue` Interface (line 68)**:
  - Needs `minimumDepositAmount?: number;`
  - Needs `existingImages?: string[];`
  - Needs `keepImages?: string[];`
  - Needs `removedImages?: string[];`
  - Needs `deleteImages?: string[];`
- **`PaymentStatus` Type (line 230)**:
  - Add `'partially_paid'` to support deposit payments.
- **`Booking` Interface (line 241)**:
  - Add `groupId?: string;` to support multi-slot grouped bookings.
- **`venueApi.ts` (`normalizeVenue`)**:
  - Ensure `minimumDepositAmount: Number(raw.minimumDepositAmount ?? 0)` is set during normalization.

---

### Finding 5: Build Verification
- Running `npm run build` (`tsc -b && vite build`) in `dashboard/` succeeded with exit code 0.
- All 278 modules transformed cleanly into `dist/`.

---

## 3. Implementation Plan for Milestone 2

| File | Target Modification |
|------|---------------------|
| `dashboard/src/types/index.ts` | Add `minimumDepositAmount?: number`, `existingImages?: string[]` to `Venue`; add `groupId?: string` to `Booking`; add `partially_paid` to `PaymentStatus`. |
| `dashboard/src/services/api/venueApi.ts` | Add `minimumDepositAmount: Number(raw.minimumDepositAmount ?? 0)` in `normalizeVenue`. |
| `dashboard/src/components/venue/VenueFormModal.tsx` | Add state `minimumDepositAmount`, input field in grid, validation, and FormData appending. |
| `dashboard/src/components/venue/VenueDetailModal.tsx` | Add 3rd card in summary grid to display `MINIMUM DEPOSIT / SLOT`. |
| `dashboard/src/pages/VenuesPage.tsx` | (Optional) Spot check if table or grid view needs minimum deposit column/badge. |
