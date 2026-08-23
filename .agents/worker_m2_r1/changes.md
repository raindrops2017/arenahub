# Changes — Milestone 2 (User & Customer Management + Wallet Payouts)

## Modified & Created Files Summary

| File Path | Action | Description |
|-----------|--------|-------------|
| `dashboard/src/data/mockStore.ts` | Modified | Updated `saveSystemUser` with auto ID generation (`usr-${Date.now()}`), added `toggleSystemUserStatus(id)` helper, and updated `addCustomer` type signature. |
| `dashboard/src/components/ui/button/Button.tsx` | Modified | Added `type?: "button" \| "submit" \| "reset"` prop to `ButtonProps` interface and passed down to `<button>`. |
| `dashboard/src/pages/UsersPage.tsx` | Created | Full User Management page (`/users`) supporting search, role/status filter dropdowns, data table with role/status badges, create/edit user modal, and status toggle. |
| `dashboard/src/pages/CustomersPage.tsx` | Created | Comprehensive Customer Management page (`/customers`) with search, status tabs with counters, 4 summary metrics cards, customer data table, create/edit customer modal, customer profile & wallet drawer, transaction audit history log, and manual cash payout modal with status enforcement. |
| `dashboard/src/App.tsx` | Modified | Registered `/users` and `/customers` routes inside `<Route element={<AppLayout />}>`. |
| `dashboard/src/layout/AppSidebar.tsx` | Modified | Added navigation items for "User Management" (`/users`) and "Customer Management" (`/customers`) in sidebar `navItems`. |

## Detailed Changes

### 1. `mockStore.ts`
- **`saveSystemUser`**: Extended to generate new ID `usr-${Date.now()}` when creating users without an ID, set default values for avatarUrl, status (`Active`), role (`Employee`), createdAt, and updatedAt timestamps.
- **`toggleSystemUserStatus`**: Added function that finds a system user by ID, toggles status between `'Active'` and `'Inactive'`, updates `updatedAt`, persists to `localStorage`, and emits a store change notification.
- **`addCustomer`**: Updated parameter type signature so `walletBalance` is omitted from required parameters when calling `addCustomer({ initialBalance, ... })`.

### 2. `Button.tsx`
- Added optional `type` prop (`"button" | "submit" | "reset"`) to `ButtonProps` so `<Button type="submit">` works seamlessly in form modals without TypeScript errors.

### 3. `UsersPage.tsx`
- Page component for route `/users`.
- Connected to `mockStore.getSystemUsers()` and `subscribeStoreChange()`.
- Provides real-time text search filtering across `name`, `email`, and `phone`.
- Dropdown filters for Role (`All Roles`, `Admin`, `Employee`, `Manager`, `Owner`) and Status (`All Statuses`, `Active`, `Inactive`).
- Styled table with avatar, role badges (Admin: primary, Manager: warning, Employee: info, Owner: success), status badges (Active: success, Inactive: error), formatted dates, and action buttons (`Edit` and `Deactivate/Activate`).
- Create and edit user modal using `Modal` component.

### 4. `CustomersPage.tsx`
- Page component for route `/customers`.
- Connected to `mockStore.getCustomers()`, `getTransactions()`, and `subscribeStoreChange()`.
- Real-time search bar for name and phone.
- Filter tabs (`All`, `Active`, `On Hold`, `Suspended`, `Inactive`) displaying customer counts per category.
- Metric summary grid displaying Total Customers, Active Customers, System Wallet Pool balance (EGP sum), and On Hold / Suspended count.
- Customer Table with custom initials avatar, contact info, position badge, status badge (`Active` green, `On Hold` amber, `Suspended` red, `Inactive` gray), wallet balance tag in EGP, and action buttons (`Profile`, `Edit`, `Payout`).
- Customer Profile Drawer: Slide-over right panel showing customer details, status policy banner (`Active`, `On Hold`, `Suspended`, `Inactive`), wallet balance card with Cash Payout trigger button, and full transaction history log showing type badges, amount, balance after, description, reference ID, timestamp, createdBy, and audit notes.
- Manual Cash Payout Modal: Allows admins to enter payout amount and audit notes. Enforces status rules (disables payout for `Suspended` customers with warning message) and balance checks (prevents payouts exceeding customer balance).

### 5. `App.tsx` & `AppSidebar.tsx`
- Registered routes `<Route path="/users" element={<UsersPage />} />` and `<Route path="/customers" element={<CustomersPage />} />` under `<Route element={<AppLayout />}>`.
- Added sidebar menu items for "User Management" (`/users`) and "Customer Management" (`/customers`).
