## 2026-08-07T15:18:47Z
You are worker_m3_r1 (Venue Management CRUD Implementer).
Working directory: D:/test-mobile-app/.agents/worker_m3_r1
Context files:
- D:/test-mobile-app/.agents/ORIGINAL_REQUEST.md
- D:/test-mobile-app/.agents/orchestrator/PROJECT.md
- D:/test-mobile-app/.agents/explorer_m3_1/handoff.md
- D:/test-mobile-app/.agents/explorer_m3_2/handoff.md
- D:/test-mobile-app/.agents/explorer_m3_3/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task Scope (Milestone 3: TailAdmin Dashboard Venue Management CRUD Module):
Implement full Venue CRUD capabilities in D:/test-mobile-app/dashboard matching the Nest.js `Venue` entity schema and specifications from the explorers' reports:

1. Data Layer & Schema Enhancements:
   - In `D:/test-mobile-app/dashboard/src/types/index.ts`: export top-level type aliases `CustomPricingRule`, `Coordinates`, and `WorkingHours` if helpful.
   - In `D:/test-mobile-app/dashboard/src/data/mockStore.ts`: ensure `getVenueById(id: string)` is implemented, and `saveVenue`, `addVenue`, `updateVenue`, `deleteVenue` properly serialize/deserialize `Venue` objects with `app_v1_venues` local storage persistence.

2. Navigation & Routing:
   - In `D:/test-mobile-app/dashboard/src/App.tsx`: register route `/venues` mapping to `<VenuesPage />` wrapped inside `<AppLayout />`.
   - In `D:/test-mobile-app/dashboard/src/layout/AppSidebar.tsx`: add "Venue Management" link pointing to `/venues` with `BoxCubeIcon`.

3. Modals & UI Components:
   - Create `D:/test-mobile-app/dashboard/src/components/venue/VenueFormModal.tsx` (or `components/venues/VenueFormModal.tsx`):
     - Interactive form supporting full `Venue` schema:
       * Name (text input)
       * Sports Types (interactive multi-select toggle pills: 5-A-SIDE, 7-A-SIDE, 11-A-SIDE, PADEL, BASKETBALL, TENNIS, VOLLEYBALL, BADMINTON)
       * Address string & Coordinates (Latitude / Longitude inputs with Cairo quick-fill preset)
       * Working Hours (Open / Close time select pickers)
       * Default Hourly Price ($/hr)
       * Custom Hourly Pricing Rules Builder (add/remove custom pricing overrides: Label, Start Time, End Time, Rate)
       * Amenities Checkbox Grid (Parking, Showers, Floodlights, Locker Rooms, Wifi, Refreshments, Equipment Rental, Cafeteria, Air Conditioned Lounge)
       * Image Gallery URL list builder with live thumbnail previews
       * Full form validation (required fields, valid numbers, non-empty arrays)
   - Create `D:/test-mobile-app/dashboard/src/components/venue/DeleteVenueModal.tsx`:
     - Delete confirmation dialog with active bookings check.

4. Page Implementation:
   - Create `D:/test-mobile-app/dashboard/src/pages/VenuesPage.tsx`:
     - Header card with stats badges (Total Venues, Active Sports Types, Avg Hourly Rate) and "+ Add Venue" CTA.
     - Search & Filter bar (name/address search, sport type filter dropdown, status filter).
     - Dual View mode (Grid View with rich venue cards vs Table View).
     - Quick Detail Drawer / View Modal.
     - Hooked to `mockStore.getVenues()`, `mockStore.saveVenue()`, `mockStore.deleteVenue()`, `mockStore.subscribeStoreChange()`.

5. Verification:
   - Run `cd D:/test-mobile-app/dashboard && npm run build` to verify clean compilation with 0 errors.
   - Document verification results in D:/test-mobile-app/.agents/worker_m3_r1/handoff.md.
   - Send a message to parent orchestrator upon completion.
