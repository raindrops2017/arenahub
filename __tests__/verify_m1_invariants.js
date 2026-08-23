// Empirical Test Harness for Milestone 1 Logic Invariants

class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const mockLocalStorage = new MockLocalStorage();

global.window = {
  dispatchEvent: (event) => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: mockLocalStorage,
};
global.localStorage = mockLocalStorage;

// Dynamic import of mockStore compiled or via module runner
async function runTests() {
  console.log('=== STARTING EMPIRICAL VERIFICATION OF MILESTONE 1 INVARIANTS ===\n');

  let mockStore;
  try {
    mockStore = await import('../dashboard/src/data/mockStore.ts');
  } catch (err) {
    console.error('Failed to import mockStore:', err);
    process.exit(1);
  }

  const results = [];

  // TEST 1: Initial Seed Datasets
  try {
    mockLocalStorage.clear();
    mockStore.initMockStore();
    const customers = mockStore.getCustomers();
    const wallets = mockStore.getWallets();
    const bookings = mockStore.getBookings();

    const c1 = customers.find(c => c.id === 'cust-1');
    const c4 = customers.find(c => c.id === 'cust-4');

    const pass = customers.length === 5 && wallets.length === 5 && c1.walletBalance === 1500 && c4.status === 'Suspended';
    results.push({
      test: 'T1: Initial Seed Data Integrity',
      pass,
      details: `Customers: ${customers.length}, Wallets: ${wallets.length}, Cust-1 balance: ${c1?.walletBalance}, Cust-4 status: ${c4?.status}`
    });
  } catch (e) {
    results.push({ test: 'T1: Initial Seed Data Integrity', pass: false, error: e.message });
  }

  // TEST 2: Suspended Customer Status Enforcement
  try {
    mockLocalStorage.clear();
    mockStore.initMockStore();
    
    let bookingBlocked = false;
    try {
      mockStore.addBooking({
        venueId: 'arena-1',
        venueName: 'ARENA 1',
        customerId: 'cust-4', // Suspended
        customerName: 'Youssef Ibrahim',
        customerPhone: '+201556667777',
        date: '2026-08-10',
        startTime: '06:00 PM',
        endTime: '07:00 PM',
        price: 200,
        paymentMethod: 'Cash',
        status: 'Confirmed'
      });
    } catch (err) {
      bookingBlocked = true;
    }

    let payoutBlocked = false;
    try {
      mockStore.processAdminCashPayout('cust-4', 50, 'Payout test', 'Sarah');
    } catch (err) {
      payoutBlocked = true;
    }

    const pass = bookingBlocked && payoutBlocked;
    results.push({
      test: 'T2: Suspended Customer Enforcement Invariant',
      pass,
      details: `Booking blocked: ${bookingBlocked}, Cash payout blocked: ${payoutBlocked}`
    });
  } catch (e) {
    results.push({ test: 'T2: Suspended Customer Enforcement Invariant', pass: false, error: e.message });
  }

  // TEST 3: Double-Refund Vulnerability on Booking Cancellation (mockStore)
  try {
    mockLocalStorage.clear();
    mockStore.initMockStore();

    const cust1 = mockStore.getCustomers().find(c => c.id === 'cust-1');
    const initialBal = cust1.walletBalance; // 1500

    // Create booking
    const newBook = mockStore.addBooking({
      venueId: 'arena-1',
      venueName: 'ARENA 1',
      customerId: 'cust-1',
      customerName: 'Ahmed Hassan',
      customerPhone: '+201001234567',
      date: '2026-08-12',
      startTime: '08:00 PM',
      endTime: '09:00 PM',
      price: 300,
      paymentMethod: 'Wallet Balance',
      status: 'Confirmed'
    });

    const balAfterBooking = mockStore.getCustomers().find(c => c.id === 'cust-1').walletBalance; // 1200

    // 1st Cancellation
    mockStore.cancelBooking(newBook.id, 'FULL', 'Reason 1');
    const balAfterCancel1 = mockStore.getCustomers().find(c => c.id === 'cust-1').walletBalance; // 1500

    // 2nd Cancellation on same booking!
    let secondCancelThrew = false;
    try {
      mockStore.cancelBooking(newBook.id, 'FULL', 'Reason 2 - duplicate');
    } catch (err) {
      secondCancelThrew = true;
    }

    const balAfterCancel2 = mockStore.getCustomers().find(c => c.id === 'cust-1').walletBalance;

    const hasDoubleRefundBug = !secondCancelThrew && balAfterCancel2 === 1800; // 1500 + 300 extra refund!

    results.push({
      test: 'T3: Double-Refund Vulnerability on Cancel (mockStore)',
      pass: !hasDoubleRefundBug, // Pass if NO double refund bug
      details: `Initial: ${initialBal}, After Booking: ${balAfterBooking}, After 1st Cancel: ${balAfterCancel1}, After 2nd Cancel: ${balAfterCancel2}. Second cancel threw error: ${secondCancelThrew}. Double-refund bug present: ${hasDoubleRefundBug}`
    });
  } catch (e) {
    results.push({ test: 'T3: Double-Refund Vulnerability on Cancel (mockStore)', pass: false, error: e.message });
  }

  // TEST 4: Financial Reports Net Revenue Under-Counting Invariant
  try {
    mockLocalStorage.clear();
    mockStore.initMockStore();

    // Reset bookings in storage to controlled set
    const testBookings = [
      {
        id: 'tb-1',
        venueId: 'arena-1',
        venueName: 'ARENA 1',
        customerId: 'cust-1',
        customerName: 'Ahmed',
        customerPhone: '123',
        date: '2026-08-07',
        startTime: '06:00 PM',
        endTime: '07:00 PM',
        price: 500,
        totalPrice: 500,
        paymentMethod: 'Wallet Balance',
        paymentStatus: 'Paid',
        status: 'Confirmed',
        createdAt: '2026-08-07T10:00:00Z',
        updatedAt: '2026-08-07T10:00:00Z',
      },
      {
        id: 'tb-2',
        venueId: 'arena-1',
        venueName: 'ARENA 1',
        customerId: 'cust-2',
        customerName: 'Salah',
        customerPhone: '456',
        date: '2026-08-07',
        startTime: '07:00 PM',
        endTime: '08:00 PM',
        price: 300,
        totalPrice: 300,
        paymentMethod: 'Credit Card',
        paymentStatus: 'Refunded',
        status: 'Cancelled',
        refundAmount: 300,
        refundOption: 'FULL',
        createdAt: '2026-08-07T10:00:00Z',
        updatedAt: '2026-08-07T10:00:00Z',
      }
    ];

    mockStore.saveBookings(testBookings);
    const reports = mockStore.getReportsData();

    // Gross should be 500 (confirmed booking tb-1).
    // Total refunds should be 300.
    // Net Revenue reported = 500 - 300 = 200 EGP.
    // BUT wait! The revenue collected for tb-1 was 500 EGP. tb-2 was cancelled & refunded (net 0). Total net revenue of business = 500 EGP.
    // Yet reports.netRevenue is 200 EGP!
    const netRevenueMiscalculated = reports.netRevenue === 200 && reports.grossRevenue === 500;

    results.push({
      test: 'T4: Financial Reports Net Revenue Deduction Bug',
      pass: !netRevenueMiscalculated,
      details: `Gross Revenue: ${reports.grossRevenue}, Total Refunds: ${reports.totalRefunds}, Reported Net Revenue: ${reports.netRevenue}. Expected true net: 500 EGP. Net revenue under-counted: ${netRevenueMiscalculated}`
    });
  } catch (e) {
    results.push({ test: 'T4: Financial Reports Net Revenue Deduction Bug', pass: false, error: e.message });
  }

  // TEST 5: Negative / Zero Cash Payout Invariant
  try {
    mockLocalStorage.clear();
    mockStore.initMockStore();

    const cust1Before = mockStore.getCustomers().find(c => c.id === 'cust-1').walletBalance; // 1500
    
    let negPayoutThrew = false;
    try {
      mockStore.processAdminCashPayout('cust-1', -500, 'Negative payout test', 'Sarah');
    } catch (err) {
      negPayoutThrew = true;
    }

    const cust1After = mockStore.getCustomers().find(c => c.id === 'cust-1').walletBalance;
    const balanceIncreased = cust1After === 2000; // 1500 - (-500) = 2000!

    results.push({
      test: 'T5: Negative Cash Payout Invariant',
      pass: !balanceIncreased && negPayoutThrew,
      details: `Before: ${cust1Before}, After negative payout (-500): ${cust1After}. Threw error: ${negPayoutThrew}. Balance increased: ${balanceIncreased}`
    });
  } catch (e) {
    results.push({ test: 'T5: Negative Cash Payout Invariant', pass: false, error: e.message });
  }

  // TEST 6: Customer vs Wallet Store Desynchronization
  try {
    mockLocalStorage.clear();
    mockStore.initMockStore();

    const cust1 = mockStore.getCustomers().find(c => c.id === 'cust-1');
    mockStore.saveCustomer({ ...cust1, walletBalance: 9999 });

    const custUpdated = mockStore.getCustomers().find(c => c.id === 'cust-1');
    const wallUpdated = mockStore.getWallets().find(w => w.customerId === 'cust-1');

    const desynced = custUpdated.walletBalance === 9999 && wallUpdated.balance === 1500;

    results.push({
      test: 'T6: Customer vs Wallet Store Synchronization Invariant',
      pass: !desynced,
      details: `Customer walletBalance: ${custUpdated.walletBalance}, Wallet balance: ${wallUpdated.balance}. Desynchronized: ${desynced}`
    });
  } catch (e) {
    results.push({ test: 'T6: Customer vs Wallet Store Synchronization Invariant', pass: false, error: e.message });
  }

  console.log('=== TEST RESULTS ===');
  console.table(results);

  const failCount = results.filter(r => !r.pass).length;
  console.log(`\nTOTAL FAILS: ${failCount} / ${results.length}`);
}

runTests();
