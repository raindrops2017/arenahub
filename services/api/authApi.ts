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
   * Hits `GET /api/v1/users/customer/profile`.
   */
  async getProfile(): Promise<CustomerUser> {
    const res = await apiRequest<any>('users/customer/profile', {
      method: 'GET',
    });
    return res?.data || res;
  },

  /**
   * Updates current authenticated customer profile.
   * Hits `PATCH /api/v1/users/customer/profile`.
   */
  async updateProfile(data: {
    userName?: string;
    phone?: string;
    position?: string;
    avatar?: any;
  }): Promise<CustomerUser> {
    if (data.avatar && typeof data.avatar === 'object' && data.avatar.uri) {
      const formData = new FormData();
      if (data.userName) formData.append('userName', data.userName);
      if (data.phone) formData.append('phone', data.phone);
      if (data.position) formData.append('position', data.position);

      const fileUri = data.avatar.uri;
      const filename = fileUri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('avatar', {
        uri: fileUri,
        name: filename,
        type: type,
      } as any);

      const res = await apiRequest<{ message: string; data: CustomerUser }>('users/customer/profile', {
        method: 'PATCH',
        body: formData,
      });
      return res?.data || (res as any);
    }

    const res = await apiRequest<{ message: string; data: CustomerUser }>('users/customer/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res?.data || (res as any);
  },

  /**
   * Logs out the user locally by clearing stored tokens.
   */
  async logout(): Promise<void> {
    await removeStoredToken();
  },
};
