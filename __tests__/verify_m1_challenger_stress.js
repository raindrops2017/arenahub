// __tests__/verify_m1_challenger_stress.js
// EMPIRICAL CHALLENGER STRESS HARNESS FOR MILESTONE 1 ITERATION 2

class MockAsyncStorage {
  constructor() {
    this.store = {};
  }
  async getItem(key) {
    return this.store[key] || null;
  }
  async setItem(key, value) {
    this.store[key] = String(value);
  }
  async removeItem(key) {
    delete this.store[key];
  }
  async clear() {
    this.store = {};
  }
}

const mockAsyncStorage = new MockAsyncStorage();

import module from 'module';
const originalRequire = module.prototype.require;

module.prototype.require = function (request) {
  if (request === '@react-native-async-storage/async-storage') {
    return mockAsyncStorage;
  }
  return originalRequire.apply(this, arguments);
};

import {
  initMockStore,
  getCustomers,
  getWallets,
  getBookings,
  cancelBooking,
  processAdminCashPayout,
  updateCustomer,
  getReportsData,
  addBooking
} from '../dashboard/src/data/mockStore';

import {
  getCustomersAsync,
  getWalletsAsync,
  getBookingsAsync,
  cancelBookingAsync,
  saveCustomerAsync,
  createBookingAsync
} from '../services/storageService';


const results = [];

function assert(condition, name, details) {
  results.push({ test: name, pass: Boolean(condition), details });
  if (!condition) {
    console.error(`❌ FAIL: ${name} - ${details}`);
  } else {
    console.log(`✅ PASS: ${name} - ${details}`);
  }
}

