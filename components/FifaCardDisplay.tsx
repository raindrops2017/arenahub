import React from 'react';
import { View, Image, Dimensions } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { useLanguage } from '@/context/LanguageContext';

const { width } = Dimensions.get('window');

interface FifaCardDisplayProps {
  user: any;
  cardWidth?: number;
  totalBookings?: number;
  rating?: number;
  walletBalance?: number;
}

export function FifaCardDisplay({
  user,
  cardWidth,
  totalBookings = 14,
  rating = 4.9,
  walletBalance = 1500,
}: FifaCardDisplayProps) {
  const { t, isArabic } = useLanguage();
  const targetWidth = cardWidth || Math.min(width - 48, 330);
  const cardHeight = targetWidth * 1.55; // FUT Card Aspect Ratio

  const rawName =
    user?.userName ||
    user?.name ||
    (isArabic ? 'كريم أحمد' : 'Kareem Ahmed');

  const playerName = isArabic ? rawName : rawName.toUpperCase().split(' ').pop() || rawName.toUpperCase();
  const userPosition =
    user?.position ||
    user?.favoritePosition ||
    'ST';

  const userInitials =
    rawName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'KA';

  const avatarUri = user?.avatar || user?.avatarUrl;

  return (
    <View
      style={{
        width: targetWidth,
        height: cardHeight,
        borderRadius: 24,
        overflow: 'hidden',
      }}
      className="relative shadow-2xl items-center"
    >
      {/* Outer FUT Gold Metallic Card Container matching Mbappe_231747-1.png */}
      <LinearGradient
        colors={['#fef08a', '#eab308', '#ca8a04', '#a16207', '#713f12']}
        locations={[0, 0.25, 0.55, 0.8, 1]}
        style={{ width: '100%', height: '100%', padding: 3, borderRadius: 24 }}
      >
        <View
          style={{ width: '100%', height: '100%', borderRadius: 22 }}
          className="bg-[#edd478] overflow-hidden relative flex-col justify-between"
        >
          {/* Top Half Gold Textured Surface */}
          <LinearGradient
            colors={['#fef08a', '#f5d76e', '#e5be49', '#d4a72c']}
            locations={[0, 0.3, 0.7, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '62%' }}
          />

          {/* Dynamic Gold Ribbon Metallic Background Curve */}
          <View
            style={{
              position: 'absolute',
              top: -20,
              right: -30,
              width: targetWidth * 0.9,
              height: targetWidth * 0.9,
              borderRadius: targetWidth,
              borderWidth: 14,
              borderColor: 'rgba(255, 235, 140, 0.4)',
              transform: [{ rotate: '-25deg' }],
            }}
          />

          {/* Top Content Row: Stacked Stats on Left + Player Image on Right */}
          <View className={`flex-row w-full h-[58%] px-4 pt-4 z-10 justify-between items-start ${isArabic ? 'flex-row-reverse' : ''}`}>
            {/* Left Stack (Rating, Position, Flag, Club Crest) */}
            <View className="items-center z-20 pt-1">
              {/* OVR Rating */}
              <Text
                style={{ fontFamily: 'BebasNeue_400Regular', color: '#1a1608' }}
                className="text-5xl leading-none tracking-tighter"
              >
                91
              </Text>

              {/* Position */}
              <Text
                style={{ fontFamily: isArabic ? 'DroidKufi_Regular' : 'Montserrat_900Black', color: '#1a1608' }}
                className="text-sm uppercase tracking-widest mt-0.5"
              >
                {userPosition.slice(0, 3)}
              </Text>

              {/* Position Underline */}
              <View style={{ backgroundColor: '#1a1608' }} className="h-[2px] w-7 my-1" />

              {/* Country Flag (Egypt 🇪🇬) */}
              <View className="w-8 h-5 my-1 border border-black/20 rounded-xs overflow-hidden items-center justify-center bg-white shadow-sm">
                <Text className="text-xs">🇪🇬</Text>
              </View>

              {/* Club Emblem Crest (ArenaHub Crest) */}
              <View className="w-8 h-8 mt-1 rounded-full bg-[#04060c] border border-[#eab308] items-center justify-center shadow-md">
                <FontAwesome5 name="futbol" size={15} color="#22c55e" />
              </View>
            </View>

            {/* Cutout Player Image */}
            <View className={`flex-1 h-full ${isArabic ? 'items-start justify-end' : 'items-end justify-end'} relative z-10 pb-0`}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  className="w-full h-full object-contain"
                  resizeMode="contain"
                />
              ) : (
                <View className="w-[85%] h-[85%] bg-[#1e293b] rounded-full border-2 border-[#1a1608] items-center justify-center shadow-xl">
                  <Text
                    style={{ fontFamily: isArabic ? 'DroidKufi_Regular' : 'Montserrat_900Black', color: '#f5d76e' }}
                    className="text-4xl uppercase"
                  >
                    {userInitials}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Bottom Half Metallic Gold Plate */}
          <LinearGradient
            colors={['#e5c158', '#d8af3a', '#c49a26']}
            style={{ width: '100%', height: '42%' }}
            className="p-3 border-t border-[#b89025] flex-col justify-between items-center z-20"
          >
            {/* Player Name */}
            <View className="w-full items-center border-b border-[#1a1608]/20 pb-1 mt-0.5">
              <Text
                style={{
                  fontFamily: isArabic ? 'DroidKufi_Regular' : 'BebasNeue_400Regular',
                  color: '#1a1608',
                }}
                className={`tracking-widest text-center uppercase ${isArabic ? 'text-xl font-bold' : 'text-3xl'}`}
              >
                {playerName}
              </Text>
            </View>

            {/* ArenaHub Bookings & Rating Statistics Grid */}
            <View className={`w-full flex-row justify-between px-3 my-1 ${isArabic ? 'flex-row-reverse' : ''}`}>
              {/* Column 1: Bookings, Wallet, Fairplay */}
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center justify-center gap-1.5">
                  <Text style={{ fontFamily: 'BebasNeue_400Regular', color: '#1a1608' }} className="text-2xl">
                    {totalBookings}
                  </Text>
                  <Text
                    style={{
                      fontFamily: isArabic ? 'DroidKufi_Regular' : 'Montserrat_900Black',
                      color: '#1a1608',
                    }}
                    className="text-xs uppercase"
                  >
                    {isArabic ? 'حجز' : 'BKS'}
                  </Text>
                </View>

                <View className="flex-row items-center justify-center gap-1.5">
                  <Text style={{ fontFamily: 'BebasNeue_400Regular', color: '#1a1608' }} className="text-2xl">
                    {walletBalance >= 1000 ? `${(walletBalance / 1000).toFixed(1)}K` : walletBalance}
                  </Text>
                  <Text
                    style={{
                      fontFamily: isArabic ? 'DroidKufi_Regular' : 'Montserrat_900Black',
                      color: '#1a1608',
                    }}
                    className="text-xs uppercase"
                  >
                    {isArabic ? 'رصيد' : 'WLT'}
                  </Text>
                </View>

                <View className="flex-row items-center justify-center gap-1.5">
                  <Text style={{ fontFamily: 'BebasNeue_400Regular', color: '#1a1608' }} className="text-2xl">
                    98%
                  </Text>
                  <Text
                    style={{
                      fontFamily: isArabic ? 'DroidKufi_Regular' : 'Montserrat_900Black',
                      color: '#1a1608',
                    }}
                    className="text-xs uppercase"
                  >
                    {isArabic ? 'روح' : 'FLP'}
                  </Text>
                </View>
              </View>

              {/* Vertical Center Separator Line */}
              <View style={{ backgroundColor: '#1a1608', opacity: 0.3 }} className="w-[1.5px] h-full mx-1" />

              {/* Column 2: Rating, Matches, Member Tier */}
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center justify-center gap-1.5">
                  <Text style={{ fontFamily: 'BebasNeue_400Regular', color: '#1a1608' }} className="text-2xl">
                    {rating.toFixed(1)}
                  </Text>
                  <Text
                    style={{
                      fontFamily: isArabic ? 'DroidKufi_Regular' : 'Montserrat_900Black',
                      color: '#1a1608',
                    }}
                    className="text-xs uppercase"
                  >
                    {isArabic ? 'تقييم' : 'RAT'}
                  </Text>
                </View>

                <View className="flex-row items-center justify-center gap-1.5">
                  <Text style={{ fontFamily: 'BebasNeue_400Regular', color: '#1a1608' }} className="text-2xl">
                    {totalBookings}
                  </Text>
                  <Text
                    style={{
                      fontFamily: isArabic ? 'DroidKufi_Regular' : 'Montserrat_900Black',
                      color: '#1a1608',
                    }}
                    className="text-xs uppercase"
                  >
                    {isArabic ? 'مباراة' : 'MAT'}
                  </Text>
                </View>

                <View className="flex-row items-center justify-center gap-1.5">
                  <Text style={{ fontFamily: 'BebasNeue_400Regular', color: '#1a1608' }} className="text-2xl">
                    {isArabic ? 'محترف' : 'PRO'}
                  </Text>
                  <Text
                    style={{
                      fontFamily: isArabic ? 'DroidKufi_Regular' : 'Montserrat_900Black',
                      color: '#1a1608',
                    }}
                    className="text-xs uppercase"
                  >
                    {isArabic ? 'فئة' : 'TIER'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Bottom Footer Accent Line */}
            <View style={{ backgroundColor: '#1a1608', opacity: 0.3 }} className="h-[2px] w-12 mb-1" />
          </LinearGradient>
        </View>
      </LinearGradient>
    </View>
  );
}
