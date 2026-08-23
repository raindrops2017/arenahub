import { apiRequest } from './apiClient';
import { Venue } from '@/types';

export const venueApi = {
  /**
   * Retrieves active sports venues from NestJS backend with presigned S3 photo URLs.
   * Hits `GET /api/v1/venue`.
   */
  async getVenues(sportsType?: string): Promise<Venue[]> {
    const params: Record<string, any> = {};
    if (sportsType && sportsType !== 'ALL') {
      params.sportsType = sportsType;
    }

    return await apiRequest<Venue[]>('venue', {
      method: 'GET',
      params,
      skipAuth: true,
    });
  },

  /**
   * Retrieves comprehensive venue details by MongoDB ObjectId.
   * Hits `GET /api/v1/venue/:id`.
   */
  async getVenueById(id: string): Promise<Venue> {
    return await apiRequest<Venue>(`venue/${id}`, {
      method: 'GET',
      skipAuth: true,
    });
  },
};
