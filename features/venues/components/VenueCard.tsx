import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Venue } from '../schemas/venue.schema';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

interface VenueCardProps {
  venue: Venue;
  onPress: (id: string) => void;
}

export function VenueCard({ venue, onPress }: VenueCardProps) {
  const { t, isArabic, translateCategory, formatHourSlot } = useLanguage();
  const { colors, isDark } = useTheme();

  const imageUrl =
    (venue.images && venue.images[0]) ||
    (venue.imageUrls && venue.imageUrls[0]) ||
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800';

  const primarySport =
    (venue.sportsType && venue.sportsType[0]) ||
    (venue.sportsTypes && venue.sportsTypes[0]) ||
    'FOOTBALL';

  const venueId = venue._id || venue.id;
  const name = venue.venueName || venue.name;
  const price = venue.defaultHourPrice;

  // Extract amenities list
  const displayAmenities =
    venue.amenityList && venue.amenityList.length > 0
      ? venue.amenityList
      : Object.entries(venue.amenities || {})
          .filter(([_, v]) => Boolean(v))
          .map(([k]) => k.replace(/([A-Z])/g, ' $1').trim());

  return (
    <Pressable
      onPress={() => onPress(venueId)}
      accessibilityRole="button"
      accessibilityLabel={`Select venue ${name}`}
      style={{
        backgroundColor: colors.card,
        borderColor: colors.cardBorder,
      }}
      className="border rounded-3xl overflow-hidden mb-5 active:opacity-90 shadow-sm"
    >
      <View className="relative h-48 w-full bg-[#0c1222]">
        <Image
          source={{ uri: imageUrl }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          style={{ width: '100%', height: '100%' }}
        />
        <View
          className={`absolute top-3 ${
            isArabic ? 'right-3 flex-row-reverse' : 'left-3 flex-row'
          } gap-2`}
        >
          <Badge variant="default" label={translateCategory(primarySport)} />
          <View
            className={`bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full flex-row items-center border border-white/10 ${
              isArabic ? 'flex-row-reverse' : ''
            }`}
          >
            <Ionicons name="time-outline" size={12} color={isDark ? '#22c55e' : '#16a34a'} />
            <Text
              style={{
                fontFamily: isArabic ? 'DroidArabicKufi' : undefined,
                color: '#ffffff',
              }}
              className={`text-xs font-bold ${isArabic ? 'mr-1' : 'ml-1'}`}
            >
              {venue.startWorkingHours !== undefined && venue.endWorkingHours !== undefined
                ? `${formatHourSlot(venue.startWorkingHours)} - ${formatHourSlot(venue.endWorkingHours)}`
                : `${venue.startWorkingHours ?? 8}:00 - ${venue.endWorkingHours ?? 24}:00`}
            </Text>
          </View>
        </View>
      </View>

      <View className="p-4">
        <View
          className={`flex-row justify-between items-start mb-1.5 ${
            isArabic ? 'flex-row-reverse' : ''
          }`}
        >
          <Text
            style={[
              { color: colors.textPrimary },
              isArabic
                ? {
                    fontFamily: 'DroidArabicKufi',
                    textAlign: 'right',
                    writingDirection: 'rtl',
                  }
                : undefined,
            ]}
            className={`font-extrabold text-lg flex-1 ${
              isArabic ? 'ml-2' : 'mr-2'
            }`}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text
            style={{
              color: isDark ? '#22c55e' : '#16a34a',
              fontFamily: isArabic ? 'DroidArabicKufi' : undefined,
            }}
            className="font-black text-lg"
          >
            {price}{' '}
            <Text
              style={{ color: colors.mutedForeground }}
              className="text-xs font-normal"
            >
              {isArabic ? 'ج.م / ساعة' : 'EGP/hr'}
            </Text>
          </Text>
        </View>

        <View
          className={`flex-row items-center mb-3 ${
            isArabic ? 'flex-row-reverse' : ''
          }`}
        >
          <Ionicons name="location-sharp" size={14} color={colors.mutedForeground} />
          <Text
            style={[
              { color: colors.mutedForeground },
              isArabic
                ? {
                    fontFamily: 'DroidArabicKufi',
                    textAlign: 'right',
                    writingDirection: 'rtl',
                  }
                : undefined,
            ]}
            className={`text-xs ${
              isArabic ? 'mr-1' : 'ml-1'
            } flex-1`}
            numberOfLines={1}
          >
            {venue.address}
          </Text>
        </View>

        {displayAmenities.length > 0 && (
          <View
            style={{ borderTopColor: colors.cardBorder }}
            className={`flex-row flex-wrap gap-1.5 pt-2.5 border-t ${
              isArabic ? 'flex-row-reverse' : ''
            }`}
          >
            {displayAmenities.slice(0, 4).map((amenity, idx) => (
              <View
                key={idx}
                style={{
                  backgroundColor: isDark ? '#141d2e' : '#f1f5f9',
                }}
                className="px-2.5 py-1 rounded-lg"
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: isArabic ? 'DroidArabicKufi' : undefined,
                  }}
                  className="text-[10px] font-semibold"
                >
                  {amenity}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}
