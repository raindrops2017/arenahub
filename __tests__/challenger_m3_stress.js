/**
 * Challenger M3 Empirical Stress Test Suite
 * Tests dateSlotGenerator, useBookingFlow state transitions, date format resilience,
 * socket multi-hour lockouts, payment splitting, and UI summary logic.
 */

const assert = require('assert');

// 1. Pure functions matching dateSlotGenerator.ts
function formatHour(hour24) {
  const normalized = ((hour24 % 24) + 24) % 24;
  const period = normalized >= 12 && normalized < 24 ? "PM" : "AM";
  const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
  const pad = displayHour < 10 ? `0${displayHour}` : `${displayHour}`;
  return `${pad}:00 ${period}`;
}

function calculateSlotPrice(venue, startHour24) {
  if (venue.customHourPrices && Array.isArray(venue.customHourPrices)) {
    const custom = venue.customHourPrices.find((c) => c.hour === startHour24);
    if (custom && custom.pricePerHour > 0) {
      return custom.pricePerHour;
    }
  }
  return venue.defaultHourPrice || 200;
}

function normalizeDateString(dateInput) {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSlotLockedAcrossIntervals(slotHour, bookedIntervals) {
  return bookedIntervals.some((booking) => {
    const end = booking.endTime && booking.endTime > booking.startTime ? booking.endTime : booking.startTime + 1;
    return slotHour >= booking.startTime && slotHour < end;
  });
}

function calculateGroupBookingCost(slots, venue) {
  if (!Array.isArray(slots) || slots.length === 0) {
    throw new Error('Slots array must contain at least 1 slot');
  }

  let totalCost = 0;
  for (const slot of slots) {
    if (typeof slot.startTime !== 'number' || typeof slot.endTime !== 'number') {
      throw new Error('Invalid slot time format');
    }
    if (slot.startTime >= slot.endTime) {
      throw new Error(`Invalid slot interval: startTime (${slot.startTime}) must be < endTime (${slot.endTime})`);
    }

    let slotPrice = 0;
    for (let hour = slot.startTime; hour < slot.endTime; hour++) {
      const customPrice = venue.customHourPrices?.find((p) => p.hour === hour);
      if (customPrice && typeof customPrice.pricePerHour === 'number' && customPrice.pricePerHour > 0) {
        slotPrice += customPrice.pricePerHour;
      } else {
        slotPrice += venue.defaultHourPrice || 200;
      }
    }
    totalCost += slotPrice;
  }

  return totalCost;
}

function computePaymentSplit({
  walletBalance = 0,
  totalCost = 0,
  minimumDepositAmount = 0,
  slotsCount = 1,
}) {
  const depositConfigured = typeof minimumDepositAmount === 'number' && minimumDepositAmount > 0;
  const totalDepositRequired = depositConfigured ? slotsCount * minimumDepositAmount : totalCost;
  const targetPaymentAmount = Math.min(totalDepositRequired, totalCost);

  const safeWalletBalance = Math.max(0, Number(walletBalance) || 0);
  const walletDeduction = Math.min(safeWalletBalance, targetPaymentAmount);
  const paymobRemainder = Math.max(0, targetPaymentAmount - walletDeduction);
  const paymobRequired = paymobRemainder > 0;
  const remainingAtVenue = Math.max(0, totalCost - targetPaymentAmount);

  let paymentStatus = 'unpaid';
  if (paymobRemainder === 0) {
    paymentStatus = depositConfigured && targetPaymentAmount < totalCost ? 'partially_paid' : 'paid';
  } else {
    paymentStatus = depositConfigured ? 'partially_paid' : 'unpaid';
  }

  return {
    totalCost,
    targetPaymentAmount,
    walletDeduction: Number(walletDeduction.toFixed(2)),
    paymobRemainder: Number(paymobRemainder.toFixed(2)),
    paymobRequired,
    remainingAtVenue: Number(remainingAtVenue.toFixed(2)),
    paymentStatus,
    isDepositPayment: depositConfigured && targetPaymentAmount < totalCost,
  };
}

// 2. Simulated useBookingFlow state harness
class BookingFlowHarness {
  constructor(venue) {
    this.venue = venue;
    this.selectedDateIndex = 0;
    this.selectedSlots = [];
    this.walletBalance = 0;
    this.lockedSlots = {};
  }

  handleToggleSlot(slot) {
    const exists = this.selectedSlots.some(
      (s) => s.id === slot.id || (s.startHour24 === slot.startHour24 && s.endHour24 === slot.endHour24)
    );
    if (exists) {
      this.selectedSlots = this.selectedSlots.filter(
        (s) => !(s.id === slot.id || (s.startHour24 === slot.startHour24 && s.endHour24 === slot.endHour24))
      );
    } else {
      this.selectedSlots = [...this.selectedSlots, slot].sort((a, b) => a.startHour24 - b.startHour24);
    }
  }

  handleClearSlots() {
    this.selectedSlots = [];
  }

  handleSelectDate(index) {
    this.selectedDateIndex = index;
    this.selectedSlots = []; // Clear slots when date changes
  }

  applyInitialAvailability(unavailableList) {
    const initialLocks = {};
    unavailableList.forEach((b) => {
      const d = normalizeDateString(b.date);
      const startH = Number(b.startTime);
      const endH = Number(b.endTime && b.endTime > startH ? b.endTime : startH + 1);
      for (let h = startH; h < endH; h++) {
        initialLocks[`${d}_${h}`] = true;
      }
    });
    this.lockedSlots = { ...this.lockedSlots, ...initialLocks };
  }

  onSlotLocked(data) {
    const d = normalizeDateString(data.date);
    const startH = Number(data.startTime);
    const endH = Number(data.endTime && data.endTime > startH ? data.endTime : startH + 1);
    const newLocks = {};
    for (let h = startH; h < endH; h++) {
      newLocks[`${d}_${h}`] = true;
    }
    this.lockedSlots = { ...this.lockedSlots, ...newLocks };
  }

  onSlotReleased(data) {
    const d = normalizeDateString(data.date);
    const startH = Number(data.startTime);
    const endH = Number(data.endTime && data.endTime > startH ? data.endTime : startH + 1);
    const updated = { ...this.lockedSlots };
    for (let h = startH; h < endH; h++) {
      delete updated[`${d}_${h}`];
    }
    this.lockedSlots = updated;
  }

  get totalCost() {
    return this.selectedSlots.reduce(
      (sum, s) => sum + (s.price ?? this.venue.defaultHourPrice ?? 200),
      0
    );
  }

  get paymentSplit() {
    return computePaymentSplit({
      walletBalance: this.walletBalance,
      totalCost: this.totalCost,
      minimumDepositAmount: this.venue.minimumDepositAmount ?? 0,
      slotsCount: this.selectedSlots.length || 1,
    });
  }
}

// 3. Test Runner
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('=== RUNNING CHALLENGER M3 EMPIRICAL STRESS TESTS ===\n');

console.log('[SECTION 1: Date Format Resilience & Normalization]');

test('normalizeDateString parses YYYY-MM-DD string exactly', () => {
  assert.strictEqual(normalizeDateString('2026-08-25'), '2026-08-25');
  assert.strictEqual(normalizeDateString('2025-12-31'), '2025-12-31');
  assert.strictEqual(normalizeDateString('2027-01-01'), '2027-01-01');
});

test('normalizeDateString parses ISO string with UTC time (Z suffix)', () => {
  assert.strictEqual(normalizeDateString('2026-08-25T00:00:00.000Z'), '2026-08-25');
  assert.strictEqual(normalizeDateString('2026-08-25T15:30:45.123Z'), '2026-08-25');
  assert.strictEqual(normalizeDateString('2026-08-25T23:59:59.999Z'), '2026-08-25');
});

test('normalizeDateString parses ISO string with positive/negative timezone offsets', () => {
  assert.strictEqual(normalizeDateString('2026-08-25T10:00:00+03:00'), '2026-08-25');
  assert.strictEqual(normalizeDateString('2026-08-25T22:00:00-05:00'), '2026-08-25');
});

test('normalizeDateString handles Date object instances (UTC projection)', () => {
  const d = new Date(Date.UTC(2026, 7, 25, 14, 0, 0));
  assert.strictEqual(normalizeDateString(d), '2026-08-25');
});

test('normalizeDateString handles null, undefined, and malformed inputs gracefully', () => {
  assert.strictEqual(normalizeDateString(null), '');
  assert.strictEqual(normalizeDateString(undefined), '');
  assert.strictEqual(normalizeDateString(''), '');
  assert.strictEqual(normalizeDateString('not-a-date'), '');
});

console.log('\n[SECTION 2: Slot Price & Group Cost Calculation]');

const mockVenue = {
  _id: 'venue_123',
  venueName: 'Arena Stars',
  defaultHourPrice: 200,
  minimumDepositAmount: 50,
  customHourPrices: [
    { hour: 18, pricePerHour: 250 },
    { hour: 19, pricePerHour: 300 },
    { hour: 20, pricePerHour: 300 },
  ],
};

test('calculateSlotPrice uses custom hour rate when configured, falls back to default', () => {
  assert.strictEqual(calculateSlotPrice(mockVenue, 10), 200);
  assert.strictEqual(calculateSlotPrice(mockVenue, 18), 250);
  assert.strictEqual(calculateSlotPrice(mockVenue, 19), 300);
  assert.strictEqual(calculateSlotPrice(mockVenue, 21), 200);
});

test('calculateGroupBookingCost sums discrete multi-hour non-continuous intervals', () => {
  const slots = [
    { startTime: 10, endTime: 11 }, // 200
    { startTime: 18, endTime: 20 }, // 18:250 + 19:300 = 550
  ];
  const cost = calculateGroupBookingCost(slots, mockVenue);
  assert.strictEqual(cost, 750);
});

test('calculateGroupBookingCost rejects invalid slot intervals', () => {
  assert.throws(() => calculateGroupBookingCost([], mockVenue), /at least 1 slot/);
  assert.throws(() => calculateGroupBookingCost([{ startTime: 12, endTime: 12 }], mockVenue), /must be < endTime/);
  assert.throws(() => calculateGroupBookingCost([{ startTime: 15, endTime: 14 }], mockVenue), /must be < endTime/);
});

console.log('\n[SECTION 3: Interval Lockout and Socket Handler Stress]');

test('isSlotLockedAcrossIntervals correctly locks half-open interval [start, end)', () => {
  const intervals = [
    { startTime: 14, endTime: 17 }, // Locks 14, 15, 16. NOT 17
    { startTime: 20, endTime: 21 }, // Locks 20. NOT 21
  ];

  assert.strictEqual(isSlotLockedAcrossIntervals(13, intervals), false);
  assert.strictEqual(isSlotLockedAcrossIntervals(14, intervals), true);
  assert.strictEqual(isSlotLockedAcrossIntervals(15, intervals), true);
  assert.strictEqual(isSlotLockedAcrossIntervals(16, intervals), true);
  assert.strictEqual(isSlotLockedAcrossIntervals(17, intervals), false);
  assert.strictEqual(isSlotLockedAcrossIntervals(18, intervals), false);
  assert.strictEqual(isSlotLockedAcrossIntervals(20, intervals), true);
  assert.strictEqual(isSlotLockedAcrossIntervals(21, intervals), false);
});

test('BookingFlowHarness correctly expands multi-hour lockouts from initial availability and socket events', () => {
  const flow = new BookingFlowHarness(mockVenue);

  // 1. Initial availability fetch: multi-hour booking 14:00 - 17:00 on 2026-08-25
  flow.applyInitialAvailability([
    { date: '2026-08-25T00:00:00.000Z', startTime: 14, endTime: 17 },
  ]);

  assert.strictEqual(flow.lockedSlots['2026-08-25_14'], true);
  assert.strictEqual(flow.lockedSlots['2026-08-25_15'], true);
  assert.strictEqual(flow.lockedSlots['2026-08-25_16'], true);
  assert.strictEqual(flow.lockedSlots['2026-08-25_17'], undefined);

  // 2. Real-time socket lock on 2026-08-25 for slots 20:00 - 22:00
  flow.onSlotLocked({
    venueId: 'venue_123',
    date: '2026-08-25',
    startTime: 20,
    endTime: 22,
  });

  assert.strictEqual(flow.lockedSlots['2026-08-25_20'], true);
  assert.strictEqual(flow.lockedSlots['2026-08-25_21'], true);
  assert.strictEqual(flow.lockedSlots['2026-08-25_22'], undefined);

  // 3. Socket release for 2026-08-25 slots 20:00 - 22:00
  flow.onSlotReleased({
    venueId: 'venue_123',
    date: '2026-08-25',
    startTime: 20,
    endTime: 22,
  });

  assert.strictEqual(flow.lockedSlots['2026-08-25_20'], undefined);
  assert.strictEqual(flow.lockedSlots['2026-08-25_21'], undefined);
  // Earlier locks must still remain intact!
  assert.strictEqual(flow.lockedSlots['2026-08-25_14'], true);
});

console.log('\n[SECTION 4: Multi-Slot Selection, Deselection, Date Switch & Clear]');

test('BookingFlowHarness slot selection, sorting, toggling, and clearing', () => {
  const flow = new BookingFlowHarness(mockVenue);

  const slot1 = { id: 's1', startHour24: 18, endHour24: 19, price: 250, time: '06:00 PM - 07:00 PM' };
  const slot2 = { id: 's2', startHour24: 10, endHour24: 11, price: 200, time: '10:00 AM - 11:00 AM' };
  const slot3 = { id: 's3', startHour24: 21, endHour24: 22, price: 200, time: '09:00 PM - 10:00 PM' };

  // Select slot1
  flow.handleToggleSlot(slot1);
  assert.strictEqual(flow.selectedSlots.length, 1);
  assert.strictEqual(flow.totalCost, 250);

  // Select slot2 (earlier hour) -> should be sorted first
  flow.handleToggleSlot(slot2);
  assert.strictEqual(flow.selectedSlots.length, 2);
  assert.strictEqual(flow.selectedSlots[0].id, 's2');
  assert.strictEqual(flow.selectedSlots[1].id, 's1');
  assert.strictEqual(flow.totalCost, 450);

  // Select slot3
  flow.handleToggleSlot(slot3);
  assert.strictEqual(flow.selectedSlots.length, 3);
  assert.strictEqual(flow.totalCost, 650);

  // Deselect slot1 by toggling it again
  flow.handleToggleSlot(slot1);
  assert.strictEqual(flow.selectedSlots.length, 2);
  assert.strictEqual(flow.selectedSlots[0].id, 's2');
  assert.strictEqual(flow.selectedSlots[1].id, 's3');
  assert.strictEqual(flow.totalCost, 400);

  // Clear slots
  flow.handleClearSlots();
  assert.strictEqual(flow.selectedSlots.length, 0);
  assert.strictEqual(flow.totalCost, 0);

  // Select slot again, then switch date -> verify slots are cleared
  flow.handleToggleSlot(slot2);
  assert.strictEqual(flow.selectedSlots.length, 1);
  flow.handleSelectDate(2);
  assert.strictEqual(flow.selectedDateIndex, 2);
  assert.strictEqual(flow.selectedSlots.length, 0, 'Slots must be cleared on date change');
});

console.log('\n[SECTION 5: Financial Split & Deposit Auto-Deduction Invariants]');

test('Scenario A: Full wallet coverage (No deposit config)', () => {
  const split = computePaymentSplit({
    walletBalance: 500,
    totalCost: 400,
    minimumDepositAmount: 0,
    slotsCount: 2,
  });

  assert.strictEqual(split.totalCost, 400);
  assert.strictEqual(split.targetPaymentAmount, 400);
  assert.strictEqual(split.walletDeduction, 400);
  assert.strictEqual(split.paymobRemainder, 0);
  assert.strictEqual(split.paymobRequired, false);
  assert.strictEqual(split.remainingAtVenue, 0);
  assert.strictEqual(split.paymentStatus, 'paid');
  assert.strictEqual(split.isDepositPayment, false);
});

test('Scenario B: Partial wallet coverage with deposit configured for 3 slots', () => {
  // Venue deposit = 50/slot * 3 slots = 150 required deposit
  // Total cost = 600
  // Wallet balance = 50
  const split = computePaymentSplit({
    walletBalance: 50,
    totalCost: 600,
    minimumDepositAmount: 50,
    slotsCount: 3,
  });

  assert.strictEqual(split.totalCost, 600);
  assert.strictEqual(split.targetPaymentAmount, 150);
  assert.strictEqual(split.walletDeduction, 50);
  assert.strictEqual(split.paymobRemainder, 100);
  assert.strictEqual(split.paymobRequired, true);
  assert.strictEqual(split.remainingAtVenue, 450);
  assert.strictEqual(split.paymentStatus, 'partially_paid');
  assert.strictEqual(split.isDepositPayment, true);
});

test('Scenario C: Wallet fully covers deposit requirement, remainder due at venue', () => {
  // Venue deposit = 50/slot * 2 slots = 100 required deposit
  // Total cost = 400
  // Wallet balance = 150
  const split = computePaymentSplit({
    walletBalance: 150,
    totalCost: 400,
    minimumDepositAmount: 50,
    slotsCount: 2,
  });

  assert.strictEqual(split.totalCost, 400);
  assert.strictEqual(split.targetPaymentAmount, 100);
  assert.strictEqual(split.walletDeduction, 100); // Deducts only required deposit amount!
  assert.strictEqual(split.paymobRemainder, 0);
  assert.strictEqual(split.paymobRequired, false);
  assert.strictEqual(split.remainingAtVenue, 300);
  assert.strictEqual(split.paymentStatus, 'partially_paid');
  assert.strictEqual(split.isDepositPayment, true);
});

test('Scenario D: Zero wallet balance with Paymob full amount (No deposit config)', () => {
  const split = computePaymentSplit({
    walletBalance: 0,
    totalCost: 400,
    minimumDepositAmount: 0,
    slotsCount: 2,
  });

  assert.strictEqual(split.totalCost, 400);
  assert.strictEqual(split.targetPaymentAmount, 400);
  assert.strictEqual(split.walletDeduction, 0);
  assert.strictEqual(split.paymobRemainder, 400);
  assert.strictEqual(split.paymobRequired, true);
  assert.strictEqual(split.remainingAtVenue, 0);
  assert.strictEqual(split.paymentStatus, 'unpaid');
  assert.strictEqual(split.isDepositPayment, false);
});

console.log(`\n=== TEST RESULTS: ${passed} passed, ${failed} failed ===`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL ADVERSARIAL EMPIRICAL TESTS PASSED SUCCESSFULLY.\n');
}
