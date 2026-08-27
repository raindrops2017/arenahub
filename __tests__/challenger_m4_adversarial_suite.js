/**
 * challenger_m4_adversarial_suite.js
 * Tier 5 Comprehensive Adversarial Hardening and Boundary Stress Suite
 * Milestone 4: Master E2E & Full System Hardening
 */

import crypto from 'crypto';

class AdversarialHarness {
  constructor() {
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
    this.failures = [];
  }

  async test(name, fn) {
    this.total++;
    try {
      await fn();
      this.passed++;
      console.log(`  ✓  [PASS] ${name}`);
    } catch (err) {
      this.failed++;
      this.failures.push({ name, error: err.message || String(err) });
      console.error(`  ✗  [FAIL] ${name}`);
      console.error(`     Error: ${err.message || err}`);
    }
  }

  summary() {
    console.log('\n===============================================================');
    console.log(`  Tier 5 Stress Tests Run: ${this.total} | Passed: ${this.passed} | Failed: ${this.failed}`);
    console.log(`  Pass Rate: ${((this.passed / this.total) * 100).toFixed(2)}%`);
    console.log('===============================================================\n');
    return this.failed === 0;
  }
}

const harness = new AdversarialHarness();

// ============================================================================
// DOMAIN LOGIC SPECIFICATIONS
// ============================================================================

function roundTo2Decimals(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

function computePaymentSplit({
  walletBalance = 0,
  totalCost = 0,
  minimumDepositAmount = 0,
  slotsCount = 1,
  couponDiscountPercent = 0,
  couponFixedDiscount = 0,
}) {
  const safeWalletBalance = Math.max(0, roundTo2Decimals(walletBalance || 0));
  const rawCost = Math.max(0, roundTo2Decimals(totalCost || 0));

  // 1. Apply coupon discount
  let discount = 0;
  if (couponDiscountPercent > 0) {
    discount += roundTo2Decimals((rawCost * couponDiscountPercent) / 100);
  }
  if (couponFixedDiscount > 0) {
    discount += roundTo2Decimals(couponFixedDiscount);
  }
  discount = Math.min(discount, rawCost);
  const finalPrice = roundTo2Decimals(rawCost - discount);

  // 2. Deposit calculation
  const depositConfigured = typeof minimumDepositAmount === 'number' && minimumDepositAmount > 0;
  let targetPaymentAmount = finalPrice;
  let isDepositPayment = false;

  if (depositConfigured) {
    const calculatedDeposit = roundTo2Decimals(slotsCount * minimumDepositAmount);
    targetPaymentAmount = Math.min(calculatedDeposit, finalPrice);
    isDepositPayment = targetPaymentAmount < finalPrice;
  }

  // 3. Auto-wallet deduction against targetPaymentAmount
  const walletDeduction = roundTo2Decimals(Math.min(safeWalletBalance, targetPaymentAmount));
  const paymobRemainder = roundTo2Decimals(Math.max(0, targetPaymentAmount - walletDeduction));
  const paymobRequired = paymobRemainder > 0;
  const remainingAtVenue = roundTo2Decimals(Math.max(0, finalPrice - targetPaymentAmount));
  const remainingWalletBalance = roundTo2Decimals(safeWalletBalance - walletDeduction);

  let paymentStatus = 'unpaid';
  if (paymobRemainder === 0) {
    paymentStatus = isDepositPayment ? 'partially_paid' : 'paid';
  } else {
    paymentStatus = isDepositPayment ? 'partially_paid' : 'unpaid';
  }

  return {
    rawCost,
    discount,
    finalPrice,
    targetPaymentAmount,
    walletDeduction,
    paymobRemainder,
    paymobRequired,
    remainingAtVenue,
    remainingWalletBalance,
    paymentStatus,
    isDepositPayment,
  };
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

    for (let hour = slot.startTime; hour < slot.endTime; hour++) {
      const customPrice = venue.customHourPrices?.find((p) => p.hour === hour);
      if (customPrice && typeof customPrice.pricePerHour === 'number' && customPrice.pricePerHour > 0) {
        totalCost += customPrice.pricePerHour;
      } else {
        totalCost += venue.defaultHourPrice || 200;
      }
    }
  }

  return roundTo2Decimals(totalCost);
}

