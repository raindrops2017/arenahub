import { queryOptions, useQuery } from '@tanstack/react-query';
import { bookingApi } from '@/services/api/bookingApi';
import { walletApi } from '@/services/api/walletApi';
import { getStoredToken } from '@/services/api/apiClient';
import { Booking, Wallet, WalletTransaction } from '@/types';

export const bookingQueries = {
  all: () => ['bookings'] as const,
  userList: () =>
    queryOptions({
      queryKey: [...bookingQueries.all(), 'user', 'list'],
      queryFn: async (): Promise<Booking[]> => {
        const token = await getStoredToken();
        if (!token) return [];

        try {
          const res = await bookingApi.getMyBookings();
          const bookings = (res as any)?.data || res;
          return Array.isArray(bookings) ? bookings : [];
        } catch (err: any) {
          if (err?.status !== 401 && err?.status !== 403) {
            console.warn('[bookingQueries] Could not fetch live bookings:', err?.message || err);
          }
          return [];
        }
      },
      staleTime: 1000 * 20, // 20 seconds
      gcTime: 1000 * 60 * 10,
    }),
  wallet: (userId?: string) =>
    queryOptions({
      queryKey: ['wallet', userId ?? 'current'],
      queryFn: async (): Promise<Wallet | null> => {
        if (!userId) return null;
        const token = await getStoredToken();
        if (!token) {
          return {
            _id: `wallet_${userId}`,
            userId,
            balance: 0,
          };
        }

        try {
          return await walletApi.getMyWallet(userId);
        } catch (err: any) {
          if (err?.status !== 401 && err?.status !== 403) {
            console.warn('[bookingQueries] Could not fetch live wallet:', err?.message || err);
          }
          return {
            _id: `wallet_${userId}`,
            userId,
            balance: 0,
          };
        }
      },
      enabled: !!userId,
      staleTime: 1000 * 20,
    }),
  transactions: () =>
    queryOptions({
      queryKey: ['wallet', 'transactions'],
      queryFn: async (): Promise<WalletTransaction[]> => {
        const token = await getStoredToken();
        if (!token) return [];

        try {
          return await walletApi.getTransactions();
        } catch {
          return [];
        }
      },
      staleTime: 1000 * 20,
    }),
};

export function useUserBookings() {
  return useQuery(bookingQueries.userList());
}

export function useCustomerWallet(userId?: string) {
  return useQuery(bookingQueries.wallet(userId));
}

export function useWalletTransactions() {
  return useQuery(bookingQueries.transactions());
}
