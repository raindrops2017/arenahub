import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/AppText";
import { Input } from "@/components/ui/Input";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

const POSITIONS = ["ST", "CAM", "CM", "RW", "LW", "CB", "GK"] as const;
const FEET = ["RIGHT", "LEFT", "BOTH"] as const;

interface PlayerAttributesEditorProps {
  name: string;
  onChangeName: (val: string) => void;
  email: string;
  onChangeEmail: (val: string) => void;
  phone: string;
  position: string;
  onSelectPosition: (pos: string) => void;
  preferredFoot: string;
  onSelectFoot: (foot: string) => void;
  jerseyNumber: string;
  onChangeJerseyNumber: (val: string) => void;
}

export function PlayerAttributesEditor({
  name,
  onChangeName,
  email,
  onChangeEmail,
  phone,
  position,
  onSelectPosition,
  preferredFoot,
  onSelectFoot,
  jerseyNumber,
  onChangeJerseyNumber,
}: PlayerAttributesEditorProps) {
  const { t, isArabic, translatePosition } = useLanguage();
  const { colors, isDark } = useTheme();

  return (
    <View className="mb-6 px-5">
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
        {t("profile.footballAttributes")}
      </Text>

      <Input
        label={t("profile.fullName")}
        value={name}
        onChangeText={onChangeName}
        placeholder={t("profile.namePlaceholder")}
      />

      <Input
        label={t("profile.email")}
        value={email}
        onChangeText={onChangeEmail}
        placeholder={t("profile.emailPlaceholder")}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Input
        label={t("profile.phone")}
        value={phone}
        editable={false}
        placeholder={t("profile.phonePlaceholder")}
      />

      {/* Position Selector */}
      <View className="mb-4">
        <Text
          style={[
            { color: colors.textSecondary },
            isArabic
              ? {
                  fontFamily: "DroidArabicKufi",
                  textAlign: "right",
                  writingDirection: "rtl",
                }
              : undefined,
          ]}
          className="text-xs font-semibold uppercase tracking-wider mb-2"
        >
          {t("profile.preferredPosition")}
        </Text>
        <View
          className={`flex-row flex-wrap gap-2 ${
            isArabic ? "flex-row-reverse" : ""
          }`}
        >
          {POSITIONS.map((pos) => {
            const isSelected = position === pos;
            return (
              <Pressable
                key={pos}
                onPress={() => onSelectPosition(pos)}
                accessibilityRole="button"
                accessibilityLabel={`Position ${pos}`}
                style={{
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
                }}
                className="px-3.5 py-2 rounded-xl border shadow-sm"
              >
                <Text
                  style={[
                    {
                      color: isSelected
                        ? isDark
                          ? "#04060c"
                          : "#ffffff"
                        : colors.textPrimary,
                    },
                    isArabic
                      ? { fontFamily: "DroidArabicKufi" }
                      : undefined,
                  ]}
                  className="text-xs font-extrabold"
                >
                  {isArabic ? translatePosition(pos).split(" - ")[0] : pos}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Foot & Jersey Row */}
      <View
        className={`flex-row gap-4 mb-2 ${
          isArabic ? "flex-row-reverse" : ""
        }`}
      >
        <View className="flex-1">
          <Text
            style={[
              { color: colors.textSecondary },
              isArabic
                ? {
                    fontFamily: "DroidArabicKufi",
                    textAlign: "right",
                    writingDirection: "rtl",
                  }
                : undefined,
            ]}
            className="text-xs font-semibold uppercase tracking-wider mb-2"
          >
            {t("profile.preferredFoot")}
          </Text>
          <View
            className={`flex-row gap-1.5 ${
              isArabic ? "flex-row-reverse" : ""
            }`}
          >
            {FEET.map((f) => {
              const isSelected = preferredFoot === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => onSelectFoot(f)}
                  style={{
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
                  }}
                  className="flex-1 py-2.5 rounded-xl border items-center shadow-sm"
                >
                  <Text
                    style={[
                      {
                        color: isSelected
                          ? isDark
                            ? "#04060c"
                            : "#ffffff"
                          : colors.textPrimary,
                      },
                      isArabic
                        ? { fontFamily: "DroidArabicKufi" }
                        : undefined,
                    ]}
                    className="text-[11px] font-bold"
                  >
                    {isArabic
                      ? f === "RIGHT"
                        ? "يمنى"
                        : f === "LEFT"
                        ? "يسرى"
                        : "معاً"
                      : f}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="w-28">
          <Input
            label={t("profile.jerseyNumber")}
            value={jerseyNumber}
            onChangeText={onChangeJerseyNumber}
            placeholder="10"
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>
      </View>
    </View>
  );
}
