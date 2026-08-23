import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const AUTH_TOKEN_KEY = 'ahub_jwt_access_token';
export const REFRESH_TOKEN_KEY = 'ahub_jwt_refresh_token';
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Cross-platform secure token helpers
export async function getStoredToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  }
}

export async function getStoredRefreshToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  }
}

export async function setStoredToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    }
  } catch {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}

export async function setStoredTokens(accessToken: string, refreshToken?: string): Promise<void> {
  await setStoredToken(accessToken);
  if (refreshToken) {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      } else {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      }
    } catch {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }
}

export async function removeStoredToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  } catch {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  idempotencyKey?: string;
  skipAuth?: boolean;
}

class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

export { ApiError };

// Mutex to prevent multiple concurrent refresh requests
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * Universal API request wrapper that attaches JWT bearer tokens,
 * handles automatic 401 token refresh retry, response unwrapping (`res.data`), and formats errors.
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, idempotencyKey, skipAuth = false, headers = {}, ...customConfig } = options;

  let url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;

  if (params) {
    const query = Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (query) {
      url += (url.includes('?') ? '&' : '?') + query;
    }
  }

  console.log('Requested Url  ' + url);

  const reqHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string>),
  };

  // Only set Content-Type to JSON if body is not FormData
  if (!(customConfig.body instanceof FormData) && !reqHeaders['Content-Type']) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  if (!skipAuth) {
    const token = await getStoredToken();
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  if (idempotencyKey) {
    reqHeaders['idempotency-key'] = idempotencyKey;
  }

  try {
    const response = await fetch(url, {
      ...customConfig,
      headers: reqHeaders,
    });

    // Handle 401 Unauthorized -> Attempt Silent Refresh
    if (response.status === 401 && !skipAuth && !endpoint.includes('auth/refresh-token') && !endpoint.includes('auth/signup-google')) {
      const refreshToken = await getStoredRefreshToken();

      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshUrl = `${API_BASE_URL.replace(/\/+$/, '')}/auth/refresh-token`;
            const refreshResponse = await fetch(refreshUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });

            const refreshJson = await refreshResponse.json();
            const newAccessToken = refreshJson?.data?.accessToken;
            const newRefreshToken = refreshJson?.data?.refreshToken;

            if (newAccessToken) {
              await setStoredTokens(newAccessToken, newRefreshToken);
              onRefreshed(newAccessToken);
              isRefreshing = false;

              // Retry original request
              reqHeaders['Authorization'] = `Bearer ${newAccessToken}`;
              const retryRes = await fetch(url, { ...customConfig, headers: reqHeaders });
              const retryIsJson = retryRes.headers.get('content-type')?.includes('application/json');
              const retryResult = retryIsJson ? await retryRes.json() : await retryRes.text();

              if (retryRes.ok) {
                if (retryResult && typeof retryResult === 'object' && 'data' in retryResult && retryResult.data !== undefined) {
                  return retryResult.data as T;
                }
                return retryResult as T;
              }
            } else {
              isRefreshing = false;
              await removeStoredToken();
            }
          } catch {
            isRefreshing = false;
            await removeStoredToken();
          }
        } else {
          // Wait for token refresh to complete
          return new Promise<T>((resolve, reject) => {
            subscribeTokenRefresh(async (newToken) => {
              try {
                reqHeaders['Authorization'] = `Bearer ${newToken}`;
                const retryRes = await fetch(url, { ...customConfig, headers: reqHeaders });
                const retryIsJson = retryRes.headers.get('content-type')?.includes('application/json');
                const retryResult = retryIsJson ? await retryRes.json() : await retryRes.text();
                if (retryRes.ok) {
                  if (retryResult && typeof retryResult === 'object' && 'data' in retryResult && retryResult.data !== undefined) {
                    resolve(retryResult.data as T);
                  } else {
                    resolve(retryResult as T);
                  }
                } else {
                  reject(new ApiError(retryResult?.message || 'Unauthorized retry failed', retryRes.status, retryResult));
                }
              } catch (e) {
                reject(e);
              }
            });
          });
        }
      }
    }

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const result = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorMessage =
        (typeof result === 'object' && result?.message)
          ? (Array.isArray(result.message) ? result.message.join(', ') : result.message)
          : `HTTP error ${response.status}`;
      throw new ApiError(errorMessage, response.status, result);
    }

    // Global response unwrapping for NestJS format: { success, statusCode, message, data }
    if (result && typeof result === 'object' && 'data' in result && result.data !== undefined) {
      return result.data as T;
    }

    return result as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Network request failed', 0);
  }
}

export function resolveImageUrl(url?: string): string {
  if (!url) {
    return 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80';
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      try {
        const apiParsed = new URL(API_BASE_URL);
        const imgParsed = new URL(url);
        imgParsed.protocol = apiParsed.protocol;
        imgParsed.host = apiParsed.host;
        return imgParsed.toString();
      } catch {
        return url;
      }
    }
    return url;
  }
  const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  return `${apiOrigin}/${url.replace(/^\/+/, '')}`;
}

