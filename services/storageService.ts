import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdBanner } from '../types';

export const STORAGE_KEYS = {
  BANNERS: 'app_v1_banners',
  ACTIVE_USER_ID: 'app_v1_active_user_id',
} as const;

export const FALLBACK_ADVERTISE_BANNER: AdBanner = {
  id: 'banner-advertise-with-us',
  title: 'ADVERTISE WITH ARENAHUB',
  subtitle: 'Reach thousands of active sports players daily. Tap to get started!',
  titleAr: 'أعلن مع منصة أريناهب',
  subtitleAr: 'اوصل إلى آلاف اللاعبين وعشاق الرياضة يومياً. اضغط للبدء الآن!',
  imageUrl: require('@/assets/images/fallback_ad_banner.jpg'),
  displayDuration: 7,
  actionType: 'CONTACT_US',
  actionValue: '/contact',
  order: 1,
  status: 'Active',
};

export const DEFAULT_PROMO_BANNERS: AdBanner[] = [
  FALLBACK_ADVERTISE_BANNER,
];

export async function getBannersAsync(): Promise<AdBanner[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BANNERS);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEYS.BANNERS, JSON.stringify(DEFAULT_PROMO_BANNERS));
      return DEFAULT_PROMO_BANNERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PROMO_BANNERS;
  }
}

export async function saveBannersAsync(banners: AdBanner[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.BANNERS, JSON.stringify(banners));
  } catch (err) {
    console.warn('[StorageService] Error saving banners:', err);
  }
}
