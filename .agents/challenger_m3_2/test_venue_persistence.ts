/**
 * Empirical Test Script: Venue Storage & Persistence Challenger (Milestone 3)
 * Target: D:/test-mobile-app/.agents/challenger_m3_2/test_venue_persistence.ts
 * Executed via: npx tsx
 */

// 1. Setup DOM & Web Storage Environment for Node.js
class EventTargetPolyfill {
  private listeners: { [key: string]: Function[] } = {};

  addEventListener(type: string, listener: Function) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: Function) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
  }

  dispatchEvent(event: any) {
    const type = event.type;
    if (this.listeners[type]) {
      this.listeners[type].forEach((l) => l(event));
    }
    return true;
  }
}

class LocalStoragePolyfill {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }
}

const windowPolyfill = new EventTargetPolyfill();
const localStoragePolyfill = new LocalStoragePolyfill();

(global as any).window = windowPolyfill;
(global as any).localStorage = localStoragePolyfill;
(global as any).CustomEvent = class CustomEvent {
  type: string;
  detail: any;
  constructor(type: string, params?: any) {
    this.type = type;
    this.detail = params?.detail;
  }
};
(global as any).StorageEvent = class StorageEvent {
  key: string | null;
  constructor(type: string, params?: any) {
    this.key = params?.key || null;
  }
};

// 2. Import mockStore after window/localStorage polyfills are installed
import {
  initMockStore,
  getVenues,
  getVenueById,
  addVenue,
  updateVenue,
  deleteVenue,
  saveVenue,
  getBookings,
  subscribeStoreChange,
  STORAGE_KEYS,
  EVENT_NAME,
} from "../../dashboard/src/data/mockStore";

