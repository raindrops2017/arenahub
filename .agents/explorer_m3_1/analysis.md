# Venue Management UI & Navigation Analysis & Specification

**Author**: `explorer_m3_1` (Venue Management UI & Navigation Explorer)  
**Date**: 2026-08-07  
**Target Milestone**: Milestone 3 (Dashboard Venue Management CRUD)  
**Target Directory**: `D:/test-mobile-app/dashboard/src`

---

## 1. Executive Summary

This report provides the complete codebase investigation and UI/UX design specification for implementing the **Venue Management CRUD Module (`VenuesPage.tsx`)** in the TailAdmin Admin Dashboard (`D:/test-mobile-app/dashboard/src`).

Key discoveries:
1. **Router & Navigation**: Route registration in `App.tsx` requires adding `<Route path="/venues" element={<VenuesPage />} />` inside the `<AppLayout />` parent route. `AppSidebar.tsx` requires adding a `Venue Management` entry to the `navItems` array using `BoxCubeIcon` or `BoxIcon`.
2. **Data Store & Schema**: `mockStore.ts` already implements full persistence and helper methods (`getVenues()`, `saveVenue()`, `deleteVenue()`, `subscribeStoreChange()`) for the `Venue` entity.
3. **UI Consistency**: The page will follow TailAdmin design standards established in `UsersPage.tsx` and `CustomersPage.tsx`, utilizing `PageMeta`, `PageBreadcrumb`, `Modal`, `Badge`, `Button`, and TailAdmin dark-mode compatible Tailwind CSS card/table utilities.

---

## 2. Router Setup (`App.tsx`)

### Location Analysis
In `D:/test-mobile-app/dashboard/src/App.tsx`:
- The application uses `react-router` (v7 SPA).
- Core pages inside the dashboard shell are wrapped inside `<Route element={<AppLayout />}>`.

### Required Integration
Import `VenuesPage` from `./pages/VenuesPage` and register `/venues`:

```tsx
// File: D:/test-mobile-app/dashboard/src/App.tsx

// Imports
import Home from "./pages/Dashboard/Home";
import UsersPage from "./pages/UsersPage";
import CustomersPage from "./pages/CustomersPage";
import VenuesPage from "./pages/VenuesPage"; // <--- Add import

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
          <Route element={<AppLayout />}>
            <Route index path="/" element={<Home />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/venues" element={<VenuesPage />} /> {/* <--- Add route */}
            
            {/* ... other routes */}
          </Route>
        </Routes>
      </Router>
    </>
  );
}
```

---

## 3. Sidebar Navigation Setup (`AppSidebar.tsx`)

### Location Analysis
In `D:/test-mobile-app/dashboard/src/layout/AppSidebar.tsx`:
- Navigation items are defined in `const navItems: NavItem[]`.
- Icon imports come from `../icons`.

### Required Integration
Add "Venue Management" item to `navItems`:

```tsx
// File: D:/test-mobile-app/dashboard/src/layout/AppSidebar.tsx

import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  GroupIcon,
  UserCircleIcon,
  BoxIcon, // <--- Available icon for venues
} from "../icons";

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    subItems: [{ name: "Ecommerce", path: "/", pro: false }],
  },
  {
    icon: <UserCircleIcon />,
    name: "User Management",
    path: "/users",
  },
  {
    icon: <GroupIcon />,
    name: "Customer Management",
    path: "/customers",
  },
  {
    icon: <BoxCubeIcon />, // <--- Venue icon
    name: "Venue Management",
    path: "/venues",
  },
  {
    icon: <CalenderIcon />,
    name: "Calendar",
    path: "/calendar",
  },
  // ... rest of navItems
];
```

---

## 4. Existing Page Design Conventions & Component Analysis

Investigation of `UsersPage.tsx` and `CustomersPage.tsx` reveals the following standard layout and component patterns:

### UI & Styling Conventions
1. **Page Wrapping**:
   - `<PageMeta title="Venue Management | ArenaHub Admin" description="..." />`
   - `<PageBreadcrumb pageTitle="Venue Management" />`
   - Outer container space: `<div className="space-y-6">`

