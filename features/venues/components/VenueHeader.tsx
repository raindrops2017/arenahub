import React, { useState, useRef } from 'react';
import {
  View,
  Pressable,
  FlatList,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Badge } from '@/components/ui/Badge';
import { Venue } from '../schemas/venue.schema';
import { useLanguage } from '@/context/LanguageContext';
import { resolveImageUrl } from '@/services/api/apiClient';

const HEADER_HEIGHT = 380;

interface VenueHeaderProps {
  venue: Venue;
  onBack: () => void;
  onShare?: () => void;
}

export function VenueHeader({ venue, onBack, onShare }: VenueHeaderProps) {
  const { width: windowWidth } = useWindowDimensions();
  const { isArabic, translateCategory, formatHourSlot } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<string>>(null);

  // Extract all venue images safely
  const rawImages: string[] = [
    ...(Array.isArray(venue.images) ? venue.images : []),
    ...(Array.isArray(venue.imageUrls) ? venue.imageUrls : []),
    ...(typeof (venue as any).image === 'string' ? [(venue as any).image] : []),
  ].filter((img): img is string => Boolean(img) && typeof img === 'string');

  const resolvedImages = Array.from(new Set(rawImages)).map((img) => resolveImageUrl(img));
  const images = resolvedImages.length > 0
    ? resolvedImages
    : ['https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80'];

  const primarySport =
    (venue.sportsType && venue.sportsType[0]) ||
    (venue.sportsTypes && venue.sportsTypes[0]) ||
    'FOOTBALL';

  const name = venue.venueName || venue.name;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / windowWidth);
    if (index >= 0 && index < images.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  return (
    <View style={{ height: HEADER_HEIGHT, width: windowWidth }} className="relative bg-[#0c1222]">
      {/* Swipeable Multi-Image Carousel */}
      <FlatList
        ref={flatListRef}
        data={images}
        keyExtractor={(_, index) => `venue-img-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={windowWidth}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        style={{ width: windowWidth, height: HEADER_HEIGHT }}
        renderItem={({ item, index }) => (
          <View style={{ width: windowWidth, height: HEADER_HEIGHT }}>
            <Image
              source={{ uri: item }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              style={{ width: '100%', height: '100%' }}
              accessibilityLabel={`${name} image ${index + 1}`}
            />
          </View>
        )}
      />

      {/* Top Gradient Overlay (for Header Actions & Counter) */}
      <LinearGradient
        colors={['rgba(4,6,12,0.85)', 'rgba(4,6,12,0.4)', 'transparent']}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          paddingHorizontal: 16,
          paddingTop: 48,
        }}
        pointerEvents="box-none"
      >
        <View
          className={`flex-row justify-between items-center ${isArabic ? 'flex-row-reverse' : ''}`}
          pointerEvents="box-none"
        >
          {/* Back Button */}
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 items-center justify-center active:opacity-70 shadow-md"
          >
            <Ionicons
              name={isArabic ? "chevron-forward" : "chevron-back"}
              size={24}
              color="#ffffff"
            />
          </Pressable>

          {/* Top Right: Image Counter Badge & Share Button */}
          <View
            className={`flex-row items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}
            pointerEvents="box-none"
          >
            {images.length > 1 && (
              <View className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full flex-row items-center border border-white/20 shadow-sm">
                <Ionicons name="images-outline" size={13} color="#22c55e" />
                <Text className="text-white text-xs font-mono font-bold ml-1.5">
                  {activeIndex + 1} / {images.length}
                </Text>
              </View>
            )}

            {onShare && (
              <Pressable
                onPress={onShare}
                accessibilityRole="button"
                accessibilityLabel="Share venue"
                className="h-10 w-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 items-center justify-center active:opacity-70 shadow-md"
              >
                <Ionicons name="share-outline" size={20} color="#ffffff" />
              </Pressable>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Bottom Gradient Overlay (Title, Sports, Hours, Address & Dots) */}
      <LinearGradient
        colors={['transparent', 'rgba(4,6,12,0.6)', '#04060c']}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingBottom: 16,
          paddingTop: 40,
        }}
        pointerEvents="box-none"
      >
        {/* Pagination Dots Indicator */}
        {images.length > 1 && (
          <View
            className={`flex-row mb-3 ${isArabic ? 'justify-end' : 'justify-start'} items-center`}
            pointerEvents="none"
          >
            {images.map((_, idx) => (
              <View
                key={idx}
                style={{
                  width: idx === activeIndex ? 22 : 6,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: idx === activeIndex ? '#22c55e' : 'rgba(255,255,255,0.4)',
                  marginRight: idx === images.length - 1 ? 0 : 5,
                }}
              />
            ))}
          </View>
        )}

        <View className={isArabic ? 'items-end' : 'items-start'} pointerEvents="box-none">
          {/* Sports Pill & Working Hours */}
          <View className={`flex-row gap-2 mb-2 ${isArabic ? 'flex-row-reverse' : ''}`} pointerEvents="box-none">
            <Badge variant="default" label={translateCategory(primarySport)} />
            <View className={`bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full flex-row items-center border border-white/10 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <Ionicons name="time-outline" size={12} color="#22c55e" />
              <Text
                style={isArabic ? { fontFamily: 'DroidKufi_Regular' } : undefined}
                className={`text-white text-xs font-bold ${isArabic ? 'mr-1' : 'ml-1'}`}
              >
                {venue.startWorkingHours !== undefined && venue.endWorkingHours !== undefined
                  ? `${formatHourSlot(venue.startWorkingHours)} - ${formatHourSlot(venue.endWorkingHours)}`
                  : `${venue.startWorkingHours ?? 8}:00 - ${venue.endWorkingHours ?? 24}:00`}
              </Text>
            </View>
          </View>

          {/* Venue Name */}
          <Text
            style={isArabic ? { fontFamily: 'DroidKufi_Regular', textAlign: 'right' } : undefined}
            className="text-white font-black text-2xl tracking-tight drop-shadow-md"
            numberOfLines={2}
          >
            {name}
          </Text>

          {/* Address */}
          <View className={`flex-row items-center mt-1.5 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <Ionicons name="location-sharp" size={14} color="#22c55e" />
            <Text
              style={isArabic ? { fontFamily: 'DroidKufi_Regular', textAlign: 'right' } : undefined}
              className={`text-slate-300 text-xs ${isArabic ? 'mr-1' : 'ml-1'} flex-1 drop-shadow`}
              numberOfLines={1}
            >
              {venue.address}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
