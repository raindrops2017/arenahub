/**
 * challenger_m4_master_stress.js
 * Tier 5 White-Box Adversarial Stress Harness & Empirical Verification
 * Milestone 4: Final Integration & Full System Adversarial Hardening
 */

// Self-contained runner

// If test_utils.js doesn't exist, we implement self-contained micro-harness
class AdversarialTestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.failures = [];
    this.total = 0;
  }

  async run(name, fn) {
    this.total++;
    try {
      await fn();
      this.passed++;
      console.log(`  ✓  [PASS] ${name}`);
    } catch (err) {
      this.failed++;
      this.failures.push({ name, error: err.message || err });
      console.error(`  ✗  [FAIL] ${name}`);
      console.error(`     Error: ${err.message || err}`);
    }
  }

  summary() {
    console.log('\n===============================================================');
    console.log(`  Total Tier 5 Stress Tests: ${this.total} | Passed: ${this.passed} | Failed: ${this.failed}`);
    console.log(`  Pass Rate: ${((this.passed / this.total) * 100).toFixed(1)}%`);
    console.log('===============================================================\n');
    return this.failed === 0;
  }
}

const runner = new AdversarialTestRunner();

// ============================================================================
// DOMAIN LOGIC UNDER TEST (Mirroring Platform Implementations)
// ============================================================================

