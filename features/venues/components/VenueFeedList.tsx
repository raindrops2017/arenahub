import React from "react";
import { View, FlatList, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/AppText";
import { Venue } from "../schemas/venue.schema";
import { VenueCard } from "./VenueCard";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

interface VenueFeedListProps {
  venues: Venue[];
  isLoading?: boolean;
  onSelectVenue: (id: string) => void;
  ListHeaderComponent?: React.ReactElement | null;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function VenueFeedList({
  venues,
  isLoading,
  onSelectVenue,
  ListHeaderComponent,
  refreshing,
  onRefresh,
}: VenueFeedListProps) {
  const { t, isArabic } = useLanguage();
  const { colors, isDark } = useTheme();

  if (isLoading && venues.length === 0) {
    return (
      <View className="flex-1 justify-center items-center py-20">
        <ActivityIndicator size="large" color={isDark ? "#22c55e" : "#16a34a"} />
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: isArabic ? 'DroidArabicKufi' : undefined,
          }}
          className="text-sm mt-3"
        >
          {isArabic ? "جاري تحميل الملاعب المتاحة..." : "Loading available pitches..."}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={venues}
      renderItem={({ item }) => (
        <VenueCard venue={item} onPress={onSelectVenue} />
      )}
      keyExtractor={(item) => item.id || item._id}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={
        !isLoading ? (
          <View className="py-16 items-center justify-center">
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: isArabic ? 'DroidArabicKufi' : undefined,
              }}
              className="text-base font-semibold"
            >
              {t('home.noVenuesFound')}
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                opacity: 0.7,
                fontFamily: isArabic ? 'DroidArabicKufi' : undefined,
              }}
              className="text-xs mt-1"
            >
              {t('home.pullToRefresh')}
            </Text>
          </View>
        ) : null
      }
    />
  );
}
