// Empirical Test Harness for storageService.ts (Mobile App) Invariants

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

// Mock react-native-async-storage module in node
import module from 'module';
const originalRequire = module.prototype.require;

module.prototype.require = function (request) {
  if (request === '@react-native-async-storage/async-storage') {
    return mockAsyncStorage;
  }
  return originalRequire.apply(this, arguments);
};

global.window = undefined; // Simulate native React Native environment without window.localStorage

async function runMobileTests() {
  console.log('=== STARTING EMPIRICAL VERIFICATION OF STORAGE SERVICE (MOBILE) INVARIANTS ===\n');

  let storageService;
  try {
    storageService = await import('../services/storageService.ts');
  } catch (err) {
    console.error('Failed to import storageService:', err);
    process.exit(1);
  }

  const results = [];

  // TEST M1: Mobile Double-Refund Vulnerability on Cancellation (cancelBookingAsync)
  try {
    await mockAsyncStorage.clear();
    const cust1 = (await storageService.getCustomersAsync()).find(c => c.id === 'cust-1');
    const initialBal = cust1.walletBalance; // 1500

    // Create booking via storageService
    const newBook = await storageService.createBookingAsync({
      venueId: 'arena-1',
      venueName: 'ARENA 1',
      date: '2026-08-15',
      startTime: '07:00 PM',
      endTime: '08:00 PM',
      price: 280,
      paymentMethod: 'Wallet Balance'
    });

    const custAfterBook = (await storageService.getCustomersAsync()).find(c => c.id === 'cust-1');
    const balAfterBook = custAfterBook.walletBalance; // 1220

    // 1st Mobile Cancel
    await storageService.cancelBookingAsync(newBook.id, 'Mobile cancel 1');
    const custAfterCancel1 = (await storageService.getCustomersAsync()).find(c => c.id === 'cust-1');
    const balAfterCancel1 = custAfterCancel1.walletBalance; // 1500

    // 2nd Mobile Cancel on same booking!
    let secondCancelThrew = false;
    try {
      await storageService.cancelBookingAsync(newBook.id, 'Mobile cancel 2 - duplicate');
    } catch (err) {
      secondCancelThrew = true;
    }

    const custAfterCancel2 = (await storageService.getCustomersAsync()).find(c => c.id === 'cust-1');
    const balAfterCancel2 = custAfterCancel2.walletBalance;

    const hasDoubleRefundBug = !secondCancelThrew && balAfterCancel2 === 1780; // 1500 + 280 duplicate refund!

    results.push({
      test: 'M1: Mobile Double-Refund Vulnerability on Cancel (storageService)',
      pass: !hasDoubleRefundBug,
      details: `Initial: ${initialBal}, After Booking: ${balAfterBook}, After 1st Cancel: ${balAfterCancel1}, After 2nd Cancel: ${balAfterCancel2}. Second cancel threw error: ${secondCancelThrew}. Double-refund bug present: ${hasDoubleRefundBug}`
    });
  } catch (e) {
    results.push({ test: 'M1: Mobile Double-Refund Vulnerability on Cancel (storageService)', pass: false, error: e.message });
  }

  // TEST M2: Mobile Suspended Customer Enforcement
  try {
    await mockAsyncStorage.clear();
    // Set active customer to cust-4 (Suspended)
    await storageService.setActiveCustomerAsync('cust-4');

    let bookingBlocked = false;
    try {
      await storageService.createBookingAsync({
        venueId: 'arena-1',
        venueName: 'ARENA 1',
        date: '2026-08-16',
        startTime: '08:00 PM',
        endTime: '09:00 PM',
        price: 200,
        paymentMethod: 'Cash'
      });
    } catch (err) {
      bookingBlocked = true;
    }

    results.push({
      test: 'M2: Mobile Suspended Customer Enforcement',
      pass: bookingBlocked,
      details: `Booking blocked for Suspended customer: ${bookingBlocked}`
    });
  } catch (e) {
    results.push({ test: 'M2: Mobile Suspended Customer Enforcement', pass: false, error: e.message });
  }

  console.log('=== MOBILE TEST RESULTS ===');
  console.table(results);

  const failCount = results.filter(r => !r.pass).length;
  console.log(`\nTOTAL MOBILE FAILS: ${failCount} / ${results.length}`);
}

runMobileTests();