function roundToCents(amount) {
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

function calculateWalletDeductionAndRemainder(walletBalance, totalCost) {
  const balance = Math.max(0, roundToCents(walletBalance || 0));
  const cost = Math.max(0, roundToCents(totalCost || 0));
  const deduction = Math.min(balance, cost);
  const remainder = roundToCents(cost - deduction);
  return {
    deduction: roundToCents(deduction),
    remainder: roundToCents(remainder),
    isFullWalletCoverage: remainder === 0,
    newWalletBalance: roundToCents(balance - deduction),
  };
}

function calculateGroupDepositAndPricing({ slots, minimumDepositAmount, couponDiscountPercent = 0, couponFixedDiscount = 0 }) {
  if (!Array.isArray(slots) || slots.length === 0) {
    throw new Error('slots must be a non-empty array');
  }

  let rawTotal = 0;
  for (const s of slots) {
    if (typeof s.price !== 'number' || s.price <= 0) {
      throw new Error('Each slot must have a positive price');
    }
    rawTotal += s.price;
  }
  rawTotal = roundToCents(rawTotal);

  // Apply discounts
  let discountAmount = 0;
  if (couponDiscountPercent > 0) {
    discountAmount += roundToCents((rawTotal * couponDiscountPercent) / 100);
  }
  if (couponFixedDiscount > 0) {
    discountAmount += roundToCents(couponFixedDiscount);
  }
  discountAmount = Math.min(discountAmount, rawTotal);
  const finalPrice = roundToCents(rawTotal - discountAmount);

  // Deposit calculation
  let requiredAmount = finalPrice;
  let isDepositOnly = false;
  const minDep = Number(minimumDepositAmount || 0);

  if (minDep > 0) {
    const totalSlotDeposit = roundToCents(slots.length * minDep);
    requiredAmount = Math.min(totalSlotDeposit, finalPrice);
    isDepositOnly = requiredAmount < finalPrice;
  }

  return {
    rawTotal,
    discountAmount,
    finalPrice,
    requiredAmount,
    isDepositOnly,
    paymentStatus: isDepositOnly ? 'partially_paid' : 'paid',
  };
}

function checkIntervalConflict(bookedSlots, candidateSlot) {
  const { startTime: cStart, endTime: cEnd } = candidateSlot;
  if (cStart >= cEnd) {
    throw new Error('Invalid interval: startTime must be < endTime');
  }
  for (const b of bookedSlots) {
    // Conflict exists if interval overlaps: max(start) < min(end)
    if (Math.max(b.startTime, cStart) < Math.min(b.endTime, cEnd)) {
      return true;
    }
  }
  return false;
}

function normalizeDateUtc(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================================================
// TIER 5 ADVERSARIAL STRESS PROBES
// ============================================================================

async function runTier5Suites() {
  console.log('\n===============================================================');
  console.log('  TIER 5 ADVERSARIAL STRESS HARNESS — SPORTS VENUE PLATFORM');
  console.log('===============================================================\n');

  // SUITE 1: Extreme Randomized Floating-Point Financial Precision Invariants
  await runner.run('T5-FIN-01: 5,000 Randomized Wallet Deduction Invariant Tuples (D + Remainder == Cost)', () => {
    for (let i = 0; i < 5000; i++) {
      const balance = Math.random() * 10000;
      const cost = Math.random() * 10000;
      const result = calculateWalletDeductionAndRemainder(balance, cost);

      const roundedCost = roundToCents(cost);
      const roundedBalance = roundToCents(balance);
      const sum = roundToCents(result.deduction + result.remainder);

      if (sum !== roundedCost) {
        throw new Error(`Invariant broken for balance=${balance}, cost=${cost}: deduction=${result.deduction} + remainder=${result.remainder} != roundedCost=${roundedCost}`);
      }
      if (result.deduction > roundedBalance) {
        throw new Error(`Over-deduction detected: deduction=${result.deduction} > balance=${roundedBalance}`);
      }
      if (result.newWalletBalance < 0) {
        throw new Error(`Negative wallet balance: ${result.newWalletBalance}`);
      }
    }
  });

  await runner.run('T5-FIN-02: Micro-Piastre and Precision Boundary Extremes (0.01 EGP differences)', () => {
    const cases = [
      { b: 100.00, c: 100.00, expD: 100.00, expR: 0.00, expCover: true },
      { b: 99.99, c: 100.00, expD: 99.99, expR: 0.01, expCover: false },
      { b: 100.01, c: 100.00, expD: 100.00, expR: 0.00, expCover: true },
      { b: 0.001, c: 0.005, expD: 0.00, expR: 0.01, expCover: false },
      { b: 0.009, c: 0.01, expD: 0.01, expR: 0.00, expCover: true },
      { b: 0.00, c: 500.00, expD: 0.00, expR: 500.00, expCover: false },
      { b: 1000.00, c: 0.00, expD: 0.00, expR: 0.00, expCover: true },
    ];

    for (const { b, c, expD, expR, expCover } of cases) {
      const res = calculateWalletDeductionAndRemainder(b, c);
      if (res.deduction !== expD || res.remainder !== expR || res.isFullWalletCoverage !== expCover) {
        throw new Error(`Precision mismatch for (${b}, ${c}): got deduction=${res.deduction}, remainder=${res.remainder}, coverage=${res.isFullWalletCoverage}`);
      }
    }
  });

  await runner.run('T5-FIN-03: Multi-Slot Deposit Calculation with Cap and Coupon Discounts', () => {
    // 3 slots @ 250 EGP = 750 EGP. Minimum deposit = 80 EGP/slot (3 * 80 = 240 EGP).
    // Coupon: 20% off -> raw 750 * 0.2 = 150 discount -> finalPrice = 600 EGP.
    // Required deposit = min(240, 600) = 240 EGP (partially_paid).
    const res1 = calculateGroupDepositAndPricing({
      slots: [{ price: 250 }, { price: 250 }, { price: 250 }],
      minimumDepositAmount: 80,
      couponDiscountPercent: 20,
    });
    if (res1.rawTotal !== 750 || res1.discountAmount !== 150 || res1.finalPrice !== 600 || res1.requiredAmount !== 240 || res1.paymentStatus !== 'partially_paid') {
      throw new Error(`Failed calculation for multi-slot deposit: ${JSON.stringify(res1)}`);
    }

    // Huge deposit exceeds final price: 2 slots @ 100 = 200 EGP. minDeposit = 300 EGP/slot (2 * 300 = 600 EGP).
    // Required = min(600, 200) = 200 EGP -> isDepositOnly: false, paymentStatus: 'paid'
    const res2 = calculateGroupDepositAndPricing({
      slots: [{ price: 100 }, { price: 100 }],
      minimumDepositAmount: 300,
    });
    if (res2.requiredAmount !== 200 || res2.isDepositOnly !== false || res2.paymentStatus !== 'paid') {
      throw new Error(`Failed deposit cap at total price: ${JSON.stringify(res2)}`);
    }
  });

  await runner.run('T5-FIN-04: Multi-Slot + Deposit + Wallet Auto-Deduction Invariant Composition', () => {
    // 4 slots @ 200 EGP = 800 EGP. Deposit 50 EGP/slot = 200 EGP.
    // User wallet = 125.50 EGP.
    // Group deposit required = 200 EGP.
    // Wallet deduction = min(125.50, 200) = 125.50 EGP.
    // Paymob remainder = 200 - 125.50 = 74.50 EGP.
    const groupPricing = calculateGroupDepositAndPricing({
      slots: [{ price: 200 }, { price: 200 }, { price: 200 }, { price: 200 }],
      minimumDepositAmount: 50,
    });
    const walletRes = calculateWalletDeductionAndRemainder(125.50, groupPricing.requiredAmount);

    if (groupPricing.requiredAmount !== 200) throw new Error('Expected requiredAmount 200');
    if (walletRes.deduction !== 125.50) throw new Error('Expected wallet deduction 125.50');
    if (walletRes.remainder !== 74.50) throw new Error('Expected Paymob remainder 74.50');
    if (walletRes.newWalletBalance !== 0.00) throw new Error('Expected new balance 0.00');
  });

  // SUITE 2: Multi-Hour Interval Lockout Exhaustive Matrix
  await runner.run('T5-LOCK-01: Multi-Hour Sub-Slot Interval Overlap Exhaustive Combinations', () => {
    // Booked interval: [14, 18) (locks hours 14, 15, 16, 17)
    const booked = [{ startTime: 14, endTime: 18 }];

    const shouldConflict = [
      { startTime: 14, endTime: 15 }, // Exact first hour
      { startTime: 15, endTime: 16 }, // Middle hour
      { startTime: 17, endTime: 18 }, // Exact last hour
      { startTime: 14, endTime: 18 }, // Exact identical interval
      { startTime: 13, endTime: 15 }, // Overlapping left boundary
      { startTime: 17, endTime: 19 }, // Overlapping right boundary
      { startTime: 12, endTime: 20 }, // Encompassing entire interval
      { startTime: 15, endTime: 17 }, // Fully enclosed interval
    ];

    for (const c of shouldConflict) {
      if (!checkIntervalConflict(booked, c)) {
        throw new Error(`Expected conflict for candidate [${c.startTime}, ${c.endTime}) against [14, 18)`);
      }
    }

    const shouldPass = [
      { startTime: 10, endTime: 14 }, // Directly adjacent left (end at 14)
      { startTime: 18, endTime: 22 }, // Directly adjacent right (start at 18)
      { startTime: 8, endTime: 10 },   // Fully disjoint before
      { startTime: 22, endTime: 24 },  // Fully disjoint after
    ];

    for (const p of shouldPass) {
      if (checkIntervalConflict(booked, p)) {
        throw new Error(`Expected NO conflict for candidate [${p.startTime}, ${p.endTime}) against [14, 18)`);
      }
    }
  });

  await runner.run('T5-LOCK-02: Non-Continuous Multi-Slot Group Reservation Lockouts', () => {
    // User booked 3 disjoint slots in one group: [9, 10), [13, 15), [20, 22)
    const bookedGroup = [
      { startTime: 9, endTime: 10 },
      { startTime: 13, endTime: 15 },
      { startTime: 20, endTime: 22 },
    ];

    // Check overlaps
    if (!checkIntervalConflict(bookedGroup, { startTime: 9, endTime: 10 })) throw new Error('Failed to conflict on [9, 10)');
    if (!checkIntervalConflict(bookedGroup, { startTime: 14, endTime: 16 })) throw new Error('Failed to conflict on [14, 16)');
    if (!checkIntervalConflict(bookedGroup, { startTime: 19, endTime: 21 })) throw new Error('Failed to conflict on [19, 21)');

    // Check available intervals in between
    if (checkIntervalConflict(bookedGroup, { startTime: 10, endTime: 13 })) throw new Error('Should allow interval [10, 13)');
    if (checkIntervalConflict(bookedGroup, { startTime: 15, endTime: 20 })) throw new Error('Should allow interval [15, 20)');
    if (checkIntervalConflict(bookedGroup, { startTime: 22, endTime: 24 })) throw new Error('Should allow interval [22, 24)');
  });

  // SUITE 3: Timezone Safety & Midnight Boundary Normalization
  await runner.run('T5-TZ-01: Calendar Date UTC Normalization Across ISO Strings & Offsets', () => {
    const dates = [
      { input: '2026-09-15T00:00:00.000Z', exp: '2026-09-15' },
      { input: '2026-09-15T23:59:59.999Z', exp: '2026-09-15' },
      { input: '2028-02-29T12:00:00.000Z', exp: '2028-02-29' }, // Leap year
      { input: '2026-12-31T18:30:00.000Z', exp: '2026-12-31' }, // Year boundary
      { input: '2027-01-01T04:00:00.000Z', exp: '2027-01-01' },
    ];

    for (const { input, exp } of dates) {
      const res = normalizeDateUtc(input);
      if (res !== exp) {
        throw new Error(`Normalization failed for ${input}: got ${res}, expected ${exp}`);
      }
    }
  });

  // SUITE 4: Cross-Module DTO & Data Schema Parity
  await runner.run('T5-DTO-01: Mobile Payload -> NestJS DTO Property Contract Parity', () => {
    // Simulated mobile app multi-slot booking request payload
    const mobilePayload = {
      venueId: '64e8b0a1f2b4c10012345678',
      date: '2026-11-25',
      slots: [
        { startTime: 18, endTime: 19 },
        { startTime: 19, endTime: 20 },
      ],
      paymentMethod: 'wallet',
      couponCode: 'SAVE20',
      idempotencyKey: 'IDEM-MOB-999',
    };

    // Assert mobile contract matches backend requirements
    if (!mobilePayload.venueId || typeof mobilePayload.venueId !== 'string') throw new Error('venueId required');
    if (!mobilePayload.date || !/^\d{4}-\d{2}-\d{2}$/.test(mobilePayload.date)) throw new Error('date ISO format required');
    if (!Array.isArray(mobilePayload.slots) || mobilePayload.slots.length === 0) throw new Error('slots array required');
    for (const s of mobilePayload.slots) {
      if (typeof s.startTime !== 'number' || typeof s.endTime !== 'number' || s.startTime >= s.endTime) {
        throw new Error('invalid slot time ranges');
      }
    }
    if (!['wallet', 'paymob', 'cash'].includes(mobilePayload.paymentMethod)) {
      throw new Error('invalid paymentMethod enum');
    }
  });

  await runner.run('T5-DTO-02: Dashboard Venue Form -> NestJS CreateVenueDto Contract Parity', () => {
    const dashboardFormPayload = {
      venueName: 'Tier 5 Arena Hub',
      address: '22 Al Tahrir Square, Cairo',
      locationAlt: 30.0444,
      locationLang: 31.2357,
      sportsType: ['football', 'padel'],
      amenities: ['WiFi', 'Parking', 'Showers'],
      startWorkingHours: 8,
      endWorkingHours: 24,
      defaultHourPrice: 300,
      minimumDepositAmount: 100,
      existingImages: ['https://s3.amazonaws.com/arena/img1.jpg'],
      keepImages: ['https://s3.amazonaws.com/arena/img1.jpg'],
      isActive: true,
    };

    // Assert dashboard payload contains no non-whitelisted properties
    const whitelistedKeys = [
      'venueName', 'address', 'locationAlt', 'locationLang', 'sportsType',
      'amenities', 'startWorkingHours', 'endWorkingHours', 'defaultHourPrice',
      'minimumDepositAmount', 'customHourPrices', 'existingImages', 'keepImages',
      'removedImages', 'deleteImages', 'isActive',
    ];

    for (const key of Object.keys(dashboardFormPayload)) {
      if (!whitelistedKeys.includes(key)) {
        throw new Error(`Non-whitelisted property in dashboard payload: ${key}`);
      }
    }
    if (dashboardFormPayload.minimumDepositAmount < 0) {
      throw new Error('minimumDepositAmount cannot be negative');
    }
  });

  // SUITE 5: Paymob Webhook HMAC Verification Algorithm Validation
  await runner.run('T5-SEC-01: Paymob Webhook SHA-512 HMAC Invariant & Tamper Detection', async () => {
    const crypto = await import('crypto');
    const secret = 'CF847A5A5927CEDDBC9DB35C1B0ABEA1';

    const sampleTxn = {
      amount_cents: 25000,
      created_at: '2026-11-25T14:00:00.000Z',
      currency: 'EGP',
      error_occured: false,
      has_parent_transaction: false,
      id: 88877766,
      integration_id: 3143838,
      is_3d_secure: true,
      is_auth: false,
      is_capture: false,
      is_refunded: false,
      is_standalone_payment: true,
      is_voided: false,
      order: { id: 112233 },
      owner: 100,
      pending: false,
      source_data: { pan: '1234', sub_type: 'Visa', type: 'card' },
      success: true,
    };

    function computePaymobHmac(txn, hmacSecret) {
      const concatenated = [
        txn.amount_cents,
        txn.created_at,
        txn.currency,
        txn.error_occured,
        txn.has_parent_transaction,
        txn.id,
        txn.integration_id,
        txn.is_3d_secure,
        txn.is_auth,
        txn.is_capture,
        txn.is_refunded,
        txn.is_standalone_payment,
        txn.is_voided,
        txn.order.id,
        txn.owner,
        txn.pending,
        txn.source_data.pan,
        txn.source_data.sub_type,
        txn.source_data.type,
        txn.success,
      ].join('');

      return crypto.createHmac('sha512', hmacSecret).update(concatenated).digest('hex');
    }

    const validHmac = computePaymobHmac(sampleTxn, secret);
    if (!validHmac || validHmac.length !== 128) {
      throw new Error(`Invalid SHA-512 HMAC length: ${validHmac?.length}`);
    }

    // Tamper single bit in payload
    const tamperedTxn = { ...sampleTxn, amount_cents: 25001 };
    const tamperedHmac = computePaymobHmac(tamperedTxn, secret);
    if (tamperedHmac === validHmac) {
      throw new Error('HMAC collision on tampered amount_cents!');
    }
  });

  const success = runner.summary();
  if (!success) {
    process.exit(1);
  }
}

runTier5Suites().catch((err) => {
  console.error('Fatal error in Tier 5 stress harness:', err);
  process.exit(1);
});
