import React from "react";
import { View, type ViewProps } from "react-native";
import { Text } from "@/components/ui/AppText";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

export const badgeVariants = cva(
  "flex-row items-center self-start rounded-full px-2.5 py-1",
  {
    variants: {
      variant: {
        default: "bg-[#22c55e]/20 border border-[#22c55e]/30 text-[#22c55e]",
        secondary: "border",
        outline: "bg-transparent border",
        destructive: "bg-red-500/20 border border-red-500/30 text-red-400",
        accent: "bg-blue-500/20 border border-blue-500/30 text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export const badgeTextVariants = cva("text-xs font-bold", {
  variants: {
    variant: {
      default: "text-[#22c55e]",
      secondary: "",
      outline: "",
      destructive: "text-red-400",
      accent: "text-blue-400",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface BadgeProps
  extends ViewProps,
    VariantProps<typeof badgeVariants> {
  label?: string;
  children?: React.ReactNode;
  textClassName?: string;
}

export function Badge({
  label,
  children,
  variant = "default",
  className,
  textClassName,
  style,
  ...props
}: BadgeProps) {
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

  const textStyle = isArabic
    ? {
        fontFamily: "DroidArabicKufi",
        fontWeight: "normal" as const,
        writingDirection: "rtl" as const,
      }
    : undefined;

  const dynamicBadgeStyle =
    variant === "secondary"
      ? {
          backgroundColor: isDark ? "#141d2e" : "#f1f5f9",
          borderColor: isDark ? "#1e293b" : "#e2e8f0",
        }
      : variant === "outline"
      ? {
          borderColor: isDark ? "#334155" : "#cbd5e1",
        }
      : undefined;

  const dynamicTextColor =
    variant === "secondary" || variant === "outline"
      ? { color: isDark ? "#cbd5e1" : "#475569" }
      : undefined;

  return (
    <View
      style={[dynamicBadgeStyle, style]}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {label ? (
        <Text
          style={[dynamicTextColor, textStyle]}
          className={cn(badgeTextVariants({ variant }), textClassName)}
        >
          {label}
        </Text>
      ) : typeof children === "string" ? (
        <Text
          style={[dynamicTextColor, textStyle]}
          className={cn(badgeTextVariants({ variant }), textClassName)}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
