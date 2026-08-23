# TailAdmin Dashboard Architecture Survey & Gap Analysis Report

## Executive Summary
This report presents a comprehensive survey of the **TailAdmin Dashboard** codebase located at `D:/test-mobile-app/dashboard`. The application is built using React 19, Vite 6, Tailwind CSS v4, React Router v7, and ApexCharts. 

The codebase currently provides the baseline TailAdmin UI shell, standard template pages, and atomic UI primitives (Modals, Tables, Badges, Buttons, Form inputs). However, the specific business modules required for the client prototype (**R1 User Management, R2 Customer Management & Wallet Payouts, R3 Venue CRUD, R4 Standalone Full-Screen Booking Page, and R5 Owner & Manager Reports**) are **currently missing** and must be implemented.

---

## 1. Project Structure & Tech Stack

### Tech Stack & Core Dependencies
- **UI Framework**: React `^19.0.0` with `react-dom` `^19.0.0`
- **Routing**: `react-router` `^7.1.5`
- **Build Tool**: Vite `^6.1.0` with `@vitejs/plugin-react` and `vite-plugin-svgr`
- **Styling**: Tailwind CSS `^4.0.8` (`@tailwindcss/postcss` 4.0.8, `@import "tailwindcss";` in `src/index.css`)
- **Charts**: `apexcharts` `^4.1.0` and `react-apexcharts` `^1.7.0`
- **Calendar & Date Utilities**: `@fullcalendar/react` (`^6.1.15`), `flatpickr` (`^4.6.13`)
- **Carousel & UI Extras**: `swiper` (`^11.2.3`), `clsx`, `tailwind-merge`

### Build & Verification Commands
- **Build**: `npm run build` (`tsc -b && vite build`) — *Verified: Builds cleanly with 0 TypeScript/Vite errors.*
- **Dev**: `npm run dev` (`vite`)

### File Map
```
dashboard/
├── package.json
├── vite.config.ts
├── postcss.config.js
├── index.html
└── src/
    ├── main.tsx                  # App entry point (ThemeProvider, AppWrapper)
    ├── App.tsx                   # Central router definition
    ├── index.css                 # Tailwind CSS v4 setup & custom utilities
    ├── context/
    │   ├── SidebarContext.tsx     # Sidebar expanded/hover/mobile state
    │   └── ThemeContext.tsx       # Light/Dark mode state
    ├── layout/
    │   ├── AppLayout.tsx         # Dashboard shell wrapper (Sidebar + Header + Outlet)
    │   ├── AppHeader.tsx         # Top bar (Search, Theme toggle, Profile)
    │   ├── AppSidebar.tsx        # Navigation links & expandable menus
    │   └── Backdrop.tsx          # Mobile backdrop
    ├── components/
    │   ├── ui/                   # Modular UI Primitives
    │   │   ├── modal/index.tsx   # Reusable Modal (fullscreen / centered backdrop)
    │   │   ├── table/index.tsx   # Table, TableHeader, TableBody, TableRow, TableCell
    │   │   ├── badge/Badge.tsx   # Status badge component (success, warning, error, etc.)
    │   │   ├── button/Button.tsx # Standard button component
    │   │   └── dropdown/         # Dropdown & DropdownItem
    │   ├── form/                 # Input fields, Select, MultiSelect, DatePicker
    │   ├── charts/               # Base ApexCharts components (BarChartOne, LineChartOne)
    │   ├── common/               # PageBreadCrumb, PageMeta, ScrollToTop
    │   └── UserProfile/          # UserMetaCard, UserInfoCard, UserAddressCard
    ├── icons/                    # Custom SVG icons exported as ReactComponent
    └── pages/
        ├── Dashboard/Home.tsx    # E-commerce home dashboard template
        ├── UserProfiles.tsx      # Single static user profile page
        ├── Calendar.tsx          # FullCalendar baseline implementation
        ├── Charts/               # BarChart.tsx, LineChart.tsx
        ├── Forms/                # FormElements.tsx
        └── Tables/               # BasicTables.tsx
```

---

## 2. Requirements & Implementation Gap Analysis

