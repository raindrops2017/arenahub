import { queryOptions, useQuery } from '@tanstack/react-query';
import { venueApi } from '@/services/api/venueApi';
import { VenueSchema, Venue } from '../schemas/venue.schema';

export const venueQueries = {
  all: () => ['venues'] as const,
  lists: () => [...venueQueries.all(), 'list'] as const,
  list: (category?: string) =>
    queryOptions({
      queryKey: [...venueQueries.lists(), category ?? 'ALL'],
      queryFn: async (): Promise<Venue[]> => {
        const sportFilter = category && category !== 'ALL' ? category : undefined;
        const liveVenues = await venueApi.getVenues(sportFilter);
        return (liveVenues || []).map((v) => VenueSchema.parse(v));
      },
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: [...venueQueries.all(), 'detail', id],
      queryFn: async (): Promise<Venue> => {
        const liveVenue = await venueApi.getVenueById(id);
        return VenueSchema.parse(liveVenue);
      },
      staleTime: 1000 * 60 * 2,
    }),
};

export function useVenues(category?: string) {
  return useQuery(venueQueries.list(category));
}

export function useVenue(id: string) {
  return useQuery(venueQueries.detail(id));
}
