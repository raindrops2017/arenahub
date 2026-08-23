# DISPATCH — Worker M2 (Dashboard User & Customer Management + Wallet Payouts)

You are a Worker agent (`teamwork_preview_worker`). Your working directory is `D:/test-mobile-app/.agents/worker_m2_r1`.

## Mandatory Input Files
- `D:/test-mobile-app/.agents/ORIGINAL_REQUEST.md`
- `D:/test-mobile-app/.agents/orchestrator/PROJECT.md`
- `D:/test-mobile-app/.agents/explorer_m2_r1/analysis.md`
- `D:/test-mobile-app/.agents/explorer_m2_r1/handoff.md`

## Write Ownership Boundaries
- `D:/test-mobile-app/dashboard/src/pages/UsersPage.tsx`
- `D:/test-mobile-app/dashboard/src/pages/CustomersPage.tsx`
- `D:/test-mobile-app/dashboard/src/App.tsx`
- `D:/test-mobile-app/dashboard/src/layout/AppSidebar.tsx`
- `D:/test-mobile-app/dashboard/src/data/mockStore.ts`

## Tasks Description
1. **Enhance `mockStore.ts`**:
   - Add `toggleSystemUserStatus(id: string): SystemUser` helper.
   - Ensure `saveSystemUser` auto-generates ID for new users (`usr-${Date.now()}`) if ID is missing.
2. **Implement User Management Page (`/users`)**:
   - Create `dashboard/src/pages/UsersPage.tsx`.
   - Features: List system users, search bar (name/email/phone), role filter (Admin, Employee, Manager, Owner), status filter (Active, Inactive), Create/Edit User Modal, Toggle Status button.
   - Reactive connection to `mockStore.getSystemUsers()` and `subscribeStoreChange()`.
3. **Implement Customer Management Page (`/customers`)**:
   - Create `dashboard/src/pages/CustomersPage.tsx`.
   - Features:
     - Header & search (name/phone).
     - Filter tabs: All, Active, On Hold, Suspended, Inactive.
     - Summary metrics cards (Total Customers, Active, Suspended, Total Wallet Balances).
     - Customer data table with status badges (`Active` = green, `On Hold` = amber, `Suspended` = red, `Inactive` = gray) and wallet balance tags.
     - Create/Edit Customer Modal (name, phone, position, initialBalance, status).
     - Customer Profile Drawer (slide-over panel showing customer details, status badge, wallet balance, and full transaction history log with type, amount, audit note, date).
     - Manual Admin Cash Payout Modal: input payout amount and audit notes, invoking `mockStore.processAdminCashPayout()`, deducting from customer wallet balance, checking status (blocks payouts for Suspended users or insufficient balance), and logging transaction.
   - Reactive connection to `mockStore.getCustomers()` and `subscribeStoreChange()`.
4. **App & Sidebar Route Registration**:
   - In `dashboard/src/App.tsx`: Import `UsersPage` and `CustomersPage`, add routes `<Route path="/users" element={<UsersPage />} />` and `<Route path="/customers" element={<CustomersPage />} />`.
   - In `dashboard/src/layout/AppSidebar.tsx`: Add sidebar menu items for "User Management" (`/users`, icon `GroupIcon`) and "Customer Management" (`/customers`, icon `UserIcon` / `UserCircleIcon`).
5. **Verify build & typecheck**:
   - Run `npx tsc --noEmit` in `D:/test-mobile-app/dashboard`.
   - Run `npm run build` in `D:/test-mobile-app/dashboard`.

Record output in `changes.md` and `handoff.md`.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
