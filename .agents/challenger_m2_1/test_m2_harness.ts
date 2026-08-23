// Test Harness for M2 Empirical Verification
import {
  getSystemUsers,
  saveSystemUser,
  toggleSystemUserStatus,
  getCustomers,
  addCustomer,
  updateCustomer,
  processAdminCashPayout,
  addBooking,
  getWallets,
  getTransactions
} from "../../dashboard/src/data/mockStore";
import { Customer, SystemUser } from "../../dashboard/src/types";

// Mock localStorage in Node environment
const store: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`[PASS] ${msg}`);
    passed++;
  } else {
    console.error(`[FAIL] ${msg}`);
    failed++;
  }
}

function assertThrows(fn: () => void, expectedErrMsgSubstring: string, msg: string) {
  try {
    fn();
    console.error(`[FAIL] ${msg} - Expected function to throw error containing "${expectedErrMsgSubstring}", but it did not throw.`);
    failed++;
  } catch (err: any) {
    if (err.message && err.message.toLowerCase().includes(expectedErrMsgSubstring.toLowerCase())) {
      console.log(`[PASS] ${msg} - Threw expected error: "${err.message}"`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg} - Threw unexpected error: "${err.message}", expected containing "${expectedErrMsgSubstring}"`);
      failed++;
    }
  }
}

async function runTests() {
  console.log("=== STARTING M2 EMPIRICAL TEST SUITE ===");

  // TEST 1: System User Listing & Creation
  const initialUsers = getSystemUsers();
  assert(initialUsers.length >= 4, "Initial seed users present (>=4)");
  
  const newUser = saveSystemUser({
    name: "Test Employee",
    email: "test.employee@venueops.com",
    phone: "+201999999999",
    role: "Employee",
    status: "Active"
  });
  assert(newUser.id.startsWith("usr-"), `New user created with auto ID: ${newUser.id}`);
  assert(newUser.role === "Employee", "New user role is Employee");
  assert(newUser.status === "Active", "New user status is Active");

  // TEST 2: System User Status Toggle
  const toggled = toggleSystemUserStatus(newUser.id);
  assert(toggled.status === "Inactive", "User status toggled from Active to Inactive");
  const toggledBack = toggleSystemUserStatus(newUser.id);
  assert(toggledBack.status === "Active", "User status toggled back to Active");

  assertThrows(
    () => toggleSystemUserStatus("non-existent-user-id"),
    "not found",
    "Toggling non-existent user status throws 'System user not found'"
  );

  // TEST 3: Customer Creation & Wallet Init
  const initialCusts = getCustomers();
  assert(initialCusts.length >= 5, "Initial seed customers present (>=5)");

  const newCust = addCustomer({
    name: "Test Customer",
    phone: "+201888888888",
    email: "test.cust@example.com",
    position: "Forward",
    initialBalance: 500,
    status: "Active"
  });

  assert(newCust.id.startsWith("cust-"), `New customer created with ID: ${newCust.id}`);
  assert(newCust.walletBalance === 500, "Customer wallet balance set to 500 EGP");
  assert(newCust.walletId.startsWith("wall-"), `Customer assigned wallet ID: ${newCust.walletId}`);

  // Check matching Wallet entity
  const wallets = getWallets();
  const matchedWallet = wallets.find(w => w.customerId === newCust.id);
  assert(matchedWallet !== undefined && matchedWallet.balance === 500, "Wallet entity created with 500 EGP balance");

  // Check initial top-up transaction created
  const txs = getTransactions();
  const topUpTx = txs.find(t => t.customerId === newCust.id && t.type === 'TOP_UP');
  assert(topUpTx !== undefined && topUpTx.amount === 500, "Initial TOP_UP transaction recorded in audit log");

  // TEST 4: Cash Payout - Valid Case
  const payoutTx = processAdminCashPayout(newCust.id, 200, "Counter cash payout test", "Admin Sarah");
  assert(payoutTx.type === "ADMIN_PAYOUT", "Payout transaction type is ADMIN_PAYOUT");
  assert(payoutTx.amount === -200, "Payout transaction amount is -200");
  assert(payoutTx.balanceAfter === 300, "Balance after payout is 300 EGP");
  assert(payoutTx.auditNotes === "Counter cash payout test", "Audit note recorded");

  const updatedCust = getCustomers().find(c => c.id === newCust.id);
  assert(updatedCust?.walletBalance === 300, "Customer walletBalance updated in store to 300 EGP");

  const updatedWallet = getWallets().find(w => w.customerId === newCust.id);
  assert(updatedWallet?.balance === 300, "Wallet entity balance updated in store to 300 EGP");

  // TEST 5: Cash Payout - Error Cases (Insufficient Balance, Negative Amount, Suspended Customer)
  assertThrows(
    () => processAdminCashPayout(newCust.id, 500, "Excess payout test", "Admin Sarah"),
    "insufficient wallet balance",
    "Payout exceeding balance throws Insufficient balance error"
  );

  assertThrows(
    () => processAdminCashPayout(newCust.id, -50, "Negative payout test", "Admin Sarah"),
    "greater than zero",
    "Negative payout amount throws error"
  );

  // Suspended Customer Test (Youssef Ibrahim is seed cust-4, Suspended)
  const suspendedCust = getCustomers().find(c => c.status === "Suspended");
  assert(suspendedCust !== undefined, "Found suspended seed customer (cust-4 Youssef Ibrahim)");
  if (suspendedCust) {
    assertThrows(
      () => processAdminCashPayout(suspendedCust.id, 50, "Suspended payout test", "Admin Sarah"),
      "blocked for suspended",
      "Payout for Suspended customer throws blocked error"
    );

    // TEST 6: Booking Placement for Suspended Customer
    assertThrows(
      () => addBooking({
        bookingCode: "BK-TEST-SUSP",
        venueId: "arena-1",
        venueName: "ARENA 1",
        customerId: suspendedCust.id,
        customerName: suspendedCust.name,
        customerPhone: suspendedCust.phone,
        date: "2026-08-10",
        startTime: "10:00 AM",
        endTime: "11:00 AM",
        slotId: "slot-10-11",
        slots: ["10:00-11:00"],
        price: 200,
        totalPrice: 200,
        currency: "EGP",
        paymentMethod: "Cash",
        paymentStatus: "Pending",
        status: "Confirmed"
      }),
      "blocked from booking",
      "Booking for Suspended customer throws blocked error"
    );
  }

  // TEST 7: Customer Search & Filter Invariants in Page Logic
  const allCusts = getCustomers();
  const searchResult = allCusts.filter(c => c.name.toLowerCase().includes("ahmed") || c.phone.includes("ahmed"));
  assert(searchResult.length >= 1, "Customer search by name 'ahmed' returns result");

  const suspendedFilter = allCusts.filter(c => c.status === "Suspended");
  assert(suspendedFilter.length >= 1, "Customer status tab filter 'Suspended' returns result");

  console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