// Test Result Harness
interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, details?: string) {
  if (condition) {
    results.push({ suite, name, passed: true, details });
    console.log(`  ✓ [PASS] ${name}${details ? ` (${details})` : ""}`);
  } else {
    results.push({ suite, name, passed: false, details });
    console.error(`  ✗ [FAIL] ${name}${details ? ` (${details})` : ""}`);
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log(" EMPIRICAL SUITE: VENUE PERSISTENCE & REACTIVE STORAGE");
  console.log("=======================================================\n");

  // Reset Storage
  localStoragePolyfill.clear();

  // -------------------------------------------------------------------
  // SUITE 1: Storage Initialization & Persistence (app_v1_venues)
  // -------------------------------------------------------------------
  console.log("Suite 1: Storage Initialization & Persistence");

  // 1.1 Initial store initialization
  initMockStore();
  const rawVenuesStorage = localStoragePolyfill.getItem(STORAGE_KEYS.VENUES);
  assert(
    rawVenuesStorage !== null && JSON.parse(rawVenuesStorage).length === 4,
    "Suite 1",
    "1.1 initMockStore seeds app_v1_venues in localStorage with 4 venues",
    `Found ${rawVenuesStorage ? JSON.parse(rawVenuesStorage).length : 0} seed venues in storage`
  );

  // 1.2 getVenues reads directly from localStorage
  const venues = getVenues();
  assert(
    venues.length === 4 && venues[0].id === "arena-1",
    "Suite 1",
    "1.2 getVenues returns initial seed venues from localStorage",
    `Count: ${venues.length}, First ID: ${venues[0]?.id}`
  );

  // 1.3 addVenue creates venue and persists to localStorage with normalized schema
  const createdVenue = addVenue({
    name: "AL-AHLY TRAINING PITCH",
    sportsTypes: ["11-A-SIDE", "7-A-SIDE"],
    address: "Gezira Club, Zamalek, Cairo",
    coordinates: { lat: 30.045, lng: 31.224 },
    workingHours: {
      openTime: "06:00 AM",
      closeTime: "11:00 PM",
      daysOpen: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    },
    defaultHourlyPrice: 500,
    customHourlyPrices: [
      { id: 'rate-peak', startHour: "18:00", endHour: "23:00", pricePerHour: 650 },
    ],
    amenities: ["FIFA Turf", "Floodlights", "VIP Locker Rooms"],
    imageUrls: ["https://images.unsplash.com/photo-test-venue"],
    rating: 5.0,
    reviewCount: 1,
    description: "Elite training facility",
    status: "Active",
  });

  const updatedRawStorageAfterAdd = localStoragePolyfill.getItem(STORAGE_KEYS.VENUES);
  const parsedStorageAfterAdd = updatedRawStorageAfterAdd ? JSON.parse(updatedRawStorageAfterAdd) : [];
  const foundInStorage = parsedStorageAfterAdd.find((v: any) => v.id === createdVenue.id);

  assert(
    createdVenue.id.startsWith("venue-") &&
      foundInStorage !== undefined &&
      foundInStorage.name === "AL-AHLY TRAINING PITCH" &&
      foundInStorage.pricing.defaultPricePerHour === 500 &&
      foundInStorage.imageGallery[0] === "https://images.unsplash.com/photo-test-venue",
    "Suite 1",
    "1.3 addVenue persists new venue to localStorage with dual pricing/gallery schema normalization",
    `Created ID: ${createdVenue.id}, Stored name: ${foundInStorage?.name}`
  );

  // 1.4 updateVenue modifies existing record and updates localStorage
  const updatedVenue = updateVenue(createdVenue.id, {
    name: "AL-AHLY GRAND ARENA",
    defaultHourlyPrice: 550,
    status: "Maintenance",
  });

  const rawStorageAfterUpdate = localStoragePolyfill.getItem(STORAGE_KEYS.VENUES);
  const parsedStorageAfterUpdate = rawStorageAfterUpdate ? JSON.parse(rawStorageAfterUpdate) : [];
  const updatedInStorage = parsedStorageAfterUpdate.find((v: any) => v.id === createdVenue.id);
  const retrievedById = getVenueById(createdVenue.id);

  assert(
    updatedVenue.name === "AL-AHLY GRAND ARENA" &&
      updatedInStorage?.name === "AL-AHLY GRAND ARENA" &&
      updatedInStorage?.defaultHourlyPrice === 550 &&
      updatedInStorage?.pricing?.defaultPricePerHour === 550 &&
      updatedInStorage?.status === "Maintenance" &&
      retrievedById?.name === "AL-AHLY GRAND ARENA",
    "Suite 1",
    "1.4 updateVenue persists updated fields & normalized pricing in localStorage",
    `Updated name: ${updatedInStorage?.name}, Stored status: ${updatedInStorage?.status}`
  );

  // 1.5 deleteVenue removes venue from localStorage
  deleteVenue(createdVenue.id);
  const rawStorageAfterDelete = localStoragePolyfill.getItem(STORAGE_KEYS.VENUES);
  const parsedStorageAfterDelete = rawStorageAfterDelete ? JSON.parse(rawStorageAfterDelete) : [];
  const deletedInStorage = parsedStorageAfterDelete.find((v: any) => v.id === createdVenue.id);

  assert(
    deletedInStorage === undefined && parsedStorageAfterDelete.length === 4,
    "Suite 1",
    "1.5 deleteVenue removes target venue from localStorage app_v1_venues",
    `Remaining in storage: ${parsedStorageAfterDelete.length}`
  );

  // -------------------------------------------------------------------
  // SUITE 2: Reactive Event Bus Notifications
  // -------------------------------------------------------------------
  console.log("\nSuite 2: Reactive Event Bus Notifications");

  let notificationCount = 0;
  const unsubscribe = subscribeStoreChange(() => {
    notificationCount++;
  });

  // 2.1 Event triggered on addVenue
  const testReactiveVenue = addVenue({
    name: "REACTIVE TEST ARENA",
    sportsTypes: ["PADEL"],
    address: "New Cairo",
    coordinates: { lat: 30.0, lng: 31.0 },
    workingHours: { openTime: "08:00 AM", closeTime: "12:00 AM", daysOpen: ["Sat", "Sun"] },
    defaultHourlyPrice: 300,
    amenities: ["Parking"],
    imageUrls: [],
    rating: 4.5,
    reviewCount: 5,
    description: "Reactive bus test",
    status: "Active",
  });

  assert(
    notificationCount === 1,
    "Suite 2",
    "2.1 subscribeStoreChange notifies listener when addVenue is called",
    `Notification count: ${notificationCount}`
  );

  // 2.2 Event triggered on updateVenue
  updateVenue(testReactiveVenue.id, { status: "Inactive" });

  assert(
    notificationCount === 2,
    "Suite 2",
    "2.2 subscribeStoreChange notifies listener when updateVenue is called",
    `Notification count: ${notificationCount}`
  );

  // 2.3 Event triggered on deleteVenue
  deleteVenue(testReactiveVenue.id);

  assert(
    notificationCount === 3,
    "Suite 2",
    "2.3 subscribeStoreChange notifies listener when deleteVenue is called",
    `Notification count: ${notificationCount}`
  );

  // 2.4 Unsubscribe stops notifications
  unsubscribe();
  addVenue({
    name: "POST UNSUBSCRIBE ARENA",
    sportsTypes: ["BASKETBALL"],
    address: "Heliopolis",
    coordinates: { lat: 30.1, lng: 31.3 },
    workingHours: { openTime: "08:00 AM", closeTime: "10:00 PM", daysOpen: ["Mon"] },
    defaultHourlyPrice: 200,
    amenities: [],
    imageUrls: [],
    rating: 4.0,
    reviewCount: 1,
    description: "Post unsubscribe test",
    status: "Active",
  });

  assert(
    notificationCount === 3,
    "Suite 2",
    "2.4 Unsubscribing correctly detaches event bus listener",
    `Notification count after new add: ${notificationCount} (expected 3)`
  );

  // Clean up post unsubscribe arena
  const currentVenues = getVenues();
  const lastVenue = currentVenues.find((v) => v.name === "POST UNSUBSCRIBE ARENA");
  if (lastVenue) deleteVenue(lastVenue.id);

  // -------------------------------------------------------------------
  // SUITE 3: Deletion Safety & Active Bookings Inspection
  // -------------------------------------------------------------------
  console.log("\nSuite 3: Deletion Safety & Active Bookings Inspection");

  // Helper function mimicking safety check in DeleteVenueModal
  function getActiveBookingsForVenue(venueId: string) {
    const allBookings = getBookings();
    return allBookings.filter(
      (b) => b.venueId === venueId && b.status !== "Cancelled"
    );
  }

  // 3.1 Check active bookings for arena-1 (has confirmed & completed bookings)
  const arena1Bookings = getActiveBookingsForVenue("arena-1");
  assert(
    arena1Bookings.length > 0,
    "Suite 3",
    "3.1 Detects active/non-cancelled bookings for venue with active reservations (arena-1)",
    `Active bookings count for arena-1: ${arena1Bookings.length}`
  );

  // 3.2 Check active bookings for champions-stadium (has confirmed booking)
  const championsBookings = getActiveBookingsForVenue("champions-stadium");
  assert(
    championsBookings.length === 1 && championsBookings[0].id === "book-2",
    "Suite 3",
    "3.2 Detects confirmed booking for champions-stadium",
    `Active booking ID: ${championsBookings[0]?.id}`
  );

  // 3.3 Check active bookings for a newly created venue without bookings
  const freshVenue = addVenue({
    name: "TEMPORARY SAFE VENUE",
    sportsTypes: ["TENNIS"],
    address: "6th of October",
    coordinates: { lat: 29.9, lng: 30.9 },
    workingHours: { openTime: "09:00 AM", closeTime: "09:00 PM", daysOpen: ["Sun"] },
    defaultHourlyPrice: 250,
    amenities: ["Tennis Court"],
    imageUrls: [],
    rating: 4.2,
    reviewCount: 2,
    description: "No bookings venue",
    status: "Active",
  });

  const freshVenueBookings = getActiveBookingsForVenue(freshVenue.id);
  assert(
    freshVenueBookings.length === 0,
    "Suite 3",
    "3.3 Confirms 0 active bookings for a newly created venue",
    `Active bookings count: ${freshVenueBookings.length}`
  );

  // 3.4 Deletion Safety Guard Evaluation
  const isArena1SafeToDelete = getActiveBookingsForVenue("arena-1").length === 0;
  const isFreshVenueSafeToDelete = getActiveBookingsForVenue(freshVenue.id).length === 0;

  assert(
    isArena1SafeToDelete === false && isFreshVenueSafeToDelete === true,
    "Suite 3",
    "3.4 Deletion safety guard correctly blocks unsafe deletion for arena-1 and allows fresh venue deletion",
    `arena-1 safe: ${isArena1SafeToDelete}, fresh venue safe: ${isFreshVenueSafeToDelete}`
  );

  // Clean up fresh venue
  deleteVenue(freshVenue.id);

  // -------------------------------------------------------------------
  // SUMMARY & VERDICT
  // -------------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(" TEST RESULTS SUMMARY");
  console.log("=======================================================");

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Assertions: ${total}`);
  console.log(`Passed:           ${passed}`);
  console.log(`Failed:           ${failed}`);
  console.log(`Verdict:          ${failed === 0 ? "APPROVE" : "REJECT"}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
