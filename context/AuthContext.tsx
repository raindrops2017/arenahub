import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useSessionStore } from '@/features/auth/stores/useSessionStore';
import { UserProfile } from '@/features/auth/schemas/auth.schema';
import { authApi } from '@/services/api/authApi';
import { CustomerUser, PaymentMethodEnum } from '@/types';

export type { UserProfile };

export interface PendingBooking {
  venueId: string;
  venueName?: string;
  date: string;
  slots?: Array<{ startTime: number; endTime: number }>;
  startTime?: number;
  endTime?: number;
  price: number;
  paymentMethod?: PaymentMethodEnum;
  couponCode?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  pendingBooking: PendingBooking | null;
  setPendingBooking: (booking: PendingBooking | null) => void;
  signInWithGoogle: () => Promise<boolean>;
  loginWithGoogle: (
    idToken: string,
    userName?: string,
    email?: string
  ) => Promise<boolean>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const storeUser = useSessionStore((s) => s.user);
  const storeIsAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const storeIsLoading = useSessionStore((s) => s.isLoading);
  const initializeSession = useSessionStore((s) => s.initializeSession);
  const setSession = useSessionStore((s) => s.setSession);
  const updateUserStore = useSessionStore((s) => s.updateUser);
  const clearSession = useSessionStore((s) => s.clearSession);
  const refreshProfileStore = useSessionStore((s) => s.refreshProfile);

  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  /**
   * Direct Google OAuth Sign-In / Sign-Up with Verified ID Token
   */
  const loginWithGoogle = useCallback(
    async (
      idToken: string,
      userName?: string,
      email?: string
    ): Promise<boolean> => {
      try {
        const response = await authApi.signUpWithGoogle(idToken, userName, email);
        if (response?.accessToken && response?.user) {
          const u: CustomerUser = response.user;
          const profile: UserProfile = {
            _id: u._id,
            id: u._id,
            userName: u.userName,
            name: u.userName,
            email: u.email,
            phone: u.phone,
            avatar: u.avatar,
            position: u.position || 'CAM',
            favoritePosition: u.position || 'CAM',
            walletBalance: u.walletBalance ?? 0,
            provider: (u.provider as any) || 'google',
            preferredFoot: 'RIGHT',
            jerseyNumber: '10',
            rating: 4.9,
            totalBookings: 0,
          };
          await setSession(response.accessToken, profile, response.refreshToken);
          return true;
        }
        return false;
      } catch (err: any) {
        console.error('[AuthContext] Google Login Failed:', err?.message || err);
        throw err;
      }
    },
    [setSession]
  );

  /**
   * Native Google Sign-In SDK Authentication Flow
   */
  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    try {
      const webClientId =
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
        process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

      GoogleSignin.configure({
        webClientId,
        offlineAccess: true,
        scopes: ['profile', 'email'],
      });

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const response = await GoogleSignin.signIn();

      if (response.type === 'cancelled') {
        return false;
      }

      const { data } = response;

      if (data?.idToken) {
        return await loginWithGoogle(
          data.idToken,
          data.user?.name ?? undefined,
          data.user?.email ?? undefined
        );
      }

      return false;
    } catch (err: any) {
      if (
        err?.code === statusCodes.SIGN_IN_CANCELLED ||
        err?.code === '13' ||
        err?.code === 'SIGN_IN_CANCELLED'
      ) {
        return false;
      }
      console.error('[AuthContext] signInWithGoogle Error:', err?.message || err);
      throw err;
    }
  }, [loginWithGoogle]);

  const updateProfile = useCallback(
    async (data: Partial<UserProfile> & { avatar?: any }) => {
      try {
        const updated = await authApi.updateProfile({
          userName: data.userName || data.name,
          phone: data.phone,
          position: data.position || data.favoritePosition,
          avatar: data.avatar,
        });
        if (updated) {
          await updateUserStore({
            ...data,
            userName: updated.userName || data.userName || data.name,
            name: updated.userName || data.userName || data.name,
            phone: updated.phone || data.phone,
            position: updated.position || data.position,
            favoritePosition: updated.position || data.favoritePosition,
            avatar: updated.avatar || data.avatar,
          });
        } else {
          await updateUserStore(data);
        }
      } catch (err) {
        console.error('[AuthContext] updateProfile failed:', err);
        throw err;
      }
    },
    [updateUserStore]
  );

  const refreshProfile = useCallback(async () => {
    await refreshProfileStore();
  }, [refreshProfileStore]);

  const logout = useCallback(async () => {
    try {
      await GoogleSignin.signOut().catch(() => {});
    } catch {
      // Ignore signOut errors if not signed in via GoogleSignin
    }
    await clearSession();
    await authApi.logout();
  }, [clearSession]);

  const value = useMemo<AuthContextType>(
    () => ({
      isAuthenticated: storeIsAuthenticated,
      isLoading: storeIsLoading,
      user: storeUser,
      pendingBooking,
      setPendingBooking,
      signInWithGoogle,
      loginWithGoogle,
      updateProfile,
      refreshProfile,
      logout,
    }),
    [
      storeIsAuthenticated,
      storeIsLoading,
      storeUser,
      pendingBooking,
      setPendingBooking,
      signInWithGoogle,
      loginWithGoogle,
      updateProfile,
      refreshProfile,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
