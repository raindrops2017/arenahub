import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VenueAmenities as VenueAmenitiesType } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

interface VenueAmenitiesProps {
  amenities?: VenueAmenitiesType | string[] | Record<string, boolean>;
}

export function VenueAmenities({ amenities }: VenueAmenitiesProps) {
  const { t, isArabic } = useLanguage();
  const { colors, isDark } = useTheme();

  if (!amenities) return null;

  // Convert boolean dictionary or array to normalized list
  let amenityList: string[] = [];
  if (Array.isArray(amenities)) {
    amenityList = amenities;
  } else if (typeof amenities === 'object') {
    amenityList = Object.entries(amenities)
      .filter(([_, v]) => Boolean(v))
      .map(([k]) => k.replace(/([A-Z])/g, ' $1').trim());
  }

  if (amenityList.length === 0) return null;

  const translateAmenity = (name: string) => {
    if (!isArabic) return name;
    const lower = name.toLowerCase();
    if (lower.includes('floodlight') || lower.includes('light')) return 'إضاءة ليلية';
    if (lower.includes('shower') || lower.includes('locker') || lower.includes('changing'))
      return 'غرف تبديل ودش';
    if (lower.includes('park') || lower.includes('garage')) return 'موقف سيارات';
    if (lower.includes('cafe') || lower.includes('water') || lower.includes('drink'))
      return 'كافيتريا ومشروبات';
    if (lower.includes('wifi')) return 'واي فاي مجاني';
    if (lower.includes('first aid') || lower.includes('aid')) return 'إسعافات أولية';
    if (lower.includes('toilet') || lower.includes('restroom')) return 'دورات مياه';
    if (lower.includes('ball') || lower.includes('equipment')) return 'تأجير كرات ومعدات';
    if (lower.includes('turf') || lower.includes('grass')) return 'أرضية ترتان احترافية';
    return name;
  };

  const getAmenityIcon = (name: string) => {
    const iconColor = isDark ? '#22c55e' : '#16a34a';
    const lower = name.toLowerCase();
    if (lower.includes('floodlight') || lower.includes('light')) {
      return <Ionicons name="flash-outline" size={18} color={iconColor} />;
    }
    if (lower.includes('locker') || lower.includes('shower') || lower.includes('changing')) {
      return <Ionicons name="shirt-outline" size={18} color={iconColor} />;
    }
    if (lower.includes('park') || lower.includes('garage')) {
      return <Ionicons name="car-outline" size={18} color={iconColor} />;
    }
    if (lower.includes('cafe') || lower.includes('water') || lower.includes('drink')) {
      return <Ionicons name="cafe-outline" size={18} color={iconColor} />;
    }
    if (lower.includes('wifi')) {
      return <Ionicons name="wifi-outline" size={18} color={iconColor} />;
    }
    if (lower.includes('first aid') || lower.includes('aid')) {
      return <Ionicons name="medkit-outline" size={18} color={iconColor} />;
    }
    if (lower.includes('toilet')) {
      return <Ionicons name="water-outline" size={18} color={iconColor} />;
    }
    return <MaterialCommunityIcons name="soccer-field" size={18} color={iconColor} />;
  };

  return (
    <View className="mb-6 px-4">
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
        className="font-bold text-base mb-3"
      >
        {t('venue.amenities')}
      </Text>
      <View className={`flex-row flex-wrap gap-2.5 ${isArabic ? 'flex-row-reverse' : ''}`}>
        {amenityList.map((amenity, idx) => (
          <View
            key={idx}
            style={{
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            }}
            className={`flex-row items-center border rounded-xl px-3.5 py-2.5 shadow-sm ${
              isArabic ? 'flex-row-reverse' : ''
            }`}
          >
            {getAmenityIcon(amenity)}
            <Text
              style={[
                { color: colors.textPrimary },
                isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
              ]}
              className={`text-xs font-semibold ${
                isArabic ? 'mr-2' : 'ml-2'
              }`}
            >
              {translateAmenity(amenity)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
