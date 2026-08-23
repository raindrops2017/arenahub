import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/ui/AppText";
import { TimeSlot } from "@/features/venues/schemas/venue.schema";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

interface SlotPickerProps {
  slots: (TimeSlot & { id?: string; startHour24?: number; endHour24?: number })[];
  selectedSlotTime?: string;
  onSelectSlot: (slot: TimeSlot & { id?: string }) => void;
  currency?: string;
  defaultPrice?: number;
}

export function SlotPicker({
  slots,
  selectedSlotTime,
  onSelectSlot,
  defaultPrice = 200,
}: SlotPickerProps) {
  const { t, isArabic, formatCurrency, formatHourSlot } = useLanguage();
  const { colors, isDark } = useTheme();

  if (!slots || slots.length === 0) {
    return (
      <View
        style={{
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        }}
        className="px-4 py-6 mx-4 rounded-2xl border items-center shadow-sm"
      >
        <Text
          style={[
            { color: colors.mutedForeground },
            isArabic ? { fontFamily: "DroidArabicKufi" } : undefined,
          ]}
          className="text-sm"
        >
          {t("booking.noSlotsAvailable")}
        </Text>
      </View>
    );
  }

  const formatSlotDisplayTime = (slot: any) => {
    if (isArabic && slot.startHour24 !== undefined && slot.endHour24 !== undefined) {
      return `${formatHourSlot(slot.startHour24)} - ${formatHourSlot(slot.endHour24)}`;
    }
    return slot.time;
  };

  return (
    <View className="mb-6 px-4">
      <Text
        style={[
          { color: colors.textPrimary },
          isArabic
            ? {
                fontFamily: "DroidArabicKufi",
                textAlign: "right",
                writingDirection: "rtl",
              }
            : undefined,
        ]}
        className="font-bold text-base mb-3"
      >
        {t("booking.selectTimeSlot")}
      </Text>
      <View className={`flex-row flex-wrap gap-2.5 ${isArabic ? "flex-row-reverse" : ""}`}>
        {slots.map((slot, idx) => {
          const isSelected = selectedSlotTime === slot.time;
          const isAvailable = slot.available !== false;
          const slotPrice = slot.price ?? defaultPrice;
          const slotKey = slot.id || `${slot.time}_${idx}`;
          const displayTime = formatSlotDisplayTime(slot);

          const slotBg = isSelected
            ? isDark
              ? "#22c55e"
              : "#16a34a"
            : !isAvailable
            ? isDark
              ? "rgba(7, 11, 20, 0.4)"
              : "#f1f5f9"
            : colors.card;

          const slotBorder = isSelected
            ? isDark
              ? "#22c55e"
              : "#16a34a"
            : !isAvailable
            ? isDark
              ? "rgba(20, 29, 46, 0.4)"
              : "#e2e8f0"
            : colors.cardBorder;

          return (
            <Pressable
              key={slotKey}
              disabled={!isAvailable}
              onPress={() => onSelectSlot(slot)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: !isAvailable }}
              accessibilityLabel={`Time slot ${displayTime}, ${
                isAvailable ? `price ${formatCurrency(slotPrice)}` : "unavailable"
              }`}
              style={[
                styles.slotBase,
                {
                  backgroundColor: slotBg,
                  borderColor: slotBorder,
                  opacity: !isAvailable ? 0.5 : 1,
                },
              ]}
              className="will-change-variable shadow-sm"
            >
              <View className={`flex-row justify-between items-center ${isArabic ? "flex-row-reverse" : ""}`}>
                <Text
                  style={[
                    styles.slotTimeText,
                    {
                      color: isSelected
                        ? isDark
                          ? "#04060c"
                          : "#ffffff"
                        : !isAvailable
                        ? colors.mutedForeground
                        : colors.textPrimary,
                    },
                    !isAvailable && styles.textDisabled,
                    isArabic && {
                      fontFamily: "DroidArabicKufi",
                      fontSize: 12,
                      fontWeight: "normal" as const,
                    },
                  ]}
                >
                  {displayTime}
                </Text>
                {isAvailable && (
                  <View
                    style={[
                      styles.indicatorDot,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? "#04060c"
                            : "#ffffff"
                          : isDark
                          ? "#22c55e"
                          : "#16a34a",
                      },
                    ]}
                  />
                )}
              </View>

              <Text
                style={[
                  styles.slotPriceText,
                  {
                    color: isSelected
                      ? isDark
                        ? "rgba(4, 6, 12, 0.85)"
                        : "rgba(255, 255, 255, 0.9)"
                      : !isAvailable
                      ? colors.mutedForeground
                      : isDark
                      ? "#22c55e"
                      : "#16a34a",
                  },
                  isArabic && {
                    fontFamily: "DroidArabicKufi",
                    fontWeight: "normal" as const,
                    textAlign: isArabic ? "right" : "left",
                  },
                  !isAvailable && styles.textDisabled,
                ]}
              >
                {isAvailable ? formatCurrency(slotPrice) : (isArabic ? "محجوز" : "Booked")}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slotBase: {
    width: "48%",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 72,
  },
  slotTimeText: {
    fontSize: 13,
    fontWeight: "800",
  },
  textDisabled: {
    textDecorationLine: "line-through",
  },
  indicatorDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },
  slotPriceText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
});
