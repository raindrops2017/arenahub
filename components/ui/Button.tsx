import React from "react";
import {
  Pressable,
  ActivityIndicator,
  type PressableProps,
  View,
} from "react-native";
import { Text } from "@/components/ui/AppText";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

export const buttonVariants = cva(
  "flex-row items-center justify-center rounded-xl active:opacity-80 disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#22c55e] text-[#04060c]",
        secondary: "border",
        outline: "bg-transparent border border-[#22c55e] text-[#22c55e]",
        ghost: "bg-transparent",
        destructive: "bg-red-500 text-white",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-9 px-4 py-2 rounded-lg",
        lg: "h-14 px-8 py-4 rounded-2xl",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export const buttonTextVariants = cva("font-bold text-center", {
  variants: {
    variant: {
      default: "text-[#04060c]",
      secondary: "",
      outline: "text-[#22c55e]",
      ghost: "",
      destructive: "text-white",
    },
    size: {
      default: "text-base",
      sm: "text-sm",
      lg: "text-lg",
      icon: "text-base",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface ButtonProps
  extends PressableProps,
    VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  title?: string;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export function Button({
  title,
  children,
  loading = false,
  leftIcon,
  rightIcon,
  variant = "default",
  size,
  className,
  textClassName,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

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

  // Dynamic theme colors for secondary/ghost variants
  const dynamicButtonStyle =
    variant === "secondary"
      ? {
          backgroundColor: isDark ? "#141d2e" : "#f1f5f9",
          borderColor: isDark ? "#1e293b" : "#e2e8f0",
        }
      : undefined;

  const dynamicTextColor =
    variant === "secondary" || variant === "ghost"
      ? { color: colors ? colors.textPrimary : isDark ? "#ffffff" : "#0f172a" }
      : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={cn(
        buttonVariants({ variant, size }),
        isArabic && "flex-row-reverse",
        className
      )}
      style={
        typeof style === "function"
          ? (state) => [dynamicButtonStyle, style(state)]
          : [dynamicButtonStyle, style]
      }
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "default" ? "#04060c" : "#22c55e"}
        />
      ) : (
        <>
          {leftIcon && <View className={isArabic ? "ml-2" : "mr-2"}>{leftIcon}</View>}
          {title ? (
            <Text
              style={[dynamicTextColor, textStyle]}
              className={cn(buttonTextVariants({ variant, size }), textClassName)}
            >
              {title}
            </Text>
          ) : typeof children === "string" ? (
            <Text
              style={[dynamicTextColor, textStyle]}
              className={cn(buttonTextVariants({ variant, size }), textClassName)}
            >
              {children}
            </Text>
          ) : (
            children
          )}
          {rightIcon && <View className={isArabic ? "mr-2" : "ml-2"}>{rightIcon}</View>}
        </>
      )}
    </Pressable>
  );
}
