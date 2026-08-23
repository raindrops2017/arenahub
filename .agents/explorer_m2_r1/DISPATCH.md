# DISPATCH — Explorer M2 (User & Customer Management + Wallet Payouts)

You are an Explorer agent (`teamwork_preview_explorer`). Your working directory is `D:/test-mobile-app/.agents/explorer_m2_r1`.

## Mandatory Input Files
- `D:/test-mobile-app/.agents/ORIGINAL_REQUEST.md`
- `D:/test-mobile-app/.agents/orchestrator/PROJECT.md`
- `D:/test-mobile-app/dashboard/src/data/mockStore.ts`
- `D:/test-mobile-app/dashboard/src/types/index.ts`

## Tasks Description
Formulate the complete technical blueprint for Milestone 2:
1. **User Management Page (`/users`)**:
   - Component location: `D:/test-mobile-app/dashboard/src/pages/UsersPage.tsx`.
   - Features: List users, search bar (name, email, phone), role filter (Admin, Employee, Manager, Owner), status filter (Active, Inactive), Create User Modal, Edit User Modal, Toggle Status/Role button.
   - Connected to `mockStore.getSystemUsers()`, `mockStore.saveSystemUser()`, `mockStore.toggleSystemUserStatus()`.
2. **Customer Management Page (`/customers`)**:
   - Component location: `D:/test-mobile-app/dashboard/src/pages/CustomersPage.tsx`.
   - Features: List customers, search bar (name, phone), status filter badges (Active, On Hold, Suspended, Inactive), wallet balance tags, Add/Edit Customer Modal (name, phone, position, initial balance, status), Customer Profile Drawer, Wallet Transaction History log, and Manual Cash Payout Modal (amount, audit note).
   - Connected to `mockStore.getCustomers()`, `mockStore.saveCustomer()`, `mockStore.processAdminCashPayout()`, `mockStore.getTransactions()`.
3. **App & Sidebar Route Registration**:
   - Add `/users` and `/customers` routes to `D:/test-mobile-app/dashboard/src/App.tsx`.
   - Add sidebar menu items with icons to `D:/test-mobile-app/dashboard/src/components/sidebar/AppSidebar.tsx` or `D:/test-mobile-app/dashboard/src/layout/AppSidebar.tsx`.

Document your blueprint in `analysis.md` and `handoff.md`.