### R1. Admin & Employee User Management
- **Current State**: **Missing**. `UserProfiles.tsx` only shows a static individual profile mockup.
- **Required Route**: `/users` (or `/user-management`) wrapped in `AppLayout`.
- **Required Functionality**:
  - Table view of system users (Admins, Employees, Managers, Owners).
  - Search by name, email, or phone.
  - Filters by Role (`Admin`, `Employee`, `Manager`, `Owner`) and Status (`Active`, `Inactive`).
  - Add User Modal & Edit User Modal (Name, Email, Phone, Role, Status).
  - Quick Toggle for Status (`Active` <-> `Inactive`) and Role inline or via dropdown.
  - Detail drawer/modal for quick inspection.
  - Local state + `localStorage` persistence.

### R2. Customer Management & Wallet Payouts
- **Current State**: **Missing**. No customer management or wallet tracking components exist.
- **Required Route**: `/customers` wrapped in `AppLayout`.
- **Required Functionality**:
  - Customer list table with search (Name, Phone), status filters (`Active`, `On Hold`, `Suspended`, `Inactive`), and live Wallet Balance tags (`$XX.XX`).
  - Add/Edit Customer Modal (Name, Phone, Position, Initial Balance, Status).
  - **Status Enforcement Logic**:
    - `Active`: Full access.
    - `On Hold`: Warning flag displayed during booking attempts.
    - `Suspended`: Blocked from bookings and wallet operations.
    - `Inactive`: Archived state.
  - **Customer Profile & Wallet Drawer**:
    - Displays full customer info, current System Wallet balance, and itemized transaction log (Refund credits `+`, Booking debits `-`, Admin cash payouts `-`).
  - **Manual Admin Cash Payout Modal**:
    - Form to deduct cash payouts from customer's system wallet balance.
    - Input fields: Amount (`$`), Admin audit note / payout reason.
    - Updates wallet balance and appends audit transaction log entry immediately.

### R3. Venue Management CRUD Module
- **Current State**: **Missing**. No venue entity definitions or CRUD screens.
- **Required Route**: `/venues` wrapped in `AppLayout`.
- **Required Schema Compliance (matching Nest.js `Venue` schema)**:
  - `id`: string/number
  - `name`: string
  - `sportsTypes`: array of strings (`["Football", "Basketball", "Tennis", "Padel"]`)
  - `address`: string
  - `coordinates`: `{ latitude: number, longitude: number }`
  - `workingHours`: `{ open: string, close: string }`
  - `pricing`: `{ defaultHourlyRate: number, customHourPricing: Array<{ startHour: number, endHour: number, rate: number }> }`
  - `amenities`: array of strings (`["Parking", "Showers", "Floodlights", "Locker Room", "WiFi", "Cafe"]`)
  - `imageGallery`: array of image URLs
- **Required Functionality**:
  - Venue Cards/Grid & Table view.
  - Add Venue & Edit Venue Modal/Form supporting all schema fields (amenities checkboxes, sports multi-select, pricing configuration, image gallery URLs).
  - Delete / Archive venue action with modal confirmation.

### R4. Standalone Full-Screen Booking Page
- **Current State**: **Missing**. Only a basic template `Calendar.tsx` exists inside the layout.
- **Required Route**: `/bookings/fullscreen` (**outside `AppLayout` shell**).
- **Required Architecture**:
  - Isolated full-screen container (`h-screen w-screen overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900`).
  - Top navigation bar:
    - Return button: `<- Back to Dashboard` (links to `/`).
    - Date range navigation bar (Today, Previous, Next, Date Picker).
    - View Switchers: `Time Slot Grid`, `Calendar`, `List View`.
  - **New Booking Modal**:
    - Customer Search & Auto-complete selector.
    - **Customer Status Validation Check**:
      - If `Suspended`: display block modal/banner preventing booking.
      - If `On Hold`: display warning notice banner, allow proceeding with caution.
    - Venue & Pitch slot selection.
    - Payment Method Selector: **System Wallet Balance**, Cash, Credit Card.
      - Checks customer wallet balance if System Wallet is chosen.
  - **Booking Update Form**: Modify slot time, venue, or customer assignment.
  - **Cancellation Modal**:
    - Cancellation reason input.
    - Refund Policy selector: `Full Refund (100%)`, `Partial Refund (50%)`, `No Refund (0%)`.
    - **Automatic Wallet Credit**: Calculates refund amount and automatically credits customer's System Wallet balance with a refund transaction entry.