async function runChallengerStressTests() {
  console.log('\n=== RUNNING EMPIRICAL CHALLENGER STRESS SUITE (M1 R2) ===\n');

  // -------------------------------------------------------------
  // SECTION 1: DOUBLE-REFUND STRESS TESTS
  // -------------------------------------------------------------
  initMockStore();
  let custs = getCustomers();
  let cust1 = custs.find(c => c.id === 'cust-1');
  const initialBal = cust1.walletBalance; // 1500

  // Create a new booking with wallet
  const newBook = addBooking({
    customerId: 'cust-1',
    customerName: cust1.name,
    venueId: 'v-1',
    venueName: 'Arena Central',
    date: '2026-08-10',
    startTime: '10:00',
    endTime: '11:00',
    price: 300,
    paymentMethod: 'Wallet Balance',
    status: 'Confirmed'
  });

  let afterBookCust = getCustomers().find(c => c.id === 'cust-1');
  assert(afterBookCust.walletBalance === initialBal - 300, 'S1.1: Wallet Debit on Booking', `Balance after 300 EGP debit: ${afterBookCust.walletBalance} (expected ${initialBal - 300})`);

  // First cancellation (FULL refund)
  cancelBooking(newBook.id, 'FULL', 'Customer change of plan');
  let afterCancel1 = getCustomers().find(c => c.id === 'cust-1');
  assert(afterCancel1.walletBalance === initialBal, 'S1.2: First Full Cancellation Refund', `Balance restored to: ${afterCancel1.walletBalance} (expected ${initialBal})`);

  // Second cancellation attempt on already cancelled booking
  let secondCancelThrew = false;
  try {
    cancelBooking(newBook.id, 'FULL', 'Malicious double refund attempt');
  } catch (err) {
    secondCancelThrew = err.message.includes('already cancelled');
  }
  let afterCancel2 = getCustomers().find(c => c.id === 'cust-1');
  assert(
    secondCancelThrew && afterCancel2.walletBalance === initialBal,
    'S1.3: Double Refund Guard (Web mockStore)',
    `Second cancel threw error: ${secondCancelThrew}, Balance remained: ${afterCancel2.walletBalance}`
  );

  // Partial refund cancellation test
  const partialBook = addBooking({
    customerId: 'cust-1',
    customerName: cust1.name,
    venueId: 'v-1',
    venueName: 'Arena Central',
    date: '2026-08-11',
    startTime: '14:00',
    endTime: '15:00',
    price: 400,
    paymentMethod: 'Wallet Balance',
    status: 'Confirmed'
  });

  // Cancel partial refund (200 EGP)
  cancelBooking(partialBook.id, 'PARTIAL', 'Partial cancel', 200);
  let afterPartialCancel = getCustomers().find(c => c.id === 'cust-1');
  const expectedPartialBal = initialBal - 400 + 200; // 1300
  assert(afterPartialCancel.walletBalance === expectedPartialBal, 'S1.4: Partial Refund Credit', `Balance after partial refund: ${afterPartialCancel.walletBalance} (expected ${expectedPartialBal})`);

  // Try double-cancelling partial booking
  let partialDoubleThrew = false;
  try {
    cancelBooking(partialBook.id, 'FULL', 'Double refund on partial cancel');
  } catch (err) {
    partialDoubleThrew = err.message.includes('already cancelled');
  }
  let afterPartialDouble = getCustomers().find(c => c.id === 'cust-1');
  assert(
    partialDoubleThrew && afterPartialDouble.walletBalance === expectedPartialBal,
    'S1.5: Double Refund Guard on Partial Cancel',
    `Second cancel on partial threw: ${partialDoubleThrew}, Balance remained: ${afterPartialDouble.walletBalance}`
  );

  // -------------------------------------------------------------
  // SECTION 2: NET REVENUE & FINANCIAL REPORTS STRESS TESTS
  // -------------------------------------------------------------
  initMockStore();
  const reports = getReportsData();
  const calculatedNet = reports.grossRevenue - reports.totalRefunds;
  assert(
    reports.netRevenue === calculatedNet,
    'S2.1: Net Revenue Formula Parity',
    `Gross: ${reports.grossRevenue}, Refunds: ${reports.totalRefunds}, Net: ${reports.netRevenue}, Calculated: ${calculatedNet}`
  );

  const dailyNetSum = reports.dailyRevenue.reduce((acc, cur) => acc + cur.net, 0);
  assert(
    dailyNetSum === reports.netRevenue,
    'S2.2: Daily Net Sum Parity with Total Net Revenue',
    `Sum of daily net: ${dailyNetSum}, Total reported net: ${reports.netRevenue}`
  );

  // -------------------------------------------------------------
  // SECTION 3: NEGATIVE & INVALID CASH PAYOUT STRESS TESTS
  // -------------------------------------------------------------
  initMockStore();
  const custBeforePayout = getCustomers().find(c => c.id === 'cust-1');
  const balBeforePayout = custBeforePayout.walletBalance;

  let negPayoutThrew = false;
  try {
    processAdminCashPayout('cust-1', -500, 'Negative payout attack');
  } catch (err) {
    negPayoutThrew = err.message.includes('greater than zero');
  }

  let zeroPayoutThrew = false;
  try {
    processAdminCashPayout('cust-1', 0, 'Zero payout attack');
  } catch (err) {
    zeroPayoutThrew = err.message.includes('greater than zero');
  }

  const custAfterInvalidPayouts = getCustomers().find(c => c.id === 'cust-1');
  assert(
    negPayoutThrew && zeroPayoutThrew && custAfterInvalidPayouts.walletBalance === balBeforePayout,
    'S3.1: Non-Positive Payout Rejection',
    `Negative threw: ${negPayoutThrew}, Zero threw: ${zeroPayoutThrew}, Balance unchanged: ${custAfterInvalidPayouts.walletBalance === balBeforePayout}`
  );

  // -------------------------------------------------------------
  // SECTION 4: CUSTOMER <-> WALLET STORE SYNCHRONIZATION STRESS TESTS
  // -------------------------------------------------------------
  initMockStore();

  // Test 4.1: Direct updateCustomer balance sync
  updateCustomer('cust-1', { walletBalance: 8888 });
  let syncedWalletsWeb = getWallets();
  let cust1WalletWeb = syncedWalletsWeb.find(w => w.customerId === 'cust-1');
  let cust1CustWeb = getCustomers().find(c => c.id === 'cust-1');

  assert(
    cust1CustWeb.walletBalance === 8888 && cust1WalletWeb.balance === 8888,
    'S4.1: Web updateCustomer Store Sync',
    `Customer walletBalance: ${cust1CustWeb.walletBalance}, Wallet entity balance: ${cust1WalletWeb.balance}`
  );

  // Test 4.2: Mobile saveCustomerAsync balance sync
  await mockAsyncStorage.clear();
  let mobileCusts = await getCustomersAsync();
  let mobileCust1 = mobileCusts.find(c => c.id === 'cust-1');
  mobileCust1.walletBalance = 7777;
  await saveCustomerAsync(mobileCust1);

  let mobileWallets = await getWalletsAsync();
  let mobileCust1Wallet = mobileWallets.find(w => w.customerId === 'cust-1');
  let reloadedMobileCust1 = (await getCustomersAsync()).find(c => c.id === 'cust-1');

  assert(
    reloadedMobileCust1.walletBalance === 7777 && mobileCust1Wallet.balance === 7777,
    'S4.2: Mobile saveCustomerAsync Store Sync',
    `Mobile Customer walletBalance: ${reloadedMobileCust1.walletBalance}, Wallet entity balance: ${mobileCust1Wallet.balance}`
  );

  // Test 4.3: Mobile cancelBookingAsync double cancel and wallet sync
  await mockAsyncStorage.clear();
  let initialMobileCust = (await getCustomersAsync()).find(c => c.id === 'cust-1');
  const startBalMobile = initialMobileCust.walletBalance; // 7777

  const mobileBooking = await createBookingAsync({
    customerId: 'cust-1',
    venueId: 'v-1',
    venueName: 'Arena Central',
    date: '2026-08-12',
    startTime: '18:00',
    endTime: '19:00',
    price: 250,
    paymentMethod: 'Wallet Balance'
  });

  let postBookCust = (await getCustomersAsync()).find(c => c.id === 'cust-1');
  assert(postBookCust.walletBalance === startBalMobile - 250, 'S4.3: Mobile Wallet Debit on Booking', `Balance after debit: ${postBookCust.walletBalance}`);

  await cancelBookingAsync(mobileBooking.id, 'Mobile cancellation test');
  let postCancelCust = (await getCustomersAsync()).find(c => c.id === 'cust-1');
  let postCancelWallet = (await getWalletsAsync()).find(w => w.customerId === 'cust-1');

  assert(
    postCancelCust.walletBalance === startBalMobile && postCancelWallet.balance === startBalMobile,
    'S4.4: Mobile Cancel Refund & Sync',
    `Customer balance: ${postCancelCust.walletBalance}, Wallet balance: ${postCancelWallet.balance}`
  );

  let mobileDoubleCancelThrew = false;
  try {
    await cancelBookingAsync(mobileBooking.id, 'Second mobile cancel');
  } catch (err) {
    mobileDoubleCancelThrew = err.message.includes('already cancelled');
  }

  let finalMobileCust = (await getCustomersAsync()).find(c => c.id === 'cust-1');
  assert(
    mobileDoubleCancelThrew && finalMobileCust.walletBalance === startBalMobile,
    'S4.5: Mobile Double Refund Guard',
    `Second cancel threw: ${mobileDoubleCancelThrew}, Final balance: ${finalMobileCust.walletBalance}`
  );

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  const failedTests = results.filter(r => !r.pass);
  console.log('\n=== EMPIRICAL CHALLENGER STRESS SUITE SUMMARY ===');
  console.log(`TOTAL TESTS: ${results.length}`);
  console.log(`PASSED: ${results.length - failedTests.length}`);
  console.log(`FAILED: ${failedTests.length}\n`);

  if (failedTests.length > 0) {
    process.exit(1);
  }
}

runChallengerStressTests().catch(err => {
  console.error('Fatal stress test runner error:', err);
  process.exit(1);
});
