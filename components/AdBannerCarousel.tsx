import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  Pressable,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Linking,
  Modal,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/AppText';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { AdBanner } from '@/types';
import { useBanners } from '@/features/banners/api/useBannersQuery';
import { advertisementApi } from '@/services/api/advertisementApi';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

const CAROUSEL_HEIGHT = 185;

export function AdBannerCarousel() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { data: banners = [] } = useBanners();
  const { isArabic } = useLanguage();
  const { colors, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modalBanner, setModalBanner] = useState<AdBanner | null>(null);
  const flatListRef = useRef<FlatList<AdBanner>>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordedImpressions = useRef<Set<string>>(new Set());

  // Record impression for active banner
  const trackImpression = useCallback((bannerId: string) => {
    if (!bannerId || recordedImpressions.current.has(bannerId)) return;
    recordedImpressions.current.add(bannerId);
    advertisementApi.recordImpression(bannerId).catch(() => {});
  }, []);

  // Record impression for initial banner
  useEffect(() => {
    if (banners && banners.length > 0 && banners[currentIndex]) {
      trackImpression(banners[currentIndex].id);
    }
  }, [currentIndex, banners, trackImpression]);

  // Auto-rotation timer logic using each banner's set displayDuration
  useEffect(() => {
    if (!banners || banners.length <= 1) return;

    const currentBanner = banners[currentIndex];
    const durationMs = (currentBanner?.displayDuration || 5) * 1000;

    timerRef.current = setTimeout(() => {
      const nextIndex = (currentIndex + 1) % banners.length;
      setCurrentIndex(nextIndex);
      try {
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
      } catch {
        // Fallback for scroll failure
      }
    }, durationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, banners]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / windowWidth);
    if (index >= 0 && index < banners.length && index !== currentIndex) {
      setCurrentIndex(index);
      if (banners[index]) {
        trackImpression(banners[index].id);
      }
    }
  };

  const handleBannerPress = (banner: AdBanner) => {
    // Record click analytics
    if (banner.id) {
      advertisementApi.recordClick(banner.id).catch(() => {});
    }

    if (!banner.actionType || banner.actionType === 'NONE') return;

    if (banner.actionType === 'CONTACT_US') {
      router.push('/contact' as any);
    } else if (banner.actionType === 'EXTERNAL_LINK' && banner.actionValue) {
      Linking.openURL(banner.actionValue).catch((err) =>
        console.error('Failed to open URL:', err)
      );
    } else if (banner.actionType === 'PITCH_DETAIL' && banner.actionValue) {
      router.push({
        pathname: '/pitch/[id]',
        params: { id: banner.actionValue },
      });
    } else if (banner.actionType === 'INFO_MODAL') {
      setModalBanner(banner);
    }
  };

  if (!banners || banners.length === 0) return null;

  const getBannerTitle = (banner: AdBanner) => {
    if (isArabic) {
      if (banner.titleAr) return banner.titleAr;
      if (banner.id === 'banner-advertise-with-us' || banner.actionType === 'CONTACT_US') {
        return 'أعلن مع منصة أريناهب';
      }
    }
    return banner.title;
  };

  const getBannerSubtitle = (banner: AdBanner) => {
    if (isArabic) {
      if (banner.subtitleAr) return banner.subtitleAr;
      if (banner.id === 'banner-advertise-with-us' || banner.actionType === 'CONTACT_US') {
        return 'اوصل إلى آلاف اللاعبين وعشاق الرياضة يومياً. اضغط للبدء الآن!';
      }
    }
    return banner.subtitle;
  };

  const getActionLabel = (actionType?: string) => {
    if (actionType === 'CONTACT_US') {
      return isArabic ? 'تواصل معنا' : 'Contact Us';
    }
    if (actionType === 'EXTERNAL_LINK') {
      return isArabic ? 'زيارة الرابط' : 'Visit Link';
    }
    if (actionType === 'PITCH_DETAIL') {
      return isArabic ? 'عرض الملعب' : 'View Pitch';
    }
    return isArabic ? 'معرفة المزيد' : 'Learn More';
  };

  return (
    <View className="mb-4" style={{ marginHorizontal: -20 }}>
      {/* Full-Width Carousel Scroll Container */}
      <View style={{ width: windowWidth }}>
        <FlatList
          ref={flatListRef}
          data={banners}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={windowWidth}
          decelerationRate="fast"
          onMomentumScrollEnd={handleScroll}
          getItemLayout={(_, index) => ({
            length: windowWidth,
            offset: windowWidth * index,
            index,
          })}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
              });
            }, 100);
          }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleBannerPress(item)}
              accessibilityRole="button"
              accessibilityLabel={`Banner: ${getBannerTitle(item)}`}
              style={{
                width: windowWidth,
                height: CAROUSEL_HEIGHT,
                backgroundColor: colors.card,
              }}
              className="relative active:opacity-95 overflow-hidden"
            >
              {/* Full-Bleed Banner Image with disk cache */}
              <Image
                source={typeof item.imageUrl === 'string' ? { uri: item.imageUrl } : item.imageUrl}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                style={StyleSheet.absoluteFillObject}
              />

              {/* Top Gradient for Badge Legibility */}
              <LinearGradient
                colors={['rgba(0,0,0,0.65)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 50 }}
              />

              {/* Bottom Dark Gradient Overlay for Crisp Text & Description Readability */}
              <LinearGradient
                colors={['transparent', 'rgba(0, 0, 0, 0.45)', 'rgba(0, 0, 0, 0.92)']}
                locations={[0, 0.42, 1]}
                style={StyleSheet.absoluteFillObject}
              />

              {/* Top Promo Badge */}
              <View
                className={`absolute top-3.5 ${
                  isArabic ? 'right-4 flex-row-reverse' : 'left-4 flex-row'
                } items-center`}
              >
                <View
                  className={`bg-[#22c55e] px-2.5 py-0.5 rounded-full flex-row items-center shadow-md ${
                    isArabic ? 'flex-row-reverse' : ''
                  }`}
                >
                  <FontAwesome5 name="ad" size={9} color="#04060c" />
                  <Text
                    style={isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined}
                    className={`${
                      isArabic ? 'mr-1.5' : 'ml-1.5'
                    } text-[10px] text-[#04060c] font-black tracking-widest uppercase`}
                  >
                    {item.actionType === 'CONTACT_US'
                      ? isArabic
                        ? 'إعلانك هنا'
                        : 'SPONSORED'
                      : isArabic
                      ? 'عرض خاص'
                      : 'PROMO'}
                  </Text>
                </View>
              </View>

              {/* Bottom Content Info Overlay */}
              <View
                className="absolute bottom-3 left-4 right-4"
                style={isArabic ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }}
              >
                <Text
                  style={[
                    {
                      textShadowColor: 'rgba(0, 0, 0, 0.95)',
                      textShadowOffset: { width: 0, height: 1.5 },
                      textShadowRadius: 4,
                    },
                    isArabic
                      ? {
                          fontFamily: 'DroidArabicKufi',
                          textAlign: 'right',
                          writingDirection: 'rtl',
                        }
                      : undefined,
                  ]}
                  className="text-base text-white uppercase tracking-wider font-black"
                  numberOfLines={1}
                >
                  {getBannerTitle(item)}
                </Text>

                {getBannerSubtitle(item) ? (
                  <Text
                    style={[
                      {
                        textShadowColor: 'rgba(0, 0, 0, 0.85)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 3,
                      },
                      isArabic
                        ? {
                            fontFamily: 'DroidArabicKufi',
                            textAlign: 'right',
                            writingDirection: 'rtl',
                          }
                        : undefined,
                    ]}
                    className="text-xs text-slate-200 font-semibold mt-0.5"
                    numberOfLines={2}
                  >
                    {getBannerSubtitle(item)}
                  </Text>
                ) : null}

                {/* Call To Action Button Indicator */}
                {item.actionType && item.actionType !== 'NONE' && (
                  <View
                    className={`flex-row items-center mt-2 px-2.5 py-1 bg-black/40 rounded-full border border-white/20 ${
                      isArabic ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <Text
                      style={isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined}
                      className={`text-[11px] text-[#22c55e] font-extrabold uppercase ${
                        isArabic ? 'ml-1.5' : 'mr-1.5'
                      }`}
                    >
                      {getActionLabel(item.actionType)}
                    </Text>
                    <Ionicons
                      name={isArabic ? 'arrow-back-circle' : 'arrow-forward-circle'}
                      size={14}
                      color="#22c55e"
                    />
                  </View>
                )}
              </View>
            </Pressable>
          )}
        />
      </View>

      {/* Pagination Indicator Dots */}
      {banners.length > 1 && (
        <View className="flex-row justify-center items-center mt-2.5">
          {banners.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <View
                key={index}
                style={{
                  width: isActive ? 22 : 6,
                  height: 5,
                  backgroundColor: isActive ? '#22c55e' : isDark ? '#334155' : '#cbd5e1',
                }}
                className="rounded-full mx-1"
              />
            );
          })}
        </View>
      )}

      {/* Info Modal for INFO_MODAL Banners */}
      <Modal
        visible={!!modalBanner}
        transparent
        animationType="fade"
        onRequestClose={() => setModalBanner(null)}
      >
        <View className="flex-1 justify-center items-center bg-black/70 px-6">
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="w-full rounded-2xl p-5 border shadow-2xl"
          >
            {modalBanner?.imageUrl && (
              <Image
                source={
                  typeof modalBanner.imageUrl === 'string'
                    ? { uri: modalBanner.imageUrl }
                    : modalBanner.imageUrl
                }
                style={{ width: '100%', height: 140, borderRadius: 12 }}
                contentFit="cover"
                className="mb-4"
              />
            )}
            <Text
              style={
                isArabic
                  ? {
                      fontFamily: 'DroidArabicKufi',
                      textAlign: 'right',
                      writingDirection: 'rtl',
                    }
                  : undefined
              }
              className="text-lg font-black uppercase text-foreground mb-1"
            >
              {modalBanner ? getBannerTitle(modalBanner) : ''}
            </Text>
            {modalBanner && getBannerSubtitle(modalBanner) ? (
              <Text
                style={
                  isArabic
                    ? {
                        fontFamily: 'DroidArabicKufi',
                        textAlign: 'right',
                        writingDirection: 'rtl',
                      }
                    : undefined
                }
                className="text-sm text-muted-foreground mb-4"
              >
                {getBannerSubtitle(modalBanner)}
              </Text>
            ) : null}
            <Button
              title={isArabic ? 'إغلاق' : 'Close'}
              onPress={() => setModalBanner(null)}
              variant="default"
              size="default"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

