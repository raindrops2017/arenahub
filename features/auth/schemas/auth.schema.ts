import { z } from "zod";

export const AuthProviderSchema = z.enum(["google", "system"]);
export type AuthProvider = z.infer<typeof AuthProviderSchema>;

export const UserProfileSchema = z.object({
  _id: z.string().optional(),
  id: z.string().optional(),
  userName: z.string().default("Arena Player"),
  name: z.string().optional(),
  email: z.string().default(""),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  position: z.string().default("CAM"),
  favoritePosition: z.string().optional(),
  walletBalance: z.number().default(0),
  provider: AuthProviderSchema.default("google"),
  preferredFoot: z.string().default("RIGHT"),
  jerseyNumber: z.string().default("10"),
  rating: z.number().default(4.9),
  totalBookings: z.number().default(0),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const WalletTransactionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["DEPOSIT", "DEDUCTION", "BOOKING_PAYMENT", "BOOKING_REFUND", "TOP_UP", "REFUND"]),
  amount: z.number(),
  date: z.string().optional(),
  description: z.string().optional(),
  referenceId: z.string().optional(),
  balanceBefore: z.number().optional(),
  balanceAfter: z.number().optional(),
});
export type WalletTransaction = z.infer<typeof WalletTransactionSchema>;

export const WalletSchema = z.object({
  _id: z.string().optional(),
  id: z.string().optional(),
  userId: z.string().optional(),
  customerId: z.string().optional(),
  balance: z.number().default(0),
  currency: z.string().default("EGP"),
  transactions: z.array(WalletTransactionSchema).default([]),
});
export type Wallet = z.infer<typeof WalletSchema>;
