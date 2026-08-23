/**
 * EMPIRICAL TEST HARNESS: Venue CRUD & Invariants (Milestone 3)
 * Target: D:/test-mobile-app/dashboard/src/data/mockStore.ts
 *
 * Tests:
 * 1. Venue creation with 8 sports types, coordinates, working hours, pricing rules, amenities, image gallery.
 * 2. Field updates and custom pricing rate modifications.
 * 3. Filtering by sport type & searching by name/address.
 * 4. Default hourly price vs custom peak rate pricing logic validation (including midnight wrapping).
 * 5. Store persistence & deletion handling.
 */

// In-memory LocalStorage, Window, and Event polyfills for Node.js execution environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; }
  };
}

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
} else if (!(globalThis as any).window.dispatchEvent) {
  (globalThis as any).window.dispatchEvent = () => true;
}

if (typeof globalThis.CustomEvent === 'undefined') {
  (globalThis as any).CustomEvent = class CustomEvent {
    constructor(public type: string, public params?: any) {}
  };
}

import {
  getVenues,
  getVenueById,
  addVenue,
  saveVenue,
  updateVenue,
  deleteVenue,
  initMockStore,
  getBookings,
  SEED_VENUES
} from '../../dashboard/src/data/mockStore';

import { Venue, SportsType, CustomPricingRate, VenueStatus } from '../../dashboard/src/types';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
  }
}

// Pricing calculation helper (simulating customer booking pricing logic with midnight wrap support)
function getEffectiveHourlyPrice(venue: Venue, timeStr24: string): number {
  const defaultPrice = venue.defaultHourlyPrice ?? venue.pricing?.defaultPricePerHour ?? 0;
  const customRates = venue.customHourlyPrices || venue.pricing?.customHourlyRates || [];

  if (customRates.length === 0) return defaultPrice;

  // Convert HH:MM to decimal hour (e.g. "18:30" -> 18.5)
  const [h, m] = timeStr24.split(':').map(Number);
  const hourVal = h + (m || 0) / 60;

  for (const rule of customRates) {
    const [startH, startM] = rule.startHour.split(':').map(Number);
    const [endH, endM] = rule.endHour.split(':').map(Number);
    const startVal = startH + (startM || 0) / 60;
    let endVal = endH + (endM || 0) / 60;
    if (endVal === 0 && startVal > 0) endVal = 24;

    const isMatch = startVal < endVal
      ? (hourVal >= startVal && hourVal < endVal)
      : (hourVal >= startVal || hourVal < endVal);

    if (isMatch) {
      return rule.pricePerHour;
    }
  }

  return defaultPrice;
}

// Search and filter helper (matching VenuesPage.tsx logic)
function filterVenues(
  venues: Venue[],
  searchQuery: string,
  sportFilter: string,
  statusFilter: string
): Venue[] {
  return venues.filter((v) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      v.name.toLowerCase().includes(q) ||
      v.address.toLowerCase().includes(q);

    const matchesSport =
      sportFilter === 'ALL' ||
      (v.sportsTypes && v.sportsTypes.includes(sportFilter as SportsType));

    const matchesStatus =
      statusFilter === 'ALL' || v.status === statusFilter;

    return matchesQuery && matchesSport && matchesStatus;
  });
}

