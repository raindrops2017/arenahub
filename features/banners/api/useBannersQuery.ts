import { useEffect } from 'react';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { advertisementApi, DashboardAdResponse } from '@/services/api/advertisementApi';
import { API_BASE_URL } from '@/services/api/apiClient';
import { DEFAULT_PROMO_BANNERS } from '@/services/storageService';
import { socketService } from '@/services/api/socketService';
import { AdBanner, AdActionType } from '@/types';

export function resolveImageUrl(url?: string): string {
  if (!url) {
    return 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80';
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // If backend image url has localhost/127.0.0.1, adjust to API_BASE_URL host for mobile device compatibility
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

export function normalizeAdBanner(ad: DashboardAdResponse, idx: number): AdBanner {
  const statusStr = String(ad.status || '').toLowerCase();
  const isActive = statusStr === 'active' || statusStr === '' || ad.status === undefined;

  let actionType: AdActionType = 'NONE';
  if (ad.linkUrl) {
    if (ad.linkUrl === '/contact' || ad.linkUrl.includes('contact')) {
      actionType = 'CONTACT_US';
    } else if (ad.linkUrl.startsWith('http://') || ad.linkUrl.startsWith('https://')) {
      actionType = 'EXTERNAL_LINK';
    } else if (ad.linkUrl.startsWith('pitch/') || ad.linkUrl.startsWith('/pitch/')) {
      actionType = 'PITCH_DETAIL';
    } else {
      actionType = 'EXTERNAL_LINK';
    }
  }

  return {
    id: ad._id || (ad as any).id || `ad-${idx}`,
    title: ad.title || 'Special Promotion',
    subtitle: ad.description || '',
    imageUrl: resolveImageUrl(ad.image),
    displayDuration: Number(ad.displayDuration || ad.durationMinutes || 5),
    actionType,
    actionValue: ad.linkUrl || '',
    order: Number(ad.priority ?? idx + 1),
    status: isActive ? 'Active' : 'Inactive',
    startDate: ad.startDate,
    endDate: ad.endDate,
    durationMinutes: ad.durationMinutes,
  };
}

export function isAdActiveAndNotExpired(banner: AdBanner): boolean {
  if (banner.status !== 'Active') return false;
  const now = Date.now();
  if (banner.endDate) {
    const end = new Date(banner.endDate).getTime();
    if (!isNaN(end) && end <= now) {
      return false; // Expired by timeout
    }
  }
  if (banner.startDate) {
    const start = new Date(banner.startDate).getTime();
    if (!isNaN(start) && start > now) {
      return false; // Future scheduled ad
    }
  }
  return true;
}

export const bannerQueries = {
  all: () => ['banners'] as const,
  list: () =>
    queryOptions({
      queryKey: [...bannerQueries.all(), 'dashboard_top'],
      queryFn: async (): Promise<AdBanner[]> => {
        try {
          const ads = await advertisementApi.getDashboardAdvertisements('DASHBOARD_TOP');
          if (Array.isArray(ads) && ads.length > 0) {
            const normalized = ads.map(normalizeAdBanner);
            const activeOnly = normalized.filter(isAdActiveAndNotExpired);
            if (activeOnly.length > 0) {
              return activeOnly.sort((a, b) => a.order - b.order);
            }
          }
        } catch (err) {
          console.warn('[useBannersQuery] Error fetching live advertisements:', err);
        }
        return DEFAULT_PROMO_BANNERS;
      },
      placeholderData: (previousData) => previousData ?? DEFAULT_PROMO_BANNERS,
      staleTime: 1000 * 60 * 5, // 5 minutes fresh window
      gcTime: 1000 * 60 * 30,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    }),
};

export function useBanners() {
  const queryClient = useQueryClient();
  const query = useQuery(bannerQueries.list());

  useEffect(() => {
    // Real-time synchronization via Socket.IO without polling overhead
    const unsubscribe = socketService.onAdvertisementsUpdated((data) => {
      console.log('[useBanners] Received real-time advertisements_updated event:', data);
      queryClient.invalidateQueries({ queryKey: bannerQueries.all() });
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  return query;
}
