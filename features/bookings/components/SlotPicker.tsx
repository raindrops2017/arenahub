import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/ui/AppText";
import { TimeSlot } from "@/features/venues/schemas/venue.schema";
import { HourlySlot } from "@/features/bookings/utils/dateSlotGenerator";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

export type SlotItemType = HourlySlot | (TimeSlot & { id?: string; startHour24?: number; endHour24?: number; price?: number; available?: boolean });

interface SlotPickerProps {
  slots: (HourlySlot | SlotItemType)[];
  selectedSlots?: (HourlySlot | SlotItemType)[];
  onToggleSlot?: (slot: HourlySlot) => void;
  onClearSlots?: () => void;
  // Backward-compatible props
  selectedSlotTime?: string;
  onSelectSlot?: (slot: HourlySlot | any) => void;
  currency?: string;
  defaultPrice?: number;
}

export function SlotPicker({
  slots,
  selectedSlots = [],
  onToggleSlot,
  onClearSlots,
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

  const formatSlotDisplayTime = (slot: SlotItemType) => {
    if (isArabic && slot.startHour24 !== undefined && slot.endHour24 !== undefined) {
      return `${formatHourSlot(slot.startHour24)} - ${formatHourSlot(slot.endHour24)}`;
    }
    return slot.time;
  };

  const isSlotSelected = (slot: SlotItemType): boolean => {
    if (selectedSlots && selectedSlots.length > 0) {
      return selectedSlots.some((s) => {
        if (s.id && slot.id) return s.id === slot.id;
        if (s.startHour24 !== undefined && slot.startHour24 !== undefined) {
          return s.startHour24 === slot.startHour24;
        }
        return s.time === slot.time;
      });
    }
    return Boolean(selectedSlotTime && selectedSlotTime === slot.time);
  };

  const handleSlotPress = (slot: SlotItemType) => {
    if (onToggleSlot) {
      onToggleSlot(slot as HourlySlot);
    } else if (onSelectSlot) {
      onSelectSlot(slot as any);
    }
  };

  const selectedCount = selectedSlots.length > 0 ? selectedSlots.length : selectedSlotTime ? 1 : 0;

  return (
    <View className="mb-6 px-4">
      {/* Header with Title, Selection Counter & Clear Button */}
      <View className={`flex-row justify-between items-center mb-3 ${isArabic ? "flex-row-reverse" : ""}`}>
        <View className={`flex-row items-center gap-2 ${isArabic ? "flex-row-reverse" : ""}`}>
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
            className="font-bold text-base"
          >
            {t("booking.selectTimeSlot")}
          </Text>

          {selectedCount > 0 && (
            <View
              style={{
                backgroundColor: isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(22, 163, 74, 0.15)",
                borderColor: isDark ? "#22c55e" : "#16a34a",
              }}
              className="px-2 py-0.5 rounded-full border"
            >
              <Text
                style={{
                  color: isDark ? "#22c55e" : "#16a34a",
                  fontFamily: isArabic ? "DroidArabicKufi" : undefined,
                }}
                className="text-[11px] font-bold"
              >
                {isArabic
                  ? `${selectedCount} ${selectedCount === 1 ? "فترة" : "فترات"}`
                  : `${selectedCount} ${selectedCount === 1 ? "slot" : "slots"}`}
              </Text>
            </View>
          )}
        </View>

        {selectedCount > 0 && onClearSlots && (
          <Pressable
            onPress={onClearSlots}
            hitSlop={8}
            className="px-2 py-1"
          >
            <Text
              style={{
                color: isDark ? "#ef4444" : "#dc2626",
                fontFamily: isArabic ? "DroidArabicKufi" : undefined,
              }}
              className="text-xs font-semibold"
            >
              {isArabic ? "مسح الكل" : "Clear All"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Slots Grid */}
      <View className={`flex-row flex-wrap gap-2.5 ${isArabic ? "flex-row-reverse" : ""}`}>
        {slots.map((slot, idx) => {
          const isSelected = isSlotSelected(slot);
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
              onPress={() => handleSlotPress(slot)}
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
                {isSelected ? (
                  <View
                    style={[
                      styles.selectedBadge,
                      {
                        backgroundColor: isDark ? "#04060c" : "#ffffff",
                      },
                    ]}
                  >
                    <Ionicons
                      name="checkmark"
                      size={10}
                      color={isDark ? "#22c55e" : "#16a34a"}
                    />
                  </View>
                ) : isAvailable ? (
                  <View
                    style={[
                      styles.indicatorDot,
                      {
                        backgroundColor: isDark ? "#22c55e" : "#16a34a",
                      },
                    ]}
                  />
                ) : null}
              </View>

              <Text
                style={[
                  styles.slotPriceText,
                  {
                    color: isSelected
                      ? isDark
                        ? "rgba(4, 6, 12, 0.85)"
                        : "rgba(255, 255, 255, 0.95)"
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
                {isAvailable ? formatCurrency(slotPrice) : isArabic ? "محجوز" : "Booked"}
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
  selectedBadge: {
    height: 16,
    width: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  slotPriceText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
});