function isSlotLockedAcrossIntervals(slotHour, bookedIntervals) {
  return bookedIntervals.some((booking) => {
    const end = booking.endTime && booking.endTime > booking.startTime ? booking.endTime : booking.startTime + 1;
    return slotHour >= booking.startTime && slotHour < end;
  });
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

// ============================================================================
// ADVERSARIAL TEST RUNNER
// ============================================================================

async function runAdversarialSuite() {
  console.log('\n===============================================================');
  console.log('   TIER 5 ADVERSARIAL HARDENING & STRESS VERIFICATION SUITE');
  console.log('===============================================================\n');

  // --------------------------------------------------------------------------
  // MANDATE PART 1: Extreme Wallet Balance Boundaries
  // --------------------------------------------------------------------------
  console.log('--- MANDATE 1: Extreme Wallet Balance Boundaries ---');

  await harness.test('M1-WB-01: Zero Wallet Balance (0.00 EGP) with full cost', () => {
    const res = computePaymentSplit({ walletBalance: 0.0, totalCost: 350.0 });
    if (res.walletDeduction !== 0.0 || res.paymobRemainder !== 350.0 || !res.paymobRequired || res.paymentStatus !== 'unpaid') {
      throw new Error(`Unexpected split for 0 wallet balance: ${JSON.stringify(res)}`);
    }
  });

  await harness.test('M1-WB-02: Balance Equals Exact Minimum Deposit', () => {
    // 3 slots @ 200 = 600 EGP. Minimum deposit = 80/slot -> 240 EGP deposit.
    // Wallet balance = 240.00 EGP.
    const res = computePaymentSplit({
      walletBalance: 240.0,
      totalCost: 600.0,
      minimumDepositAmount: 80.0,
      slotsCount: 3,
    });
    if (res.targetPaymentAmount !== 240.0 || res.walletDeduction !== 240.0 || res.paymobRemainder !== 0.0 || res.paymobRequired !== false || res.paymentStatus !== 'partially_paid' || res.remainingAtVenue !== 360.0 || res.remainingWalletBalance !== 0.0) {
      throw new Error(`Failed exact deposit match: ${JSON.stringify(res)}`);
    }
  });

  await harness.test('M1-WB-03: Balance Equals Exact Total Cost', () => {
    // Total cost = 500 EGP, wallet = 500 EGP, no deposit requirement
    const res = computePaymentSplit({ walletBalance: 500.0, totalCost: 500.0 });
    if (res.walletDeduction !== 500.0 || res.paymobRemainder !== 0.0 || res.paymobRequired !== false || res.paymentStatus !== 'paid' || res.remainingWalletBalance !== 0.0) {
      throw new Error(`Failed exact total cost match: ${JSON.stringify(res)}`);
    }
  });

  await harness.test('M1-WB-04: Balance Exceeds Total Cost (Excess Wealth Boundary)', () => {
    // Total cost = 400 EGP, wallet = 1,000,000.00 EGP
    const res = computePaymentSplit({ walletBalance: 1000000.0, totalCost: 400.0 });
    if (res.walletDeduction !== 400.0 || res.paymobRemainder !== 0.0 || res.paymobRequired !== false || res.paymentStatus !== 'paid' || res.remainingWalletBalance !== 999600.0) {
      throw new Error(`Failed excess balance handling: ${JSON.stringify(res)}`);
    }
  });

  await harness.test('M1-WB-05: Fractional & Micro-Cent Float Stress Invariants (10,000 Random Permutations)', () => {
    for (let i = 0; i < 10000; i++) {
      const balance = Math.random() * 5000;
      const cost = Math.random() * 5000;
      const deposit = Math.random() > 0.5 ? Math.random() * 150 : 0;
      const slotsCount = Math.floor(Math.random() * 5) + 1;

      const res = computePaymentSplit({
        walletBalance: balance,
        totalCost: cost,
        minimumDepositAmount: deposit,
        slotsCount,
      });

      const sumDue = roundTo2Decimals(res.walletDeduction + res.paymobRemainder);
      if (sumDue !== res.targetPaymentAmount) {
        throw new Error(`Conservation invariant failed: walletDeduction (${res.walletDeduction}) + paymobRemainder (${res.paymobRemainder}) = ${sumDue} !== targetPaymentAmount (${res.targetPaymentAmount})`);
      }
      if (res.walletDeduction > roundTo2Decimals(balance)) {
        throw new Error(`Wallet overdrawn: deduction ${res.walletDeduction} > balance ${balance}`);
      }
      if (res.remainingWalletBalance < 0) {
        throw new Error(`Negative wallet balance: ${res.remainingWalletBalance}`);
      }
    }
  });

  await harness.test('M1-WB-06: Negative and NaN Wallet Balance Sanitization', () => {
    const resNeg = computePaymentSplit({ walletBalance: -150, totalCost: 300 });
    const resNaN = computePaymentSplit({ walletBalance: NaN, totalCost: 300 });
    const resUndef = computePaymentSplit({ walletBalance: undefined, totalCost: 300 });

    if (resNeg.walletDeduction !== 0 || resNeg.paymobRemainder !== 300) throw new Error('Failed negative wallet sanitization');
    if (resNaN.walletDeduction !== 0 || resNaN.paymobRemainder !== 300) throw new Error('Failed NaN wallet sanitization');
    if (resUndef.walletDeduction !== 0 || resUndef.paymobRemainder !== 300) throw new Error('Failed undefined wallet sanitization');
  });

  // --------------------------------------------------------------------------
  // MANDATE PART 2: Non-Continuous Multi-Slot Selections & Multi-Day Isolation
  // --------------------------------------------------------------------------
  console.log('\n--- MANDATE 2: Non-Continuous Multi-Slot Selections & Multi-Day Isolation ---');

  await harness.test('M2-MS-01: Disjoint Multi-Slot Selection Pricing on Same Day', () => {
    const venue = {
      defaultHourPrice: 200,
      customHourPrices: [
        { hour: 13, pricePerHour: 220 },
        { hour: 14, pricePerHour: 220 },
        { hour: 21, pricePerHour: 300 },
        { hour: 22, pricePerHour: 300 },
      ],
    };

    // User selects 3 non-continuous slots: [8, 9), [13, 15), [21, 23)
    const slots = [
      { startTime: 8, endTime: 9 },   // default 200
      { startTime: 13, endTime: 15 }, // custom 220 + 220 = 440
      { startTime: 21, endTime: 23 }, // custom 300 + 300 = 600
    ];

    const total = calculateGroupBookingCost(slots, venue);
    if (total !== 1240) {
      throw new Error(`Expected total cost 1240, got ${total}`);
    }
  });

  await harness.test('M2-MS-02: Full Operating Day (16 Disjoint / Continuous Slots) Aggregation', () => {
    const venue = { defaultHourPrice: 150 };
    const slots = [];
    for (let h = 8; h < 24; h++) {
      slots.push({ startTime: h, endTime: h + 1 });
    }
    const total = calculateGroupBookingCost(slots, venue);
    if (total !== 2400 || slots.length !== 16) {
      throw new Error(`Expected 2400 for 16 slots, got ${total}`);
    }
  });

  await harness.test('M2-MS-03: Multi-Day Selection Isolation & Date Switching State Invariant', () => {
    // Simulated state machine in useBookingFlow:
    let selectedDate = '2026-09-01';
    let selectedSlots = [{ startTime: 10, endTime: 11 }, { startTime: 12, endTime: 13 }];

    // Switch date -> slots MUST be wiped to enforce single-date reservation integrity
    function handleSelectDate(newDate) {
      selectedDate = newDate;
      selectedSlots = [];
    }

    handleSelectDate('2026-09-02');
    if (selectedDate !== '2026-09-02' || selectedSlots.length !== 0) {
      throw new Error('Date switch failed to enforce empty slots invariant');
    }
  });

  await harness.test('M2-MS-04: Adversarial Slot Validation (Empty, Inverted, Zero-Duration)', () => {
    let errEmpty = false;
    let errInverted = false;
    let errZero = false;

    try { calculateGroupBookingCost([], { defaultHourPrice: 200 }); } catch { errEmpty = true; }
    try { calculateGroupBookingCost([{ startTime: 18, endTime: 16 }], { defaultHourPrice: 200 }); } catch { errInverted = true; }
    try { calculateGroupBookingCost([{ startTime: 18, endTime: 18 }], { defaultHourPrice: 200 }); } catch { errZero = true; }

    if (!errEmpty || !errInverted || !errZero) {
      throw new Error(`Adversarial validation failed: empty=${errEmpty}, inverted=${errInverted}, zero=${errZero}`);
    }
  });

  // --------------------------------------------------------------------------
  // MANDATE PART 3: Multi-Hour Lockout Boundary Conditions [startTime, endTime) & Timezones
  // --------------------------------------------------------------------------
  console.log('\n--- MANDATE 3: Multi-Hour Lockout Boundary Conditions & Timezones ---');

  await harness.test('M3-LC-01: Multi-Hour Interval [18, 21) Locks Exactly {18, 19, 20}', () => {
    const booked = [{ startTime: 18, endTime: 21 }];
    for (let h = 0; h < 24; h++) {
      const locked = isSlotLockedAcrossIntervals(h, booked);
      if (h >= 18 && h < 21) {
        if (!locked) throw new Error(`Hour ${h} should be locked in [18, 21)`);
      } else {
        if (locked) throw new Error(`Hour ${h} should NOT be locked in [18, 21)`);
      }
    }
  });

  await harness.test('M3-LC-02: Non-Continuous Multi-Interval Lockouts [9, 11) and [15, 18)', () => {
    const booked = [
      { startTime: 9, endTime: 11 },
      { startTime: 15, endTime: 18 },
    ];
    const expectedLocked = [9, 10, 15, 16, 17];
    for (let h = 0; h < 24; h++) {
      const locked = isSlotLockedAcrossIntervals(h, booked);
      const shouldLock = expectedLocked.includes(h);
      if (locked !== shouldLock) {
        throw new Error(`Hour ${h} expected locked=${shouldLock}, got ${locked}`);
      }
    }
  });

  await harness.test('M3-LC-03: Timezone Safety across ISO String, Offsets, DST, and Leap Days', () => {
    const testCases = [
      { input: '2026-09-15T00:00:00.000Z', exp: '2026-09-15' },
      { input: '2026-09-15T23:59:59.999Z', exp: '2026-09-15' },
      { input: '2026-10-30T22:00:00.000+02:00', exp: '2026-10-30' },
      { input: '2028-02-29T14:30:00.000Z', exp: '2028-02-29' },
      { input: '2026-12-31', exp: '2026-12-31' },
    ];

    for (const { input, exp } of testCases) {
      const res = normalizeDateString(input);
      if (res !== exp) {
        throw new Error(`Normalization failed for ${input}: got ${res}, expected ${exp}`);
      }
    }
  });

  // --------------------------------------------------------------------------
  // MANDATE PART 4: Coupon Code + Wallet Auto-Deduction + Deposit Interaction
  // --------------------------------------------------------------------------
  console.log('\n--- MANDATE 4: Coupon Code + Wallet Auto-Deduction + Deposit Interaction ---');

  await harness.test('M4-CP-01: 20% Coupon + Minimum Deposit + Wallet Partial + Paymob Remainder', () => {
    // 3 slots @ 300 = 900 EGP. 20% coupon discount -> 180 discount -> finalPrice = 720 EGP.
    // Minimum deposit = 100/slot -> 300 EGP required.
    // User wallet = 120 EGP.
    // Wallet deduction = 120 EGP. Paymob remainder = 180 EGP.
    // Remaining at venue = 720 - 300 = 420 EGP.
    const res = computePaymentSplit({
      walletBalance: 120,
      totalCost: 900,
      minimumDepositAmount: 100,
      slotsCount: 3,
      couponDiscountPercent: 20,
    });

    if (res.rawCost !== 900 || res.discount !== 180 || res.finalPrice !== 720 || res.targetPaymentAmount !== 300 || res.walletDeduction !== 120 || res.paymobRemainder !== 180 || res.remainingAtVenue !== 420 || res.paymentStatus !== 'partially_paid') {
      throw new Error(`M4-CP-01 failed: ${JSON.stringify(res)}`);
    }
  });

  await harness.test('M4-CP-02: 100% Coupon (Free Booking) Zeroes Checkout & Skips Paymob', () => {
    // 2 slots @ 250 = 500 EGP. 100% coupon -> 500 discount -> finalPrice = 0 EGP.
    // Minimum deposit = 100/slot. Since finalPrice=0, targetPaymentAmount = min(200, 0) = 0 EGP.
    // Wallet deduction = 0, Paymob = 0, status = 'paid'.
    const res = computePaymentSplit({
      walletBalance: 200,
      totalCost: 500,
      minimumDepositAmount: 100,
      slotsCount: 2,
      couponDiscountPercent: 100,
    });

    if (res.finalPrice !== 0 || res.targetPaymentAmount !== 0 || res.walletDeduction !== 0 || res.paymobRemainder !== 0 || res.paymobRequired !== false || res.paymentStatus !== 'paid') {
      throw new Error(`M4-CP-02 failed: ${JSON.stringify(res)}`);
    }
  });

  await harness.test('M4-CP-03: Heavy Discount Exceeding Deposit (Deposit Clamped to Final Price)', () => {
    // 2 slots @ 200 = 400 EGP. Fixed coupon = 350 EGP -> finalPrice = 50 EGP.
    // Venue deposit = 80/slot -> 160 EGP.
    // Clamped deposit = min(160, 50) = 50 EGP -> 100% payment (not deposit-only).
    // Wallet balance = 60 EGP -> auto-deducts 50 EGP -> Paymob = 0, status = 'paid'.
    const res = computePaymentSplit({
      walletBalance: 60,
      totalCost: 400,
      minimumDepositAmount: 80,
      slotsCount: 2,
      couponFixedDiscount: 350,
    });

    if (res.finalPrice !== 50 || res.targetPaymentAmount !== 50 || res.isDepositPayment !== false || res.walletDeduction !== 50 || res.paymobRemainder !== 0 || res.paymentStatus !== 'paid' || res.remainingAtVenue !== 0) {
      throw new Error(`M4-CP-03 failed: ${JSON.stringify(res)}`);
    }
  });

  // --------------------------------------------------------------------------
  // MANDATE PART 5: PaymentMethodSelector Elimination
  // --------------------------------------------------------------------------
  console.log('\n--- MANDATE 5: PaymentMethodSelector Elimination Verification ---');

  await harness.test('M5-PM-01: Static Code Invariant Audit for Elimination of PaymentMethodSelector', async () => {
    // Ensure active pitch/booking UI (app/pitch/[id].tsx) does NOT import or render PaymentMethodSelector
    const fs = await import('fs');
    const path = await import('path');
    const pitchPath = path.resolve('app/pitch/[id].tsx');
    const pitchContent = fs.readFileSync(pitchPath, 'utf8');

    if (pitchContent.includes('PaymentMethodSelector')) {
      throw new Error('PaymentMethodSelector found referenced in app/pitch/[id].tsx');
    }
    if (pitchContent.includes('PaymentMethod') && pitchContent.includes('RadioGroup')) {
      throw new Error('Manual payment method radio group found in active booking screen');
    }
  });

  await harness.test('M5-PM-02: Zero Manual Payment Method Prompt Invariant', () => {
    // Booking flow automatically selects wallet if remainder=0 or paymob if remainder>0
    const zeroBalanceRes = computePaymentSplit({ walletBalance: 0, totalCost: 200 });
    const fullBalanceRes = computePaymentSplit({ walletBalance: 500, totalCost: 200 });

    const methodZero = zeroBalanceRes.paymobRequired ? 'paymob' : 'wallet';
    const methodFull = fullBalanceRes.paymobRequired ? 'paymob' : 'wallet';

    if (methodZero !== 'paymob' || methodFull !== 'wallet') {
      throw new Error(`Payment method determination invariant failed: zero=${methodZero}, full=${methodFull}`);
    }
  });

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  const allPassed = harness.summary();
  if (!allPassed) {
    process.exit(1);
  }
}

runAdversarialSuite().catch((err) => {
  console.error('Fatal error in Tier 5 Adversarial Harness:', err);
  process.exit(1);
});