function runEmpiricalTests() {
  console.log('====================================================');
  console.log('   RUNNING EMPIRICAL SUITE: VENUE CRUD & INVARIANTS  ');
  console.log('====================================================\n');

  // Reset localStorage & initialize seed
  localStorage.clear();
  initMockStore();

  const initialSeedCount = SEED_VENUES.length; // 4 seed venues

  // ---------------------------------------------------------------
  // SUITE 1: Venue Creation & Schema Invariants
  // ---------------------------------------------------------------
  console.log('--- SUITE 1: Venue Creation & Schema Invariants ---');

  const all8Sports: SportsType[] = [
    '5-A-SIDE',
    '7-A-SIDE',
    '11-A-SIDE',
    'PADEL',
    'BASKETBALL',
    'TENNIS',
    'VOLLEYBALL',
    'BADMINTON'
  ];

  const fullAmenityList = [
    'Parking',
    'Showers',
    'Floodlights',
    'Locker Rooms',
    'Wifi',
    'Refreshments',
    'Equipment Rental',
    'Cafeteria',
    'Air Conditioned Lounge'
  ];

  const sampleGallery = [
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80'
  ];

  const peakRule1: CustomPricingRate = {
    id: 'peak-night',
    label: 'Night Peak',
    startHour: '18:00',
    endHour: '23:00',
    pricePerHour: 350
  };

  const newVenueData = {
    name: 'GRAND OLYMPIC MULTI-SPORT ARENA',
    sportsTypes: all8Sports,
    address: 'Plot 42, Sector 1, New Cairo, Egypt',
    coordinates: { lat: 30.0444, lng: 31.2357 },
    workingHours: {
      openTime: '06:00 AM',
      closeTime: '02:00 AM',
      daysOpen: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    },
    defaultHourlyPrice: 250,
    customHourlyPrices: [peakRule1],
    pricing: {
      defaultPricePerHour: 250,
      currency: 'EGP' as const,
      customHourlyRates: [peakRule1]
    },
    amenities: fullAmenityList,
    imageUrls: sampleGallery,
    imageGallery: sampleGallery,
    status: 'Active' as VenueStatus,
    description: 'State of the art multi-sport complex supporting all 8 sports types.'
  };

  const createdVenue = addVenue(newVenueData);

  assert(!!createdVenue.id, '1.1 Venue creation generates non-empty ID');
  assert(createdVenue.sportsTypes.length === 8, '1.2 Venue creation includes all 8 sports types');
  assert(createdVenue.coordinates.lat === 30.0444 && createdVenue.coordinates.lng === 31.2357, '1.3 Venue coordinates stored accurately');
  assert(createdVenue.workingHours.openTime === '06:00 AM' && createdVenue.workingHours.daysOpen.length === 7, '1.4 Working hours stored correctly');
  assert(createdVenue.amenities.length === 9, '1.5 All 9 amenities stored');
  assert(createdVenue.imageUrls.length === 2 && createdVenue.imageGallery?.length === 2, '1.6 Image gallery URLs saved & synced');

  // Verify Schema Normalization Invariant
  assert(
    createdVenue.defaultHourlyPrice === createdVenue.pricing.defaultPricePerHour,
    '1.7 Invariant: defaultHourlyPrice equals pricing.defaultPricePerHour'
  );
  assert(
    createdVenue.customHourlyPrices?.length === createdVenue.pricing.customHourlyRates.length,
    '1.8 Invariant: customHourlyPrices equals pricing.customHourlyRates length'
  );

  // Verify Persistence via getVenueById
  const fetchedVenue = getVenueById(createdVenue.id);
  assert(!!fetchedVenue, '1.9 LocalStorage persistence: getVenueById returns created venue');
  assert(fetchedVenue?.name === 'GRAND OLYMPIC MULTI-SPORT ARENA', '1.10 LocalStorage persistence: Name matches');

  console.log('');

  // ---------------------------------------------------------------
  // SUITE 2: Venue Updates & Custom Rates Mutations
  // ---------------------------------------------------------------
  console.log('--- SUITE 2: Venue Updates & Custom Rates Mutations ---');

  const peakRule2: CustomPricingRate = {
    id: 'midnight-special',
    label: 'Late Night',
    startHour: '23:00',
    endHour: '02:00',
    pricePerHour: 400
  };

  const updatedVenue = updateVenue(createdVenue.id, {
    name: 'GRAND OLYMPIC MULTI-SPORT ARENA (UPDATED)',
    status: 'Maintenance',
    defaultHourlyPrice: 300,
    customHourlyPrices: [peakRule1, peakRule2]
  });

  assert(updatedVenue.name === 'GRAND OLYMPIC MULTI-SPORT ARENA (UPDATED)', '2.1 Name update succeeds');
  assert(updatedVenue.status === 'Maintenance', '2.2 Status update to Maintenance succeeds');
  assert(updatedVenue.defaultHourlyPrice === 300, '2.3 Top-level defaultHourlyPrice updated');
  assert(updatedVenue.pricing.defaultPricePerHour === 300, '2.4 Nested pricing.defaultPricePerHour updated in sync');
  assert(updatedVenue.customHourlyPrices?.length === 2, '2.5 Custom pricing rules array updated to 2 rules');
  assert(updatedVenue.pricing.customHourlyRates.length === 2, '2.6 Nested customHourlyRates updated in sync');
  assert(updatedVenue.createdAt === createdVenue.createdAt, '2.7 Invariant: createdAt timestamp is preserved');
  assert(updatedVenue.updatedAt !== createdVenue.updatedAt, '2.8 Invariant: updatedAt timestamp is updated');

  // Verify persistence of update
  const fetchedUpdated = getVenueById(createdVenue.id);
  assert(fetchedUpdated?.status === 'Maintenance', '2.9 LocalStorage persistence: Updated status retrieved correctly');

  console.log('');

  // ---------------------------------------------------------------
  // SUITE 3: Filtering & Search Logic Verification
  // ---------------------------------------------------------------
  console.log('--- SUITE 3: Filtering & Search Logic Verification ---');

  const allVenues = getVenues();

  // Test Search by Name
  const searchByNameResults = filterVenues(allVenues, 'Santiago', 'ALL', 'ALL');
  assert(
    searchByNameResults.length === 1 && searchByNameResults[0].id === 'santiago-padel',
    '3.1 Search by venue name ("Santiago") matches Santiago Padel Club'
  );

  // Test Search by Address
  const searchByAddressResults = filterVenues(allVenues, 'Zayed', 'ALL', 'ALL');
  assert(
    searchByAddressResults.length >= 1 && searchByAddressResults.some(v => v.id === 'arena-1'),
    '3.2 Search by address ("Zayed") matches Arena 1'
  );

  // Test Filtering by Sport Type for all 8 sports
  for (const sport of all8Sports) {
    const sportFilterResults = filterVenues(allVenues, '', sport, 'ALL');
    const expected = allVenues.filter(v => v.sportsTypes && v.sportsTypes.includes(sport));
    assert(
      sportFilterResults.length === expected.length,
      `3.3 Filter by sport "${sport}" returns exact count (${sportFilterResults.length})`
    );
  }

  // Test Status Filter
  const activeStatusResults = filterVenues(allVenues, '', 'ALL', 'Active');
  const maintenanceStatusResults = filterVenues(allVenues, '', 'ALL', 'Maintenance');
  assert(activeStatusResults.length === 4, '3.4 Filter by status "Active" returns 4 active venues');
  assert(maintenanceStatusResults.length === 1, '3.5 Filter by status "Maintenance" returns updated venue');

  console.log('');

  // ---------------------------------------------------------------
  // SUITE 4: Pricing Engine & Custom Peak Rate Validation
  // ---------------------------------------------------------------
  console.log('--- SUITE 4: Pricing Engine & Custom Peak Rate Validation ---');

  // Venue 1: Santiago Padel Club (default: 300 EGP, peak 17:00-23:00 @ 380 EGP)
  const santiago = getVenueById('santiago-padel')!;
  const stdPricePadel = getEffectiveHourlyPrice(santiago, '14:00');
  const peakPricePadel = getEffectiveHourlyPrice(santiago, '19:30');

  assert(stdPricePadel === 300, '4.1 Santiago Padel off-peak (14:00) returns default price (300 EGP)');
  assert(peakPricePadel === 380, '4.2 Santiago Padel peak time (19:30) returns peak rate (380 EGP)');

  // Venue 2: Arena 1 (default: 200 EGP, peak 18:00-00:00 @ 280 EGP)
  const arena1 = getVenueById('arena-1')!;
  const stdPriceArena = getEffectiveHourlyPrice(arena1, '10:00');
  const peakPriceArena = getEffectiveHourlyPrice(arena1, '20:00');

  assert(stdPriceArena === 200, '4.3 Arena 1 off-peak (10:00) returns default price (200 EGP)');
  assert(peakPriceArena === 280, '4.4 Arena 1 peak time (20:00) returns peak rate (280 EGP)');

  // Venue 3: Updated multi-sport venue with 2 custom rates (default 300, peak1 18:00-23:00 @ 350, peak2 23:00-02:00 @ 400)
  const multiSport = getVenueById(createdVenue.id)!;
  const offPeakMulti = getEffectiveHourlyPrice(multiSport, '12:00');
  const peak1Multi = getEffectiveHourlyPrice(multiSport, '19:00');
  const peak2Multi = getEffectiveHourlyPrice(multiSport, '23:30');
  const peak2MultiEarly = getEffectiveHourlyPrice(multiSport, '01:30');

  assert(offPeakMulti === 300, '4.5 Multi-sport off-peak (12:00) returns default rate (300 EGP)');
  assert(peak1Multi === 350, '4.6 Multi-sport Peak 1 (19:00) returns rate 1 (350 EGP)');
  assert(peak2Multi === 400, '4.7 Multi-sport Peak 2 midnight wrap (23:30) returns rate 2 (400 EGP)');
  assert(peak2MultiEarly === 400, '4.8 Multi-sport Peak 2 early morning wrap (01:30) returns rate 2 (400 EGP)');

  console.log('');

  // ---------------------------------------------------------------
  // SUITE 5: Deletion & Active Booking Safety
  // ---------------------------------------------------------------
  console.log('--- SUITE 5: Deletion & Active Booking Safety ---');

  // Check Active Bookings Safety logic (DeleteVenueModal logic)
  const allBookings = getBookings();
  const arena1Bookings = allBookings.filter(b => b.venueId === 'arena-1' && b.status !== 'Cancelled');
  assert(arena1Bookings.length >= 2, '5.1 Safety Check: Arena 1 has active bookings detected');

  // Delete created venue
  deleteVenue(createdVenue.id);
  const remainingVenues = getVenues();
  const deletedFetch = getVenueById(createdVenue.id);

  assert(!deletedFetch, '5.2 Deletion: getVenueById returns undefined for deleted venue');
  assert(remainingVenues.length === initialSeedCount, `5.3 Deletion: Store length restored to initial seed count (${initialSeedCount})`);

  console.log('');
  console.log('====================================================');
  console.log(`   TEST SUMMARY: ${passedTests}/${totalTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runEmpiricalTests();
