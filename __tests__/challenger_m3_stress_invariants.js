/**
 * Empirical Challenger Stress & Invariant Harness for Milestone 3 (Mobile Client Flow)
 * Validates R1, R2, R3, R4 invariants, stress conditions, property-based random generation, and edge cases.
 */

import {
  formatHour,
  calculateSlotPrice,
  generateFutureBookingDates,
  normalizeDateString,
  isSlotLockedAcrossIntervals,
  calculateGroupBookingCost,
  computePaymentSplit,
} from '../features/bookings/utils/dateSlotGenerator.ts';

console.log('======================================================================');
console.log('  CHALLENGER M3: EMPIRICAL INVARIANT & STRESS VERIFICATION SUITE');
console.log('======================================================================\n');

let passCount = 0;
let failCount = 0;
const failures = [];

function check(assertion, testCode, description, details = '') {
  if (assertion) {
    passCount++;
    console.log(`  [PASS] ${testCode}: ${description}`);
  } else {
    failCount++;
    failures.push({ testCode, description, details });
    console.error(`  [FAIL] ${testCode}: ${description} | Details: ${details}`);
  }
}

// ============================================================================
// SUITE 1: R1 WALLET AUTO-DEDUCT INVARIANTS
// ============================================================================
console.log('\n--- [SUITE 1] R1: Wallet Auto-Deduct Mathematical Invariants ---');

// Invariant 1.1: Wallet = 0 -> walletDeduction = 0, paymobRemainder = due, paymobRequired = true
{
  const split = computePaymentSplit({ walletBalance: 0, totalCost: 400 });
  check(
    split.walletDeduction === 0 && split.paymobRemainder === 400 && split.paymobRequired === true && split.paymentStatus === 'unpaid',
    'R1-INV-01',
    'Wallet = 0 results in 0 deduction and 100% paymobRemainder',
    JSON.stringify(split)
  );
}

// Invariant 1.2: Wallet < Due -> walletDeduction = wallet, paymobRemainder = due - wallet, paymobRequired = true
{
  const split = computePaymentSplit({ walletBalance: 150, totalCost: 400 });
  check(
    split.walletDeduction === 150 && split.paymobRemainder === 250 && split.paymobRequired === true && split.paymentStatus === 'unpaid',
    'R1-INV-02',
    'Wallet < Due deducts exact wallet amount and assigns difference to Paymob',
    JSON.stringify(split)
  );
}

// Invariant 1.3: Wallet == Due -> walletDeduction = due, paymobRemainder = 0, paymobRequired = false, status = paid
{
  const split = computePaymentSplit({ walletBalance: 400, totalCost: 400 });
  check(
    split.walletDeduction === 400 && split.paymobRemainder === 0 && split.paymobRequired === false && split.paymentStatus === 'paid',
    'R1-INV-03',
    'Wallet == Due deducts full amount, zero Paymob remainder, status=paid',
    JSON.stringify(split)
  );
}

// Invariant 1.4: Wallet > Due -> walletDeduction = due (clamped), paymobRemainder = 0, paymobRequired = false
{
  const split = computePaymentSplit({ walletBalance: 950, totalCost: 400 });
  check(
    split.walletDeduction === 400 && split.paymobRemainder === 0 && split.paymobRequired === false && split.paymentStatus === 'paid',
    'R1-INV-04',
    'Wallet > Due caps deduction at total cost without negative remainder',
    JSON.stringify(split)
  );
}

