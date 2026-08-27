import React, { useState, useMemo } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useVenues } from '@/features/venues/api/useVenuesQuery';
import { useBanners } from '@/features/banners/api/useBannersQuery';
import { VenueFeedList } from '@/features/venues/components/VenueFeedList';
import { AdBannerCarousel } from '@/components/AdBannerCarousel';
import { FifaPlayerCardModal } from '@/components/FifaPlayerCardModal';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

const CATEGORIES = ['ALL', 'Football', 'Padel', '5-A-SIDE', '7-A-SIDE', '11-A-SIDE'] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { t, isArabic, formatCurrency, translateCategory } = useLanguage();
  const { colors, isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showFifaCardModal, setShowFifaCardModal] = useState<boolean>(false);

  // Live query from NestJS server with TanStack Query caching
  const querySport = selectedCategory !== 'ALL' ? selectedCategory : undefined;
  const {
    data: venues = [],
    isLoading,
    isRefetching: isVenuesRefetching,
    refetch: refetchVenues,
  } = useVenues(querySport);

  const { refetch: refetchBanners, isRefetching: isBannersRefetching } = useBanners();

  const isRefetching = isVenuesRefetching || isBannersRefetching;

  const handleRefresh = async () => {
    await Promise.all([refetchVenues(), refetchBanners()]);
  };

  const filteredVenues = useMemo(() => {
    if (selectedCategory === 'ALL') return venues;
    return venues.filter((v) =>
      v.sportsType?.some(
        (t) => t.toLowerCase() === selectedCategory.toLowerCase()
      ) ||
      v.sportsTypes?.some(
        (t) => t.toLowerCase() === selectedCategory.toLowerCase()
      )
    );
  }, [venues, selectedCategory]);

  const handleSelectVenue = (id: string) => {
    router.push({ pathname: '/pitch/[id]', params: { id } });
  };

  const renderHeader = () => (
    <View className="mb-3">
      {/* Dynamic Promotion Ad Banners */}
      <AdBannerCarousel />

      {/* Sport Category Filter Tabs */}
      <View className="py-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            gap: 10,
          }}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            const localizedCat = translateCategory(cat);
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.categoryPillBase,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? '#22c55e'
                        : '#16a34a'
                      : colors.card,
                    borderColor: isSelected
                      ? isDark
                        ? '#22c55e'
                        : '#16a34a'
                      : colors.cardBorder,
                  },
                ]}
                className="will-change-variable"
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    {
                      color: isSelected
                        ? isDark
                          ? '#04060c'
                          : '#ffffff'
                        : colors.textSecondary,
                    },
                    isArabic && {
                      fontFamily: 'DroidArabicKufi',
                      fontSize: 13,
                      fontWeight: 'normal' as const,
                    },
                  ]}
                >
                  {localizedCat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      {/* Top App Header with Language & Theme Switchers */}
      <View
        className={`px-5 pb-3 flex-row items-center justify-between pt-1 ${
          isArabic ? 'flex-row-reverse' : ''
        }`}
      >
        <View className={isArabic ? 'items-end' : 'items-start'}>
          <View className={`flex-row items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
            <FontAwesome5 name="futbol" size={20} color={isDark ? '#22c55e' : '#16a34a'} />
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: isArabic ? 'DroidArabicKufi' : undefined,
              }}
              className={`${isArabic ? 'mr-2' : 'ml-2'} text-2xl tracking-widest uppercase font-black`}
            >
              {isArabic ? (
                <>
                  أرينا<Text style={{ color: isDark ? '#22c55e' : '#16a34a' }}>هاب</Text>
                </>
              ) : (
                <>
                  ARENA<Text style={{ color: isDark ? '#22c55e' : '#16a34a' }}>HUB</Text>
                </>
              )}
            </Text>
          </View>
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: isArabic ? 'DroidArabicKufi' : undefined,
            }}
            className="text-xs font-medium"
          >
            {t('home.findPitch')}
          </Text>
        </View>

        {/* Quick Language Toggle, Theme Toggle, & Profile Avatar */}
        <View className={`flex-row items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
          <ThemeToggle variant="quick" />
          <LanguageToggle variant="compact" />

          <Pressable
            onPress={() => {
              if (!isAuthenticated) {
                router.push('/(auth)/login');
              } else {
                router.push('/profile');
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={isAuthenticated ? 'Open Profile' : 'Login'}
            style={{
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            }}
            className="h-10 w-10 rounded-full border items-center justify-center overflow-hidden active:opacity-80 shadow-sm"
          >
            {isAuthenticated && user?.userName ? (
              <Text
                style={{
                  color: isDark ? '#22c55e' : '#16a34a',
                  fontFamily: isArabic ? 'DroidArabicKufi' : undefined,
                }}
                className="text-xs font-black uppercase"
              >
                {user.userName.charAt(0)}
              </Text>
            ) : (
              <Ionicons name="person" size={18} color={isDark ? '#22c55e' : '#16a34a'} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Recycled Live Venue Feed List with Pull-to-Refresh */}
      <VenueFeedList
        venues={filteredVenues}
        isLoading={isLoading}
        refreshing={isRefetching}
        onRefresh={handleRefresh}
        onSelectVenue={handleSelectVenue}
        ListHeaderComponent={renderHeader()}
      />

      {/* FIFA FUT Player Passport Card Modal */}
      <FifaPlayerCardModal
        visible={showFifaCardModal}
        onClose={() => setShowFifaCardModal(false)}
        user={user}
        walletBalance={user?.walletBalance ?? 0}
        totalBookings={user?.totalBookings ?? 0}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  categoryPillBase: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});