2. **Top Header Card**:
   - `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6`
   - Left side: Title + Total Badge (`Total: {venues.length}`) + Subtitle text.
   - Right side: Primary CTA Button (`<Button startIcon={<PlusIcon />}>Add Venue</Button>`).

3. **Metrics Card Grid**:
   - 3 or 4 metric cards in `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`
   - Styled with `rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]`

4. **Reusable UI Components**:
   - **`Modal`**: imported from `../components/ui/modal`. Props: `isOpen`, `onClose`, `children`.
   - **`Badge`**: imported from `../components/ui/badge/Badge`. Color variants: `primary`, `success`, `warning`, `error`, `info`, `light`. Size: `sm`, `md`.
   - **`Button`**: imported from `../components/ui/button/Button`. Props: `variant` (`"primary"` | `"outline"`), `size`, `startIcon`, `onClick`, `disabled`, `type`.

5. **Store Reactivity Pattern**:
   ```tsx
   const refreshData = () => {
     setVenues(getVenues());
   };

   useEffect(() => {
     refreshData();
     const unsubscribe = subscribeStoreChange(() => {
       refreshData();
     });
     return () => unsubscribe();
   }, []);
   ```

---

## 5. Complete UI Specification for `VenuesPage.tsx`

### A. Component Hierarchy & Layout Structure
`VenuesPage.tsx` will consist of:
1. `PageMeta` & `PageBreadcrumb`
2. **Page Header Card** (Title, Badge, "+ Add Venue" CTA button)
3. **Summary Stats Badges Grid** (Total Venues, Active Sports, Avg Hourly Rate, Maintenance Count)
4. **Search, Filter & View Toggle Controls Bar**:
   - Search text input (filters by name or address).
   - Sport type filter dropdown/tabs (`ALL`, `5-A-SIDE`, `7-A-SIDE`, `11-A-SIDE`, `PADEL`).
   - Status filter dropdown (`ALL`, `Active`, `Maintenance`, `Inactive`).
   - View mode switcher (`Grid View` vs `Table View`).
