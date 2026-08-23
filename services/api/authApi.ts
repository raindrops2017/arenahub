import { apiRequest, setStoredTokens, removeStoredToken } from './apiClient';
import { CustomerUser, ProviderEnum } from '@/types';

export interface GoogleAuthResponse {
  user: CustomerUser;
  accessToken: string;
  refreshToken?: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string;
  user?: CustomerUser;
}

export const authApi = {
  /**
   * Authenticate with backend using Google OAuth 2.0 ID token.
   * Directly hits `POST /api/v1/auth/signup-google`.
   */
  async signUpWithGoogle(
    idToken: string,
    userName?: string,
    email?: string
  ): Promise<GoogleAuthResponse> {
    const res = await apiRequest<GoogleAuthResponse>('auth/signup-google', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({
        idToken,
        userName,
        email,
        provider: ProviderEnum.google,
      }),
    });

    if (res?.accessToken) {
      await setStoredTokens(res.accessToken, res.refreshToken);
    }

    return res;
  },

  /**
   * Refreshes access token using refresh token.
   * Hits `POST /api/v1/auth/refresh-token`.
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const res = await apiRequest<RefreshTokenResponse>('auth/refresh-token', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ refreshToken }),
    });

    if (res?.accessToken) {
      await setStoredTokens(res.accessToken, res.refreshToken);
    }

    return res;
  },

  /**
   * Retrieves current authenticated customer user profile.
   * Hits `GET /api/v1/users/profile`.
   */
  async getProfile(): Promise<CustomerUser> {
    return await apiRequest<CustomerUser>('users/profile', {
      method: 'GET',
    });
  },

  /**
   * Logs out the user locally by clearing stored tokens.
   */
  async logout(): Promise<void> {
    await removeStoredToken();
  },
};
