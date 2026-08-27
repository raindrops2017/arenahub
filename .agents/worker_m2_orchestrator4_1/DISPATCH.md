## 2026-08-25T05:59:44Z
You are worker_m2_1 for Milestone 2 (Dashboard Updates).
Your working directory is D:/test-mobile-app/.agents/worker_m2_orchestrator4_1.

Read:
- D:/test-mobile-app/.agents/ORIGINAL_REQUEST.md
- D:/test-mobile-app/PROJECT.md
- D:/test-mobile-app/.agents/explorer_m2_orchestrator4_1/analysis.md
- D:/test-mobile-app/.agents/explorer_m2_orchestrator4_3/analysis.md
- D:/test-mobile-app/dashboard/src/types/index.ts
- D:/test-mobile-app/dashboard/src/services/api/venueApi.ts
- D:/test-mobile-app/dashboard/src/components/venue/VenueFormModal.tsx
- D:/test-mobile-app/dashboard/src/components/venue/VenueDetailModal.tsx

Write Ownership:
You own exclusively:
- `dashboard/src/types/index.ts`
- `dashboard/src/services/api/venueApi.ts`
- `dashboard/src/components/venue/VenueFormModal.tsx`
- `dashboard/src/components/venue/VenueDetailModal.tsx`

Tasks to Implement:
1. `dashboard/src/types/index.ts`:
   - In `Venue` interface, add `minimumDepositAmount?: number;` and `minDeposit?: number;`.
   - In `PaymentStatus` type, ensure `'partially_paid'` is present.
   - In `Booking` interface, ensure `groupId?: string;` is present.
2. `dashboard/src/services/api/venueApi.ts`:
   - In `normalizeVenue(raw: any): Venue`, parse and normalize `minimumDepositAmount: Number(raw.minimumDepositAmount ?? raw.minDeposit ?? 0)`.
3. `dashboard/src/components/venue/VenueFormModal.tsx`:
   - Add `minimumDepositAmount` state initialized to `0` or `editingVenue?.minimumDepositAmount ?? 0`.
   - Add `useEffect` sync when `editingVenue` changes.
   - Add input field in the pricing section for "Minimum Deposit Per Slot (EGP)" with placeholder "e.g. 100 (0 for full payment)", `min="0"`, step="1".
   - In form validation, ensure `minimumDepositAmount` is a valid non-negative number (`Number(minimumDepositAmount) >= 0`).
   - In `handleSubmit`, append `formData.append("minimumDepositAmount", String(minimumDepositAmount || 0));`.
   - Ensure existing image handling and payload construction (`existingImages`, `keepImages`, `removedImages`, `deleteImages`, `images`) are clean and intact.
4. `dashboard/src/components/venue/VenueDetailModal.tsx`:
   - Add a 3rd summary card in the pricing grid (or update the grid to 3 columns) displaying `MINIMUM DEPOSIT / SLOT` with value `${venue.minimumDepositAmount || 0} EGP` or `${venue.minimumDepositAmount} EGP (Deposit)` / `0 EGP (Full Payment)`.
5. Build & Test Verification:
   - Run `cd dashboard && npm run build` (which runs `tsc -b && vite build`).
   - Verify it passes with exit code 0 and 0 errors.
   - Run any tests in dashboard if available.