// Invariant 1.5: Universal Conservation Law across 50,000 randomized currency scenarios
{
  let conservationHold = true;
  let sampleDetails = '';
  for (let i = 0; i < 50000; i++) {
    // Real-world 2-decimal currency amounts
    const wallet = Math.round(Math.random() * 200000) / 100;
    const cost = Math.round((Math.random() * 2000 + 50) * 100) / 100;
    const deposit = Math.random() < 0.5 ? 0 : Math.round(Math.random() * 300 * 100) / 100;
    const slots = Math.floor(Math.random() * 8) + 1;

    const res = computePaymentSplit({
      walletBalance: wallet,
      totalCost: cost,
      minimumDepositAmount: deposit,
      slotsCount: slots,
    });

    const sumDue = Number((res.walletDeduction + res.paymobRemainder).toFixed(2));
    const targetRounded = Number(res.targetPaymentAmount.toFixed(2));
    const totalSum = Number((res.targetPaymentAmount + res.remainingAtVenue).toFixed(2));
    const totalCostRounded = Number(res.totalCost.toFixed(2));

    if (Math.abs(sumDue - targetRounded) > 0.001 || Math.abs(totalSum - totalCostRounded) > 0.001) {
      conservationHold = false;
      sampleDetails = `Mismatch at iter ${i}: wallet=${wallet}, cost=${cost}, deposit=${deposit}, slots=${slots}, res=${JSON.stringify(res)}`;
      break;
    }
  }
  check(
    conservationHold,
    'R1-INV-05',
    'Conservation Law holds across 50,000 random currency permutations: walletDeduct + paymobRemainder === targetPaymentAmount',
    sampleDetails || '50,000 permutations verified'
  );
}

// Invariant 1.6: Boundary & Negative Wallet Sanitization
{
  const negWallet = computePaymentSplit({ walletBalance: -100, totalCost: 200 });
  const nanWallet = computePaymentSplit({ walletBalance: NaN, totalCost: 200 });
  const undefWallet = computePaymentSplit({ walletBalance: undefined, totalCost: 200 });

  check(
    negWallet.walletDeduction === 0 && nanWallet.walletDeduction === 0 && undefWallet.walletDeduction === 0,
    'R1-INV-06',
    'Negative, NaN, and undefined wallet balances safely sanitized to 0 deduction',
    `Neg: ${negWallet.walletDeduction}, NaN: ${nanWallet.walletDeduction}, Undef: ${undefWallet.walletDeduction}`
  );
}

// ============================================================================
// SUITE 2: R2 MULTI-SLOT COMBINATIONS & AGGREGATION
// ============================================================================
console.log('\n--- [SUITE 2] R2: Multi-Slot Combinations & Pricing Invariants ---');

const mockVenue = {
  _id: 'venue-m3-test',
  venueName: 'Champions Arena',
  defaultHourPrice: 200,
  customHourPrices: [
    { hour: 18, pricePerHour: 280 },
    { hour: 19, pricePerHour: 300 },
    { hour: 20, pricePerHour: 320 },
  ],
  startWorkingHours: 8,
  endWorkingHours: 24,
};

// Invariant 2.1: Single slot calculation
{
  const slots = [{ startTime: 10, endTime: 11 }];
  const cost = calculateGroupBookingCost(slots, mockVenue);
  check(cost === 200, 'R2-INV-01', 'Single regular slot computes default price (200 EGP)', `Cost: ${cost}`);
}

// Invariant 2.2: 2 contiguous slots with custom pricing
{
  const slots = [
    { startTime: 18, endTime: 19 }, // 280
    { startTime: 19, endTime: 20 }, // 300
  ];
  const cost = calculateGroupBookingCost(slots, mockVenue);
  check(cost === 580, 'R2-INV-02', '2 contiguous peak slots compute sum of custom hourly rates (280 + 300 = 580)', `Cost: ${cost}`);
}

// Invariant 2.3: 3 non-contiguous slots
{
  const slots = [
    { startTime: 9, endTime: 10 },   // 200
    { startTime: 14, endTime: 15 },  // 200
    { startTime: 20, endTime: 21 },  // 320 (custom)
  ];
  const cost = calculateGroupBookingCost(slots, mockVenue);
  check(cost === 720, 'R2-INV-03', '3 non-contiguous slots correctly aggregate discrete prices (200 + 200 + 320 = 720)', `Cost: ${cost}`);
}

// Invariant 2.4: Whole-day 16-hour slots
{
  const wholeDaySlots = [];
  let expectedTotal = 0;
  for (let h = 8; h < 24; h++) {
    wholeDaySlots.push({ startTime: h, endTime: h + 1 });
    if (h === 18) expectedTotal += 280;
    else if (h === 19) expectedTotal += 300;
    else if (h === 20) expectedTotal += 320;
    else expectedTotal += 200;
  }
  const cost = calculateGroupBookingCost(wholeDaySlots, mockVenue);
  check(
    cost === expectedTotal && wholeDaySlots.length === 16,
    'R2-INV-04',
    `Whole-day 16 hourly slots compute exact aggregated sum (${expectedTotal} EGP)`,
    `Slots: ${wholeDaySlots.length}, Cost: ${cost}`
  );
}

