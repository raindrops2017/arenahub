# Milestone 2 Technical Blueprint: User & Customer Management + Wallet Payouts

## 1. Executive Summary & Scope

Milestone 2 delivers complete administration capabilities within the **TailAdmin Admin Dashboard** (`D:/test-mobile-app/dashboard`):
1. **User Management Module (`/users`)**: Full CRUD and status management for internal system users (Admins, Employees, Managers, Owners) with search, filtering, and role management.
2. **Customer Management Module (`/customers`)**: Customer account administration, status enforcement (`Active`, `On Hold`, `Suspended`, `Inactive`), Customer Profile Drawer with wallet transaction audit logs, and Manual Cash Payout Modal deducting from system wallets.
3. **App & Navigation Registration**: Route wiring in `App.tsx` and sidebar navigation registration with custom icons in `AppSidebar.tsx`.

All components reactively consume and update the shared persistent mock store (`mockStore.ts`).

---

## 2. Shared Data Store & Schema Alignment (`mockStore.ts`)

### Existing Interfaces (`dashboard/src/types/index.ts`)
- **`SystemUser`**: `id`, `name`, `email`, `phone`, `role` (`Admin` | `Employee` | `Manager` | `Owner`), `status` (`Active` | `Inactive`), `avatarUrl`, `createdAt`, `updatedAt`.
- **`Customer`**: `id`, `name`, `phone`, `email`, `position`, `status` (`Active` | `On Hold` | `Suspended` | `Inactive`), `walletId`, `walletBalance`, `initialBalance`, `createdAt`, `updatedAt`.
- **`WalletTransaction`**: `id`, `walletId`, `customerId`, `customerName`, `type` (`REFUND_CREDIT` | `BOOKING_DEBIT` | `ADMIN_PAYOUT` | `TOP_UP`), `amount`, `balanceAfter`, `description`, `referenceId`, `createdBy`, `timestamp`, `createdAt`, `auditNotes`.

### Store Functions to Update in `mockStore.ts`
1. `toggleSystemUserStatus(id: string): SystemUser`:
   Toggles system user status between `'Active'` and `'Inactive'`, saves store, and fires subscriber event.
2. `saveSystemUser(user: Partial<SystemUser> & { name: string; email: string; role: SystemUserRole }): SystemUser`:
   Ensures auto-generation of unique `id` (`user-${Date.now()}`) and default `avatarUrl` if absent when creating a new user.

---

## 3. Component Architecture & Detailed Blueprint

### Component 1: System User Management Page (`/users`)
- **File**: `D:/test-mobile-app/dashboard/src/pages/UsersPage.tsx`
- **Page Structure**:
  - `PageMeta`: Title "User Management | ArenaHub Admin".
  - `PageBreadcrumb`: Page Title "System Users", breadcrumb link to Dashboard.
  - **Header Bar**:
    - Title & total user count badge.
    - Button `+ Add New User` (opens User Form Modal in create mode).
  - **Search & Filter Controls Card**:
    - **Search Input**: Input field filtering by `name`, `email`, or `phone` (case-insensitive).
    - **Role Filter Dropdown**: Select `All Roles`, `Admin`, `Employee`, `Manager`, `Owner`.
    - **Status Filter Dropdown**: Select `All Statuses`, `Active`, `Inactive`.
  - **System Users Data Table**:
    - `User`: Avatar image / initials badge + Full Name + Email address.
    - `Phone`: Formatted phone number (`+20...`).
    - `Role Badge`:
      - `Admin`: Primary badge (`bg-brand-50 text-brand-500`)
      - `Manager`: Warning badge (`bg-warning-50 text-warning-600`)
      - `Employee`: Info badge (`bg-blue-light-50 text-blue-light-500`)
      - `Owner`: Success badge (`bg-success-50 text-success-600`)
    - `Status Badge`:
      - `Active`: Success badge (`Active`)
      - `Inactive`: Error badge (`Inactive`)
    - `Created At`: Date string.
    - `Actions`:
      - `Edit` button (pencil icon): Opens User Form Modal loaded with user data.
      - `Toggle Status` button: Directly switches Active ↔ Inactive using `mockStore.toggleSystemUserStatus()`.
  - **User Form Modal** (`Modal` component):
    - Title: "Add New System User" or "Edit System User".
    - Form Fields:
      - Full Name (text input, required)
      - Email Address (email input, required)
      - Phone Number (tel input, required)
      - Role (select dropdown: Admin, Employee, Manager, Owner)
      - Status (select dropdown: Active, Inactive)
    - Actions: `Cancel` and `Save User`.

