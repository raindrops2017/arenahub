import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

interface BookingSummaryFooterProps {
  totalPrice: number;
  currency?: string;
  selectedDateText?: string;
  selectedSlotTime?: string;
  onBookNow: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function BookingSummaryFooter({
  totalPrice,
  selectedDateText,
  selectedSlotTime,
  onBookNow,
  isLoading = false,
  disabled = false,
}: BookingSummaryFooterProps) {
  const insets = useSafeAreaInsets();
  const { t, isArabic, formatCurrency } = useLanguage();
  const { colors, isDark } = useTheme();

  return (
    <View
      style={{
        paddingBottom: Math.max(insets.bottom, 16),
        backgroundColor: isDark ? 'rgba(7, 11, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderTopColor: colors.cardBorder,
      }}
      className="border-t p-4 pt-3 backdrop-blur-lg shadow-lg"
    >
      <View
        className={`flex-row items-center justify-between mb-2 ${
          isArabic ? "flex-row-reverse" : ""
        }`}
      >
        <View className={`flex-1 ${isArabic ? "ml-4 items-end" : "mr-4 items-start"}`}>
          <Text
            style={[
              { color: colors.mutedForeground },
              isArabic ? { fontFamily: "DroidArabicKufi" } : undefined,
            ]}
            className="text-xs font-semibold uppercase"
          >
            {t("booking.totalAmount")}
          </Text>
          <View className={`flex-row items-baseline ${isArabic ? "flex-row-reverse" : ""}`}>
            <Text
              style={[
                { color: isDark ? "#22c55e" : "#16a34a" },
                isArabic ? { fontFamily: "DroidArabicKufi" } : undefined,
              ]}
              className="text-2xl font-black"
            >
              {formatCurrency(totalPrice)}
            </Text>
          </View>
        </View>

        {selectedSlotTime && (
          <View className={isArabic ? "items-start" : "items-end"}>
            <Text
              style={{ color: colors.textPrimary }}
              className="text-xs font-bold"
            >
              {selectedSlotTime}
            </Text>
            {selectedDateText && (
              <Text
                style={{ color: colors.mutedForeground }}
                className="text-[10px] mt-0.5"
              >
                {selectedDateText}
              </Text>
            )}
          </View>
        )}
      </View>

      <Button
        title={
          isLoading
            ? (isArabic ? "جاري تأكيد الحجز..." : "Processing Booking...")
            : t("booking.confirmBooking")
        }
        loading={isLoading}
        disabled={disabled || isLoading}
        onPress={onBookNow}
        size="lg"
        className="w-full"
      />
    </View>
  );
}
