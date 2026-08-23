import { create } from "zustand";
import { UserProfile } from "../schemas/auth.schema";
import {
  getStoredToken,
  setStoredTokens,
  removeStoredToken,
} from "@/services/api/apiClient";
import { authApi } from "@/services/api/authApi";
import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_PROFILE_KEY = "ahub_user_profile_data";

interface SessionState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initializeSession: () => Promise<void>;
  setSession: (token: string, user: UserProfile, refreshToken?: string) => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
  clearSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initializeSession: async () => {
    try {
      const token = await getStoredToken();
      if (!token) {
        set({ token: null, user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      // Try fetching live profile from NestJS server
      try {
        const liveUser = await authApi.getProfile();
        if (liveUser) {
          const profile: UserProfile = {
            _id: liveUser._id,
            id: liveUser._id,
            userName: liveUser.userName,
            name: liveUser.userName,
            email: liveUser.email,
            phone: liveUser.phone,
            avatar: liveUser.avatar,
            position: liveUser.position || "CAM",
            favoritePosition: liveUser.position || "CAM",
            walletBalance: liveUser.walletBalance || 0,
            provider: (liveUser.provider as any) || "google",
            preferredFoot: "RIGHT",
            jerseyNumber: "10",
            rating: 4.9,
            totalBookings: 0,
          };
          await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
          set({
            token,
            user: profile,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      } catch (profileErr: any) {
        console.warn("[Session] Could not fetch live profile:", profileErr?.message || profileErr);
        // If token is invalid or expired, purge it immediately
        if (
          profileErr?.statusCode === 401 ||
          profileErr?.message?.includes("Invalid or expired token") ||
          profileErr?.message?.includes("Unauthorized")
        ) {
          await removeStoredToken();
          await AsyncStorage.removeItem(USER_PROFILE_KEY);
          set({ token: null, user: null, isAuthenticated: false, isLoading: false });
          return;
        }
      }

      // If offline or network error, fallback to cached profile JSON if available
      const cachedProfileJson = await AsyncStorage.getItem(USER_PROFILE_KEY);
      if (cachedProfileJson) {
        try {
          const cachedUser: UserProfile = JSON.parse(cachedProfileJson);
          set({
            token,
            user: cachedUser,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        } catch {
          // ignore corrupted cache
        }
      }

      await removeStoredToken();
      await AsyncStorage.removeItem(USER_PROFILE_KEY);
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    } catch {
      await removeStoredToken();
      await AsyncStorage.removeItem(USER_PROFILE_KEY);
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setSession: async (token: string, user: UserProfile, refreshToken?: string) => {
    await setStoredTokens(token, refreshToken);
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  updateUser: async (updates: Partial<UserProfile>) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updates };
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  clearSession: async () => {
    await removeStoredToken();
    await AsyncStorage.removeItem(USER_PROFILE_KEY);
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },

  refreshProfile: async () => {
    try {
      const liveUser = await authApi.getProfile();
      if (liveUser) {
        const profile: UserProfile = {
          _id: liveUser._id,
          id: liveUser._id,
          userName: liveUser.userName,
          name: liveUser.userName,
          email: liveUser.email,
          phone: liveUser.phone,
          avatar: liveUser.avatar,
          position: liveUser.position || "CAM",
          favoritePosition: liveUser.position || "CAM",
          walletBalance: liveUser.walletBalance || 0,
          provider: liveUser.provider as any || "google",
          preferredFoot: "RIGHT",
          jerseyNumber: "10",
          rating: 4.9,
          totalBookings: 0,
        };
        await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
        set({ user: profile });
      }
    } catch (err) {
      console.warn("[Session] refreshProfile failed:", err);
    }
  },
}));