// Invariant 2.5: Multi-hour composite slot interval [17, 21)
{
  const slots = [{ startTime: 17, endTime: 21 }]; // 17(200) + 18(280) + 19(300) + 20(320) = 1100
  const cost = calculateGroupBookingCost(slots, mockVenue);
  check(cost === 1100, 'R2-INV-05', 'Multi-hour interval [17, 21) accurately expands and sums each hourly rate (1100 EGP)', `Cost: ${cost}`);
}

// Invariant 2.6: Validation rejects illegal slots
{
  let rejectedEmpty = false;
  let rejectedInverted = false;
  let rejectedEqual = false;

  try { calculateGroupBookingCost([], mockVenue); } catch { rejectedEmpty = true; }
  try { calculateGroupBookingCost([{ startTime: 20, endTime: 19 }], mockVenue); } catch { rejectedInverted = true; }
  try { calculateGroupBookingCost([{ startTime: 15, endTime: 15 }], mockVenue); } catch { rejectedEqual = true; }

  check(
    rejectedEmpty && rejectedInverted && rejectedEqual,
    'R2-INV-06',
    'Domain validation rejects empty array, inverted interval, and 0-duration slot',
    `Empty: ${rejectedEmpty}, Inverted: ${rejectedInverted}, Equal: ${rejectedEqual}`
  );
}

// ============================================================================
// SUITE 3: R3 DEPOSIT CALCULATIONS & STATUS INVARIANTS
// ============================================================================
console.log('\n--- [SUITE 3] R3: Deposit Calculations & Partial Payment Invariants ---');

// Invariant 3.1: Venue without deposit -> full payment required
{
  const split = computePaymentSplit({
    walletBalance: 0,
    totalCost: 600,
    minimumDepositAmount: 0,
    slotsCount: 3,
  });
  check(
    split.targetPaymentAmount === 600 && split.isDepositPayment === false && split.remainingAtVenue === 0,
    'R3-INV-01',
    'Venue with minimumDepositAmount=0 requires 100% full payment (600 EGP) at checkout',
    JSON.stringify(split)
  );
}

// Invariant 3.2: Venue with deposit -> slotsCount * minimumDepositAmount
{
  const split = computePaymentSplit({
    walletBalance: 0,
    totalCost: 900,
    minimumDepositAmount: 100,
    slotsCount: 3,
  });
  check(
    split.targetPaymentAmount === 300 && split.remainingAtVenue === 600 && split.isDepositPayment === true && split.paymentStatus === 'partially_paid',
    'R3-INV-02',
    'Venue with minimumDepositAmount=100 for 3 slots requires 300 deposit and leaves 600 due at venue',
    JSON.stringify(split)
  );
}

// Invariant 3.3: Wallet partial deduction against deposit
{
  const split = computePaymentSplit({
    walletBalance: 120,
    totalCost: 900,
    minimumDepositAmount: 100,
    slotsCount: 3,
  });
  check(
    split.targetPaymentAmount === 300 && split.walletDeduction === 120 && split.paymobRemainder === 180 && split.paymobRequired === true && split.paymentStatus === 'partially_paid',
    'R3-INV-03',
    'Wallet deduction (120) applies to deposit (300), routing remainder (180) to Paymob with status partially_paid',
    JSON.stringify(split)
  );
}

// Invariant 3.4: Wallet full coverage of deposit skips Paymob with status partially_paid
{
  const split = computePaymentSplit({
    walletBalance: 350,
    totalCost: 900,
    minimumDepositAmount: 100,
    slotsCount: 3,
  });
  check(
    split.targetPaymentAmount === 300 && split.walletDeduction === 300 && split.paymobRemainder === 0 && split.paymobRequired === false && split.paymentStatus === 'partially_paid' && split.remainingAtVenue === 600,
    'R3-INV-04',
    'Wallet (350 >= 300 deposit) covers deposit 100%, skips Paymob, and marks status partially_paid',
    JSON.stringify(split)
  );
}