5. **Venue Display Views**:
   - **Grid View**: Responsive card grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`).
   - **Table View**: Full data table with sticky-like headers.
6. **Modals & Slide-overs**:
   - **Create / Edit Venue Modal**: Form supporting all Nest.js `Venue` entity fields.
   - **Venue Details Modal / Drawer**: Full venue view (custom pricing schedule, amenities list, coordinates, description, gallery).
   - **Delete Confirmation Modal**: Confirmation prompt before removal.

---

### B. Summary Metrics Badges Specification

| Card | Title | Value Expression | Description | Icon / Accent |
|------|-------|------------------|-------------|---------------|
| 1 | **Total Venues** | `venues.length` | Total registered sport venues | `BoxCubeIcon` (Brand theme) |
| 2 | **Active Sports** | `Array.from(new Set(venues.flatMap(v => v.sportsTypes))).length` | Unique sports available (5-v-5, Padel, etc.) | `GridIcon` (Success green) |
| 3 | **Avg Hourly Rate** | `EGP (sum(defaultPricePerHour) / count).toFixed(2)` | Average base price per hour across venues | `DollarLineIcon` (Blue theme) |
| 4 | **Maintenance / Inactive** | `venues.filter(v => v.status !== 'Active').length` | Venues currently under maintenance or inactive | `AlertIcon` (Warning/Error theme) |

---

### C. Search, Filter & View Toggle Bar Specification

```tsx
<div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    {/* Left: Search & Dropdown Filters */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search venue name or address..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:text-white"
      />

      {/* Sport Type Filter */}
      <select
        value={sportFilter}
        onChange={(e) => setSportFilter(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      >
        <option value="ALL">All Sports Types</option>
        <option value="5-A-SIDE">5-A-SIDE</option>
        <option value="7-A-SIDE">7-A-SIDE</option>
        <option value="11-A-SIDE">11-A-SIDE</option>
        <option value="PADEL">PADEL</option>
      </select>

      {/* Status Filter */}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      >
        <option value="ALL">All Statuses</option>
        <option value="Active">Active</option>
        <option value="Maintenance">Maintenance</option>
        <option value="Inactive">Inactive</option>
      </select>
    </div>

    {/* Right: Grid / Table View Switcher */}
    <div className="flex items-center gap-1 self-end lg:self-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
      <button
        onClick={() => setViewMode('grid')}
        className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
          viewMode === 'grid'
            ? 'bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-xs'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        <GridIcon className="w-4 h-4" />
        Grid
      </button>
      <button
        onClick={() => setViewMode('table')}
        className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
          viewMode === 'table'
            ? 'bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-xs'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        <ListIcon className="w-4 h-4" />
        Table
      </button>
    </div>
  </div>
</div>
```

---

### D. Display Views Detailed Specification

#### 1. Grid View (Card Component Layout)
Each card represents a `Venue` with the following structure:
- **Card Container**: `rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden flex flex-col hover:shadow-lg transition-all`
- **Image Header Overlay**:
  - Image banner: `h-48 w-full object-cover` using `venue.imageUrls[0]` or fallback image.
  - Top-left badge overlay: Rating badge (`⭐ 4.8 (42)`).
  - Top-right status badge overlay: `Active` (green `success`), `Maintenance` (yellow `warning`), `Inactive` (gray `light`).
- **Card Content Body**:
  - **Venue Title**: `font-bold text-lg text-gray-800 dark:text-white`
  - **Address**: Text with location icon (`text-xs text-gray-500 flex items-center gap-1`)
  - **Sports Badges**: Horizontal flex row of sport badges (`5-A-SIDE`, `PADEL`, etc.) using `Badge` component (color: `primary` / `info`).
  - **Working Hours Row**: Time icon + `openTime - closeTime` (e.g. `08:00 AM - 02:00 AM`).
  - **Pricing Highlight Box**:
    - Base Rate: `EGP {defaultHourlyPrice || pricing.defaultPricePerHour}/hr` (font-mono, font-bold, text-brand-600).
    - Custom Rate Indicator: If `customHourlyPrices.length > 0`, display badge: `+ {customHourlyPrices.length} Peak Rate(s)`.
  - **Amenities Chips**: Display first 3 amenities + `+{amenities.length - 3} more` chip.
- **Card Footer Action Buttons**:
  - `View Details` (outline button / Eye icon) -> Opens Venue Detail Modal
  - `Edit` (outline button / Pencil icon) -> Opens Edit Venue Modal
  - `Delete` (error text button / Trash bin icon) -> Opens Delete Confirmation Modal

#### 2. Table View Component Layout
- **Table Container**: `overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]`
- **Columns**:
  1. **Venue**: Image thumbnail (12x12 rounded-lg) + Name + Address.
  2. **Sports Types**: Stacked/row badges for sports supported.
  3. **Working Hours**: `openTime - closeTime` (days open tooltip or subtext).
  4. **Base & Peak Rates**: Default EGP rate/hr + custom rate pill.
  5. **Status**: `Badge` component (`Active` | `Maintenance` | `Inactive`).
  6. **Actions**: Right-aligned row of buttons (`View`, `Edit`, `Delete`).

---

### E. Modals Specification

#### 1. Create / Edit Venue Modal
Triggered by "+ Add Venue" CTA or card/row "Edit" button. Uses `<Modal isOpen={isModalOpen} onClose={...}>`.

**Form Fields Specification (matching Nest.js Venue Schema)**:
1. **Venue Name**: `<input type="text" required />` (e.g. "ARENA 1 - Zayed Sports Hub")
2. **Status**: `<select>` options: `Active`, `Maintenance`, `Inactive`.
3. **Sports Types (Multi-select Checkboxes)**:
   - `[x] 5-A-SIDE` `[x] 7-A-SIDE` `[x] 11-A-SIDE` `[x] PADEL`
4. **Street Address**: `<input type="text" required />`
5. **Coordinates**:
   - `Latitude`: `<input type="number" step="any" />` (e.g. `30.0444`)
   - `Longitude`: `<input type="number" step="any" />` (e.g. `30.9833`)
6. **Working Hours**:
   - `Open Time`: `<input type="text" placeholder="08:00 AM" />`
   - `Close Time`: `<input type="text" placeholder="02:00 AM" />`
   - `Days Open`: Checkboxes/Multi-select for `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`.
7. **Pricing Structure**:
   - `Default Hourly Price (EGP)`: `<input type="number" required />`
   - `Custom Hourly Rates Builder`: Dynamic array where user can add/remove peak pricing rules:
     - Start Hour (e.g. `18:00`)
     - End Hour (e.g. `00:00`)
     - Price Per Hour (e.g. `280`)
     - "+ Add Custom Pricing Rule" button.
8. **Amenities (Checkboxes Grid)**:
   - `Floodlights`, `Changing Rooms`, `Showers`, `Parking`, `Cafeteria`, `FIFA Turf`, `VIP Locker Rooms`, `Spectator Stand`, `Medical Room`, `Panoramic Glass Courts`, `Racket Rental`, `Air Conditioned Lounge`, `Juice Bar`, `Synthetic Grass`, `Night Lighting`, `Free WiFi`.
9. **Image Gallery URLs**:
   - `<textarea placeholder="Enter image URLs (one per line or comma-separated)" />`
10. **Description**:
    - `<textarea placeholder="Detailed description of pitch surface, floodlighting, facilities..." />`

**Form Handling & Mutations**:
- On Submit: Call `saveVenue(venueData)` from `mockStore.ts`.
- Handles both creation (new ID generated via `Date.now()`) and update.
- Validation: Name, Address, Default Hourly Price required.

#### 2. Venue Detail View Modal / Drawer
Triggered by "View Details" button. Displays:
- Hero image banner & image gallery thumbnail grid.
- Full venue name, rating, status badge, full address, GPS coordinates with Google Maps direct link (`https://www.google.com/maps?q=lat,lng`).
- Sports supported list with high-contrast badges.
- Detailed working hours & days open schedule.
- Pricing Breakdown Card: Default Rate + Custom Hourly Peak Rates table.
- Complete list of amenities with icons/chips.
- Description text block.

#### 3. Delete Confirmation Modal
Triggered by "Delete" button. Displays:
- Warning icon + prompt: *"Are you sure you want to delete venue '{venueName}'? This action cannot be undone."*
- Action buttons: "Cancel" and "Confirm Delete" (`variant="error"` / red button).
- On confirm: call `deleteVenue(id)` from `mockStore.ts` and close modal.

---

## 6. Implementation Checklist & File Path Map

| File Path | Purpose | Required Action |
|-----------|---------|-----------------|
| `dashboard/src/App.tsx` | Router configuration | Import `VenuesPage` and register `/venues` route |
| `dashboard/src/layout/AppSidebar.tsx` | Sidebar navigation | Add `Venue Management` to `navItems` with `/venues` path |
| `dashboard/src/pages/VenuesPage.tsx` | Main Venue Management page | Create complete CRUD page with Grid/Table views, filters, and modals |
| `dashboard/src/data/mockStore.ts` | Shared persistence store | Already contains `getVenues()`, `saveVenue()`, `deleteVenue()`, `subscribeStoreChange()` |
| `dashboard/src/types/index.ts` | Shared entity types | Already contains `Venue`, `SportsType`, `VenueStatus`, `VenuePricing`, `CustomPricingRate` |

---

## 7. Next Steps for Implementation

1. **Create `VenuesPage.tsx`** in `dashboard/src/pages/`.
2. **Register Route in `App.tsx`**.
3. **Register Link in `AppSidebar.tsx`**.
4. **Execute Verification**:
   - Verify `npm run build` cleanly builds the React Vite application.
   - Verify venue creation, editing, status filtering, sport filtering, grid/table view toggle, and venue deletion persist across reloads via `mockStore.ts`.
