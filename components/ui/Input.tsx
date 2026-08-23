import React, { forwardRef } from "react";
import {
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Text } from "@/components/ui/AppText";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      className,
      containerClassName,
      placeholderTextColor,
      style,
      ...props
    },
    ref
  ) => {
    let isArabic = false;
    try {
      const lang = useLanguage();
      isArabic = lang.isArabic;
    } catch {
      isArabic = false;
    }

    let isDark = true;
    let colors: any;
    try {
      const theme = useTheme();
      isDark = theme.isDark;
      colors = theme.colors;
    } catch {
      isDark = true;
    }

    const defaultPlaceholderColor =
      placeholderTextColor || (colors ? colors.mutedForeground : isDark ? "#64748b" : "#94a3b8");

    return (
      <View className={cn("w-full mb-3", containerClassName)}>
        {label && (
          <Text
            style={[
              { color: colors ? colors.textSecondary : isDark ? "#cbd5e1" : "#475569" },
              isArabic
                ? {
                    fontFamily: "DroidArabicKufi",
                    fontWeight: "normal" as const,
                    textAlign: "right",
                    writingDirection: "rtl",
                  }
                : { textAlign: "left" },
            ]}
            className="text-xs font-semibold uppercase tracking-wider mb-2"
          >
            {label}
          </Text>
        )}
        <View
          style={{
            backgroundColor: colors ? colors.inputBackground : isDark ? "#070b14" : "#ffffff",
            borderColor: error ? "#ef4444" : colors ? colors.inputBorder : isDark ? "#141d2e" : "#cbd5e1",
          }}
          className={cn(
            "flex-row items-center border rounded-xl px-3.5 h-12",
            isArabic && "flex-row-reverse",
            error && "border-red-500",
            props.editable === false && "opacity-50"
          )}
        >
          {leftIcon && (
            <View className={isArabic ? "ml-2.5" : "mr-2.5"}>{leftIcon}</View>
          )}
          <TextInput
            ref={ref}
            className={cn("flex-1 text-base py-0", className)}
            style={[
              { color: colors ? colors.textPrimary : isDark ? "#ffffff" : "#0f172a" },
              isArabic
                ? {
                    fontFamily: "DroidArabicKufi",
                    fontWeight: "normal" as const,
                    textAlign: "right",
                    writingDirection: "rtl",
                  }
                : { textAlign: "left" },
              style,
            ]}
            placeholderTextColor={defaultPlaceholderColor}
            {...props}
          />
          {rightIcon && (
            <View className={isArabic ? "mr-2.5" : "ml-2.5"}>{rightIcon}</View>
          )}
        </View>
        {error && (
          <Text
            style={
              isArabic
                ? {
                    fontFamily: "DroidArabicKufi",
                    fontWeight: "normal" as const,
                    textAlign: "right",
                    writingDirection: "rtl",
                  }
                : { textAlign: "left" }
            }
            className="text-red-500 text-xs mt-1.5 ml-1"
          >
            {error}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = "Input";