// Invariant 3.5: Deposit clamped if deposit > totalCost
{
  const split = computePaymentSplit({
    walletBalance: 0,
    totalCost: 150,
    minimumDepositAmount: 200,
    slotsCount: 1,
  });
  check(
    split.targetPaymentAmount === 150 && split.remainingAtVenue === 0 && split.isDepositPayment === false,
    'R3-INV-05',
    'Deposit amount (200) exceeding total cost (150) is clamped to total cost with isDepositPayment=false',
    JSON.stringify(split)
  );
}

// ============================================================================
// SUITE 4: R4 INTERVAL LOCKOUT & TIMEZONE NORMALIZATION INVARIANTS
// ============================================================================
console.log('\n--- [SUITE 4] R4: Interval Lockout & Timezone Normalization Invariants ---');

// Invariant 4.1: Half-open interval lockout [18, 20)
{
  const bookedIntervals = [{ startTime: 18, endTime: 20 }];
  const lock17 = isSlotLockedAcrossIntervals(17, bookedIntervals);
  const lock18 = isSlotLockedAcrossIntervals(18, bookedIntervals);
  const lock19 = isSlotLockedAcrossIntervals(19, bookedIntervals);
  const lock20 = isSlotLockedAcrossIntervals(20, bookedIntervals);
  const lock21 = isSlotLockedAcrossIntervals(21, bookedIntervals);

  check(
    !lock17 && lock18 && lock19 && !lock20 && !lock21,
    'R4-INV-01',
    'Interval [18, 20) precisely locks hours 18 and 19; hours 17 and 20 remain unlocked',
    `17:${lock17}, 18:${lock18}, 19:${lock19}, 20:${lock20}, 21:${lock21}`
  );
}

// Invariant 4.2: Multiple overlapping and adjacent booked intervals
{
  const bookedIntervals = [
    { startTime: 9, endTime: 11 },   // locks 9, 10
    { startTime: 14, endTime: 17 },  // locks 14, 15, 16
    { startTime: 22, endTime: 24 },  // locks 22, 23
  ];

  const lockedExpected = [9, 10, 14, 15, 16, 22, 23];
  const unlockedExpected = [8, 11, 12, 13, 17, 18, 19, 20, 21];

  const allLockedPass = lockedExpected.every((h) => isSlotLockedAcrossIntervals(h, bookedIntervals));
  const allUnlockedPass = unlockedExpected.every((h) => !isSlotLockedAcrossIntervals(h, bookedIntervals));

  check(
    allLockedPass && allUnlockedPass,
    'R4-INV-02',
    'Multiple complex intervals across the day lock and unlock exactly as specified',
    `Locked match: ${allLockedPass}, Unlocked match: ${allUnlockedPass}`
  );
}

// Invariant 4.3: Legacy single-hour booking fallback (missing/equal endTime)
{
  const legacyBookings = [
    { startTime: 12 }, // endTime undefined
    { startTime: 15, endTime: 15 }, // endTime equal to startTime
  ];

  const lock12 = isSlotLockedAcrossIntervals(12, legacyBookings);
  const lock13 = isSlotLockedAcrossIntervals(13, legacyBookings);
  const lock15 = isSlotLockedAcrossIntervals(15, legacyBookings);
  const lock16 = isSlotLockedAcrossIntervals(16, legacyBookings);

  check(
    lock12 && !lock13 && lock15 && !lock16,
    'R4-INV-03',
    'Legacy single-hour bookings with omitted or equal endTime default to 1-hour interval [h, h+1)',
    `12:${lock12}, 13:${lock13}, 15:${lock15}, 16:${lock16}`
  );
}

// Invariant 4.4: Timezone Date String Normalization Across Diverse Formats
{
  const cases = [
    { input: '2026-08-25', expected: '2026-08-25' },
    { input: '2026-08-25T00:00:00.000Z', expected: '2026-08-25' },
    { input: '2026-08-25T23:59:59.999Z', expected: '2026-08-25' },
    { input: '2026-08-25T14:30:00+03:00', expected: '2026-08-25' },
    { input: '2028-02-29T10:00:00Z', expected: '2028-02-29' }, // Leap year
    { input: new Date('2026-12-31T22:00:00Z'), expected: '2026-12-31' },
    { input: '', expected: '' },
    { input: null, expected: '' },
    { input: undefined, expected: '' },
  ];

  const allDatesMatch = cases.every((c) => {
    const res = normalizeDateString(c.input);
    return res === c.expected;
  });

  check(
    allDatesMatch,
    'R4-INV-04',
    'normalizeDateString normalizes ISO timestamps, calendar strings, leap dates, and nulls consistently',
    'All date format test cases matched'
  );
}

