import { z } from "zod";

export const VenueAmenitiesSchema = z.object({
  Parking: z.boolean().optional(),
  Cafeteria: z.boolean().optional(),
  Shower: z.boolean().optional(),
  ChangingRoom: z.boolean().optional(),
  Toilets: z.boolean().optional(),
  WiFi: z.boolean().optional(),
  Lockers: z.boolean().optional(),
  FloodLights: z.boolean().optional(),
  DrinkingWater: z.boolean().optional(),
  FirstAid: z.boolean().optional(),
  PrayerArea: z.boolean().optional(),
  EquipmentRental: z.boolean().optional(),
}).passthrough();

export type VenueAmenities = z.infer<typeof VenueAmenitiesSchema>;

export const CustomHourPriceSchema = z.object({
  hour: z.number(),
  pricePerHour: z.number(),
});
export type CustomHourPrice = z.infer<typeof CustomHourPriceSchema>;

export const TimeSlotSchema = z.object({
  id: z.string().optional(),
  time: z.string(),
  available: z.boolean().default(true),
  price: z.number().optional(),
  startHour24: z.number().optional(),
  endHour24: z.number().optional(),
});
export type TimeSlot = z.infer<typeof TimeSlotSchema>;

export const PitchDateSchema = z.object({
  date: z.string(),
  dayName: z.string().default("TODAY"),
  day: z.string().optional(),
  month: z.string().optional(),
  slots: z.array(TimeSlotSchema).default([]),
});
export type PitchDate = z.infer<typeof PitchDateSchema>;

export const VenueSchema = z.preprocess((input: unknown) => {
  if (typeof input === "object" && input !== null) {
    const raw = input as Record<string, any>;
    const id = String(raw._id || raw.id || "");
    const name = String(raw.venueName || raw.name || "Arena Venue");
    const sports = Array.isArray(raw.sportsType)
      ? raw.sportsType
      : Array.isArray(raw.sportsTypes)
      ? raw.sportsTypes
      : ["Football"];
    const images = Array.isArray(raw.images) && raw.images.length > 0
      ? raw.images
      : Array.isArray(raw.imageUrls) && raw.imageUrls.length > 0
      ? raw.imageUrls
      : ["https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800"];
    
    // Normalize amenities to string array for tags list
    let amenityList: string[] = [];
    if (raw.amenities && typeof raw.amenities === "object" && !Array.isArray(raw.amenities)) {
      amenityList = Object.entries(raw.amenities)
        .filter(([_, v]) => Boolean(v))
        .map(([k]) => k.replace(/([A-Z])/g, " $1").trim());
    } else if (Array.isArray(raw.amenities)) {
      amenityList = raw.amenities;
    }

    return {
      _id: id,
      id,
      venueName: name,
      name,
      sportsType: sports,
      sportsTypes: sports,
      address: String(raw.address || raw.location || "Cairo, Egypt"),
      locationAlt: Number(raw.locationAlt) || 30.0444,
      locationLang: Number(raw.locationLang) || 31.2357,
      images,
      imageUrls: images,
      amenities: raw.amenities || {},
      amenityList: amenityList.length > 0 ? amenityList : ["Floodlights", "Parking"],
      startWorkingHours: Number(raw.startWorkingHours) || 8,
      endWorkingHours: Number(raw.endWorkingHours) || 24,
      WorkingHours: Number(raw.WorkingHours) || (Number(raw.endWorkingHours || 24) - Number(raw.startWorkingHours || 8)),
      defaultHourPrice: Number(raw.defaultHourPrice || raw.pricePerHour || 250),
      customHourPrices: Array.isArray(raw.customHourPrices) ? raw.customHourPrices : [],
      minimumDepositAmount: Number(raw.minimumDepositAmount ?? raw.minDeposit ?? 0),
      isActive: raw.isActive !== undefined ? raw.isActive : true,
      rating: typeof raw.rating === "number" ? raw.rating : 4.9,
      reviewCount: typeof raw.reviewCount === "number" ? raw.reviewCount : 128,
    };
  }
  return input;
}, z.object({
  _id: z.string(),
  id: z.string(),
  venueName: z.string(),
  name: z.string(),
  sportsType: z.array(z.string()),
  sportsTypes: z.array(z.string()),
  address: z.string(),
  locationAlt: z.number(),
  locationLang: z.number(),
  images: z.array(z.string()),
  imageUrls: z.array(z.string()),
  amenities: z.record(z.string(), z.any()),
  amenityList: z.array(z.string()),
  startWorkingHours: z.number(),
  endWorkingHours: z.number(),
  WorkingHours: z.number().optional(),
  defaultHourPrice: z.number(),
  customHourPrices: z.array(CustomHourPriceSchema).optional(),
  minimumDepositAmount: z.number().optional().default(0),
  isActive: z.boolean(),
  rating: z.number().default(4.9),
  reviewCount: z.number().default(128),
}));

export type Venue = z.infer<typeof VenueSchema>;
