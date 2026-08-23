import React from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/ui/AppText";
import { PitchDate } from "@/features/venues/schemas/venue.schema";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

interface DateSelectorProps {
  dates: PitchDate[];
  selectedIndex: number;
  onSelectDate: (index: number) => void;
}

export function DateSelector({
  dates,
  selectedIndex,
  onSelectDate,
}: DateSelectorProps) {
  const { t, isArabic, formatDateLocalized } = useLanguage();
  const { colors, isDark } = useTheme();

  if (!dates || dates.length === 0) return null;

  const activeDate = dates[selectedIndex] || dates[0];

  const getLocalizedDayLabel = (dayName: string, dateStr: string) => {
    if (dayName === "TODAY") return t("common.today");
    if (dayName === "TOMORROW") return t("common.tomorrow");
    const loc = formatDateLocalized(dateStr);
    return loc.dayName;
  };

  const getLocalizedMonth = (month: string, dateStr: string) => {
    const loc = formatDateLocalized(dateStr);
    return loc.month;
  };

  return (
    <View className="mb-6">
      <View
        className={`flex-row items-center justify-between px-4 mb-3 ${
          isArabic ? "flex-row-reverse" : ""
        }`}
      >
        <Text
          style={[
            { color: colors.textPrimary },
            isArabic ? { fontFamily: "DroidArabicKufi" } : undefined,
          ]}
          className="font-bold text-base"
        >
          {t("booking.selectDate")}
        </Text>
        {activeDate && (
          <Text
            style={[
              { color: isDark ? "#22c55e" : "#16a34a" },
              isArabic ? { fontFamily: "DroidArabicKufi" } : undefined,
            ]}
            className="text-xs font-bold uppercase"
          >
            {getLocalizedDayLabel(activeDate.dayName, activeDate.date)} • {activeDate.date}
          </Text>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 10,
        }}
      >
        {dates.map((item, idx) => {
          const isSelected = selectedIndex === idx;
          const dayNumber = item.day || item.date.split("-")[2] || "01";
          const displayDayName = getLocalizedDayLabel(item.dayName, item.date);
          const monthName = getLocalizedMonth(item.month || "AUG", item.date);

          return (
            <Pressable
              key={`date_${item.date}_${idx}`}
              onPress={() => onSelectDate(idx)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Select date ${item.dayName} ${item.date}`}
              style={[
                styles.dateButtonBase,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? "#22c55e"
                      : "#16a34a"
                    : colors.card,
                  borderColor: isSelected
                    ? isDark
                      ? "#22c55e"
                      : "#16a34a"
                    : colors.cardBorder,
                },
              ]}
              className="will-change-variable shadow-sm"
            >
              <Text
                style={[
                  styles.dayNameText,
                  {
                    color: isSelected
                      ? isDark
                        ? "#04060c"
                        : "#ffffff"
                      : colors.mutedForeground,
                  },
                  isArabic && {
                    fontFamily: "DroidArabicKufi",
                    fontSize: 10,
                    fontWeight: "normal" as const,
                  },
                ]}
              >
                {displayDayName}
              </Text>
              <Text
                style={[
                  styles.dayNumberText,
                  {
                    color: isSelected
                      ? isDark
                        ? "#04060c"
                        : "#ffffff"
                      : colors.textPrimary,
                  },
                  isArabic && {
                    fontFamily: "DroidArabicKufi",
                    fontWeight: "normal" as const,
                  },
                ]}
              >
                {dayNumber}
              </Text>
              <Text
                style={[
                  styles.monthText,
                  {
                    color: isSelected
                      ? isDark
                        ? "rgba(4, 6, 12, 0.8)"
                        : "rgba(255, 255, 255, 0.85)"
                      : colors.mutedForeground,
                  },
                  isArabic && {
                    fontFamily: "DroidArabicKufi",
                    fontSize: 9,
                    fontWeight: "normal" as const,
                  },
                ]}
              >
                {monthName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  dateButtonBase: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    minWidth: 72,
    borderWidth: 1,
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  dayNumberText: {
    fontSize: 18,
    fontWeight: "900",
  },
  monthText: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase",
  },
});
