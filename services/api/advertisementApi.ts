import { apiRequest } from './apiClient';

export interface DashboardAdResponse {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  image: string;
  linkUrl?: string;
  position?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  durationMinutes?: number;
  displayDuration?: number;
  priority?: number;
  impressions?: number;
  clicks?: number;
}

function extractAdsList(res: any): DashboardAdResponse[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.docs)) return res.docs;
  if (Array.isArray(res.advertisements)) return res.advertisements;
  if (Array.isArray(res.banners)) return res.banners;
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.docs)) return res.data.docs;
  if (res.data && Array.isArray(res.data.advertisements)) return res.data.advertisements;
  return [];
}

export const advertisementApi = {
  /**
   * Retrieves active dashboard promotional advertisements by position with fallback.
   * Hits `GET /api/v1/advertisements/dashboard` and falls back to `GET /api/v1/advertisements`.
   */
  async getDashboardAdvertisements(position: string = 'DASHBOARD_TOP'): Promise<DashboardAdResponse[]> {
    // 1. Try dedicated dashboard endpoint
    try {
      const res = await apiRequest<any>('advertisements/dashboard', {
        method: 'GET',
        params: position ? { position } : undefined,
        skipAuth: true,
      });
      const list = extractAdsList(res);
      if (list.length > 0) {
        return list;
      }
    } catch {
      // Fallback
    }

    // 2. Fallback to general advertisements endpoint
    try {
      const res = await apiRequest<any>('advertisements', {
        method: 'GET',
        params: { limit: 100 },
        skipAuth: true,
      });
      const list = extractAdsList(res);
      if (list.length > 0) {
        return list.filter((ad) => !ad.position || ad.position === position || ad.position === 'DASHBOARD_TOP');
      }
    } catch {
      // Return empty array
    }

    return [];
  },

  /**
   * Records a user view/impression for an advertisement safely.
   * Hits `POST /api/v1/advertisements/:id/impression`.
   */
  async recordImpression(id: string): Promise<{ success: boolean }> {
    try {
      return await apiRequest<{ success: boolean }>(`advertisements/${id}/impression`, {
        method: 'POST',
      });
    } catch {
      // Impression tracking failure must never interrupt UI
      return { success: false };
    }
  },

  /**
   * Records a user click on an advertisement safely.
   * Hits `POST /api/v1/advertisements/:id/click`.
   */
  async recordClick(id: string): Promise<{ success: boolean }> {
    try {
      return await apiRequest<{ success: boolean }>(`advertisements/${id}/click`, {
        method: 'POST',
      });
    } catch {
      // Click tracking failure must never interrupt navigation
      return { success: false };
    }
  },
};

export default advertisementApi;