---

### Component 2: Customer Management & Wallet Payouts Page (`/customers`)
- **File**: `D:/test-mobile-app/dashboard/src/pages/CustomersPage.tsx`
- **Page Structure**:
  - `PageMeta`: Title "Customer Management & System Wallets | ArenaHub Admin".
  - `PageBreadcrumb`: Page Title "Customer Management".
  - **Summary Metrics Cards Grid**:
    1. *Total Customers*: Count of all registered customers.
    2. *Active Customers*: Count of customer accounts with `Active` status.
    3. *System Wallet Pool*: Sum of all customer wallet balances (`EGP XXXX`).
    4. *On Hold / Suspended*: Count of accounts requiring compliance attention.
  - **Header & Filter Controls Bar**:
    - **Search Bar**: Real-time filtering by Customer Name or Phone Number.
    - **Status Filter Tabs**: Buttons/Badges for `All`, `Active`, `On Hold`, `Suspended`, `Inactive` with counters.
    - **Primary Action**: `+ Add Customer` button (opens Customer Form Modal).
  - **Customers Table**:
    - `Customer`: Avatar/Initials + Name + Preferred Position (e.g. Midfielder, Forward).
    - `Contact`: Phone number + Email.
    - `Account Status`:
      - `Active`: Green badge (Full platform access).
      - `On Hold`: Orange badge (Booking warning banner).
      - `Suspended`: Red badge (Bookings & payouts blocked).
      - `Inactive`: Gray badge (Archived).
    - `Wallet Balance`: Highlighted tag with currency (`EGP 1,500.00`).
    - `Registered`: Date formatted.
    - `Actions`:
      - `Profile / Wallet`: Opens Customer Profile Slide-over Drawer.
      - `Edit`: Opens Customer Edit Modal.
      - `Cash Payout`: Opens Cash Payout Modal directly.

---

### Component 3: Customer Profile & Wallet Audit Drawer
- **Drawer Component**: Integrated in `CustomersPage.tsx` or as sub-component.
- **Slide-Over Panel Structure**:
  - **Drawer Header**:
    - Customer Name & Position subtitle.
    - Account Status Badge.
    - Close button (X).
  - **Status Enforcement Indicator Banner**:
    - Displays detailed status rule explanation:
      - *Active*: Account has full booking and transaction privileges.
      - *On Hold*: Account has booking flags. Staff notification displayed during checkout.
      - *Suspended*: Account is restricted. All pitch bookings and cash payouts are blocked.
      - *Inactive*: Account is archived. Re-verification required.
  - **System Wallet Summary Card**:
    - Large wallet balance display (`EGP 1,500.00`).
    - Action button: `Process Manual Cash Payout` (opens Payout modal).
  - **Wallet Transaction Audit History Log**:
    - Table / scrollable timeline list of transactions from `mockStore.getTransactions()`.
    - Columns / Items:
      - **Type Badge**:
        - `REFUND_CREDIT` (Green `+ EGP XXX` — Booking refund)
        - `TOP_UP` (Green `+ EGP XXX` — Wallet deposit)
        - `BOOKING_DEBIT` (Dark `- EGP XXX` — Pitch checkout)
        - `ADMIN_PAYOUT` (Red `- EGP XXX` — Cash payout)
      - **Amount & Balance After**: Transaction amount and resulting balance.
      - **Description & Ref ID**: e.g., "Full refund for cancelled slot (BK-1003)".
      - **Created By & Timestamp**: Admin name / System / Customer + date/time.
      - **Audit Notes**: Specific notes provided during manual payouts.

---