### R5. Owner & Manager Reports Suite
- **Current State**: **Missing**. Baseline chart components (`BarChartOne`, `LineChartOne`) exist as static placeholders, but no consolidated reports suite.
- **Required Route**: `/reports` wrapped in `AppLayout`.
- **Required Functionality**:
  - Interactive Filter Bar: Venue Selector dropdown, Date Range selector (Daily, Weekly, Monthly, Custom).
  - **Chart 1: Revenue Breakdown**: Gross Revenue vs Net Revenue after Refunds (ApexCharts Area/Bar combination chart).
  - **Chart 2: Slot Occupancy Rate & Peak Hours**: Heatmap or Bar chart showing busiest hours and occupancy percentage per slot.
  - **Chart 3: Venue-by-Venue Performance**: Bar/Column comparison chart comparing total revenue and bookings per venue.
  - **Chart 4: Cancellation Rate & Wallet Refund Impact**: Donut/Pie or Bar chart showing cancellation ratios, refund totals, and net wallet credit impacts.

---

## 3. Shared Mock Data & Synchronization Architecture (R7)

To ensure seamless dual-platform client demonstrations between the TailAdmin Dashboard and Expo Mobile App, a single synchronized mock data store strategy must be established:

1. **Storage Key**: `TAILADMIN_SYSTEM_STORE_V1` stored in browser `localStorage`.
2. **Initial Seed Data**:
   - `users`: Mock Admins, Managers, Employees.
   - `customers`: Mock Customers with various statuses (`Active`, `On Hold`, `Suspended`, `Inactive`) and populated wallet balances (e.g. $150.00, $0.00, $50.00).
   - `venues`: Mock Venues with complete Nest.js schema fields.
   - `bookings`: Initial booking slots across venues with dates, customer IDs, payment methods, and statuses (`Booked`, `Cancelled`, `Completed`).
   - `walletTransactions`: Initial transaction history for each customer.
3. **Reactivity & Event Broadcast**:
   - Custom event standard `window.dispatchEvent(new CustomEvent('mock-store-update'))` triggered whenever state changes (e.g. adding booking, processing payout, refunding booking).
   - Custom React hook `useMockStore()` to consume and update state responsively across all pages.

---

## 4. Implementation Blueprint & File Targets

| Target File Path | Purpose / Requirement | Details |
|---|---|---|
| `src/data/mockStore.ts` | R7 Shared Mock Data & LocalStorage Engine | Seed data, CRUD helpers, `localStorage` persistence, custom event dispatching |
| `src/pages/Users/UserManagement.tsx` | R1 Admin & Employee User Management | Page container, user list, search/filter bar, add/edit modal, status toggle |
| `src/pages/Customers/CustomerManagement.tsx` | R2 Customer Management & Wallet Payouts | Page container, customer list, search, status badges, profile/wallet drawer, cash payout modal |
| `src/pages/Venues/VenueManagement.tsx` | R3 Venue CRUD Module | Page container, venue cards/table, full Nest.js schema form modal (sports, pricing, amenities, gallery) |
| `src/pages/Bookings/FullscreenBookings.tsx` | R4 Standalone Full-Screen Booking Page | Dedicated full-screen layout, top bar with back button, slot grid view, customer status check, wallet checkout & cancellation refund modal |
| `src/pages/Reports/ReportsSuite.tsx` | R5 Owner & Manager Reports Suite | Reports suite page with interactive filters, ApexCharts for revenue, occupancy heatmap, venue comparisons, and refund impacts |
| `src/App.tsx` | Routing updates | Register `/users`, `/customers`, `/venues`, `/reports` under `AppLayout`, and `/bookings/fullscreen` standalone |
| `src/layout/AppSidebar.tsx` | Navigation updates | Add sidebar links for Users, Customers, Venues, Fullscreen Booking, and Reports Suite |

---

## 5. Verification Plan

1. **Build Verification**: Run `npm run build` inside `D:/test-mobile-app/dashboard` to verify zero TypeScript or Vite bundle errors.
2. **Navigation Verification**: Confirm sidebar links transition smoothly to `/users`, `/customers`, `/venues`, `/reports`, and `/bookings/fullscreen`.
3. **Data Integrity & Persistence**:
   - Create a customer in `/customers` -> reload page -> verify customer persists.
   - Process an admin cash payout in customer drawer -> verify wallet balance decreases and transaction log updates.
   - Create a booking with wallet payment in `/bookings/fullscreen` -> verify customer wallet balance decreases.
   - Cancel a booking with Full Refund -> verify customer wallet balance increases automatically.
