import React from "react";
import { View, type ViewProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

export const cardVariants = cva("rounded-2xl border p-4", {
  variants: {
    variant: {
      default: "",
      elevated: "shadow-md",
      interactive: "active:border-[#22c55e]/50",
      outline: "bg-transparent",
    },
    padding: {
      none: "p-0",
      sm: "p-3",
      default: "p-4",
      lg: "p-6",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "default",
  },
});

export interface CardProps
  extends ViewProps,
    VariantProps<typeof cardVariants> {
  className?: string;
}

export function Card({
  className,
  variant,
  padding,
  children,
  style,
  ...props
}: CardProps) {
  let isDark = true;
  let colors: any;
  try {
    const theme = useTheme();
    isDark = theme.isDark;
    colors = theme.colors;
  } catch {
    isDark = true;
  }

  const themeStyle = {
    backgroundColor: variant === "outline" ? "transparent" : colors ? colors.card : isDark ? "#070b14" : "#ffffff",
    borderColor: colors ? colors.cardBorder : isDark ? "#141d2e" : "#e2e8f0",
  };

  return (
    <View
      style={[themeStyle, style]}
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    >
      {children}
    </View>
  );
}