### Component 4: Manual Admin Cash Payout Modal
- **Modal Component**: Integrated inside `CustomersPage.tsx` using `Modal`.
- **Form Fields & Layout**:
  - Modal Header: "Manual Cash Payout — [Customer Name]".
  - Customer Info Banner: Shows `Current Wallet Balance: EGP XXX`.
  - **Payout Amount (EGP)**: Numeric input (min 1, step 1).
  - **Audit Note / Rationale**: Required text area (e.g. "Cash paid at facility counter").
  - **Processed By**: Display current admin name ("Admin Sarah").
- **Validation & Business Enforcement**:
  - If Customer Status is `'Suspended'`:
    - Display alert banner: *"Wallet transactions are strictly blocked for Suspended customers."*
    - Disable payout submit button.
  - If Amount > `Customer.walletBalance`:
    - Display error message: *"Payout amount exceeds available wallet balance (EGP XXX)."*
  - If Amount <= 0:
    - Display error: *"Payout amount must be greater than zero."*
- **Execution Flow**:
  - On form submission, calls `mockStore.processAdminCashPayout(customerId, amount, note, adminName)`.
  - Triggers store update notification.
  - Closes modal, refreshes Customer Table and Profile Drawer logs with success toast/alert.

---

## 4. App Routing & Sidebar Menu Wiring

### 1. `D:/test-mobile-app/dashboard/src/App.tsx`
Add route declarations inside `<Route element={<AppLayout />}>`:
```tsx
import UsersPage from "./pages/UsersPage";
import CustomersPage from "./pages/CustomersPage";

// Inside Routes -> AppLayout:
<Route path="/users" element={<UsersPage />} />
<Route path="/customers" element={<CustomersPage />} />
```

### 2. `D:/test-mobile-app/dashboard/src/layout/AppSidebar.tsx`
Add navigation entries to `navItems`:
```tsx
import { UserCircleIcon, GroupIcon } from "../icons";

// Under navItems:
{
  icon: <UserCircleIcon />,
  name: "Users",
  path: "/users",
},
{
  icon: <GroupIcon />,
  name: "Customers",
  path: "/customers",
},
```

---

## 5. Summary of Exact File Modifications & Additions

| File Path | Action | Description |
|-----------|--------|-------------|
| `dashboard/src/data/mockStore.ts` | Update | Add `toggleSystemUserStatus` helper and update `saveSystemUser` ID generation |
| `dashboard/src/pages/UsersPage.tsx` | Create | Complete User Management page with search, filters, table, and user modal |
| `dashboard/src/pages/CustomersPage.tsx` | Create | Complete Customer Management page with search, filters, table, customer modal, profile drawer, transaction audit log, and cash payout modal |
| `dashboard/src/App.tsx` | Update | Register `/users` and `/customers` routes under `AppLayout` |
| `dashboard/src/layout/AppSidebar.tsx` | Update | Add Users & Customers links with icons to sidebar navigation |

---

## 6. Verification & Test Plan

1. **User Management (`/users`)**:
   - Verify listing matches `SEED_USERS` (4 initial users).
   - Test search filter by typing "Sarah", "khaled", or phone number.
   - Test role filter (select Admin, Manager, Employee, Owner).
   - Test creating a new user and editing an existing user.
   - Test `Toggle Status` button: confirm user status toggles between Active and Inactive.

2. **Customer Management & Payouts (`/customers`)**:
   - Verify listing matches `SEED_CUSTOMERS` (5 initial customers).
   - Test filtering by status tab (`Active`, `On Hold`, `Suspended`, `Inactive`).
   - Test creating a new customer with initial balance.
   - Open Profile Drawer for `Ahmed Hassan` (wallet balance 1500 EGP): check transaction statement log.
   - Perform Manual Cash Payout of 300 EGP: verify balance reduces to 1200 EGP and transaction log records `ADMIN_PAYOUT` with audit notes.
   - Open Profile Drawer / Payout modal for `Youssef Ibrahim` (`Suspended` status): verify payout is blocked with status enforcement message.

3. **Navigation & Persistence**:
   - Verify `/users` and `/customers` appear in sidebar and navigate seamlessly.
   - Refresh browser: verify created users, customer updates, and payout transactions persist in `localStorage`.