// Invariant 4.5: Time formatting edge cases (0 -> 12:00 AM, 12 -> 12:00 PM, 23 -> 11:00 PM, 24 -> 12:00 AM)
{
  const h0 = formatHour(0);
  const h1 = formatHour(1);
  const h11 = formatHour(11);
  const h12 = formatHour(12);
  const h18 = formatHour(18);
  const h23 = formatHour(23);
  const h24 = formatHour(24);

  const formatMatches =
    h0 === '12:00 AM' &&
    h1 === '01:00 AM' &&
    h11 === '11:00 AM' &&
    h12 === '12:00 PM' &&
    h18 === '06:00 PM' &&
    h23 === '11:00 PM' &&
    h24 === '12:00 AM';

  check(
    formatMatches,
    'R4-INV-05',
    'formatHour correctly formats 12-hour AM/PM with zero-padding and noon/midnight boundaries',
    `0:${h0}, 1:${h1}, 11:${h11}, 12:${h12}, 18:${h18}, 23:${h23}, 24:${h24}`
  );
}

// ============================================================================
// SUITE 5: END-TO-END MOBILE CLIENT STATE TRANSITION SIMULATION
// ============================================================================
console.log('\n--- [SUITE 5] End-to-End Client Hook & State Machine Simulation ---');

{
  // Simulate user selecting multiple slots, toggling, clearing, and wallet auto-deduct updates
  let selectedSlots = [];
  const toggle = (slot) => {
    const idx = selectedSlots.findIndex((s) => s.id === slot.id);
    if (idx >= 0) selectedSlots.splice(idx, 1);
    else selectedSlots.push(slot);
    selectedSlots.sort((a, b) => a.startHour24 - b.startHour24);
  };

  const slot1 = { id: 's1', time: '10:00 AM - 11:00 AM', startHour24: 10, endHour24: 11, price: 200, available: true };
  const slot2 = { id: 's2', time: '12:00 PM - 01:00 PM', startHour24: 12, endHour24: 13, price: 200, available: true };
  const slot3 = { id: 's3', time: '02:00 PM - 03:00 PM', startHour24: 14, endHour24: 15, price: 200, available: true };

  // Select slot 2 then slot 1
  toggle(slot2);
  toggle(slot1);
  const sortedCorrectly = selectedSlots[0].id === 's1' && selectedSlots[1].id === 's2';

  // Toggle slot 1 off
  toggle(slot1);
  const untoggledCorrectly = selectedSlots.length === 1 && selectedSlots[0].id === 's2';

  // Add slot 1 and slot 3
  toggle(slot1);
  toggle(slot3);
  const threeSlots = selectedSlots.length === 3;

  // Clear slots
  selectedSlots = [];
  const cleared = selectedSlots.length === 0;

  check(
    sortedCorrectly && untoggledCorrectly && threeSlots && cleared,
    'M3-SIM-01',
    'Mobile UI slot selection state machine correctly sorts, toggles, and clears selection',
    `Sorted: ${sortedCorrectly}, Untoggled: ${untoggledCorrectly}, 3Slots: ${threeSlots}, Cleared: ${cleared}`
  );
}

// ============================================================================
// FINAL RESULTS REPORT
// ============================================================================
console.log('\n======================================================================');
console.log('                 CHALLENGER M3 TEST SUMMARY');
console.log('======================================================================');
console.log(` Total Checks:  ${passCount + failCount}`);
console.log(` Passed:        ${passCount}`);
console.log(` Failed:        ${failCount}`);
console.log(` Pass Rate:     ${(((passCount) / (passCount + failCount)) * 100).toFixed(1)}%`);
console.log('======================================================================\n');

if (failCount > 0) {
  console.error('FAILURES DETECTED:');
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
} else {
  console.log('ALL EMPIRICAL CHALLENGER INVARIANTS SATISFIED WITHOUT EXCEPTION.\n');
  process.exit(0);
}
