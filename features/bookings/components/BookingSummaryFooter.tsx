import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

interface BookingSummaryFooterProps {
  totalPrice: number;
  targetPaymentAmount?: number;
  walletDeduction?: number;
  paymobRemainder?: number;
  paymobAmount?: number;
  remainingAtVenue?: number;
  isDepositPayment?: boolean;
  minimumDepositAmount?: number;
  selectedSlotsCount?: number;
  selectedDateText?: string;
  selectedSlotTime?: string;
  onBookNow: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  currency?: string;
}

export function BookingSummaryFooter({
  totalPrice,
  targetPaymentAmount,
  walletDeduction = 0,
  paymobRemainder,
  paymobAmount,
  remainingAtVenue = 0,
  isDepositPayment = false,
  minimumDepositAmount = 0,
  selectedSlotsCount = 1,
  selectedDateText,
  selectedSlotTime,
  onBookNow,
  isLoading = false,
  disabled = false,
}: BookingSummaryFooterProps) {
  const insets = useSafeAreaInsets();
  const { t, isArabic, formatCurrency } = useLanguage();
  const { colors, isDark } = useTheme();

  const duePayment = targetPaymentAmount !== undefined ? targetPaymentAmount : totalPrice;
  const onlineRemainder = paymobRemainder ?? paymobAmount ?? Math.max(0, duePayment - walletDeduction);
  const depositEnabled = typeof minimumDepositAmount === 'number' && minimumDepositAmount > 0;
  const showDepositBreakdown = depositEnabled && (isDepositPayment || (duePayment < totalPrice && duePayment > 0));
  const hasWalletDeduction = walletDeduction > 0;

  const getButtonTitle = () => {
    if (isLoading) {
      return isArabic ? "جاري التأكيد..." : "Processing...";
    }
    if (selectedSlotsCount > 1) {
      if (onlineRemainder > 0) {
        return isArabic
          ? `حجز ${selectedSlotsCount} فترات • ${formatCurrency(onlineRemainder)}`
          : `Book ${selectedSlotsCount} Slots • ${formatCurrency(onlineRemainder)}`;
      }
      return isArabic
        ? `تأكيد ${selectedSlotsCount} فترات بالمحفظة`
        : `Confirm ${selectedSlotsCount} Slots`;
    }
    if (onlineRemainder > 0) {
      return isArabic
        ? `دفع ${formatCurrency(onlineRemainder)} وتأكيد`
        : `Pay ${formatCurrency(onlineRemainder)} & Confirm`;
    }
    return t("booking.confirmBooking");
  };

  return (
    <View
      style={{
        paddingBottom: Math.max(insets.bottom, 16),
        backgroundColor: isDark ? "rgba(7, 11, 20, 0.96)" : "rgba(255, 255, 255, 0.98)",
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
            className="text-xs font-semibold"
          >
            {showDepositBreakdown
              ? isArabic
                ? "العربون"
                : "Deposit"
              : t("booking.totalAmount")}
          </Text>
          <View className={`flex-row items-baseline gap-2 ${isArabic ? "flex-row-reverse" : ""}`}>
            <Text
              style={[
                { color: isDark ? "#22c55e" : "#16a34a" },
                isArabic ? { fontFamily: "DroidArabicKufi" } : undefined,
              ]}
              className="text-2xl font-black"
            >
              {formatCurrency(duePayment)}
            </Text>
            {showDepositBreakdown && (
              <Text
                style={{ color: colors.mutedForeground }}
                className="text-xs font-medium"
              >
                ({isArabic ? "الإجمالي:" : "Total:"} {formatCurrency(totalPrice)})
              </Text>
            )}
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

      {(hasWalletDeduction || showDepositBreakdown) && (
        <View
          style={{
            backgroundColor: isDark ? "rgba(20, 29, 46, 0.5)" : "rgba(241, 245, 249, 0.7)",
            borderColor: colors.cardBorder,
          }}
          className="rounded-xl p-2.5 mb-3 border gap-1"
        >
          {hasWalletDeduction && (
            <View className={`flex-row justify-between items-center ${isArabic ? "flex-row-reverse" : ""}`}>
              <Text
                style={[
                  { color: colors.mutedForeground },
                  isArabic ? { fontFamily: "DroidArabicKufi" } : undefined,
                ]}
                className="text-xs"
              >
                {isArabic ? "المحفظة" : "Wallet"}
              </Text>
              <Text
                style={{ color: isDark ? "#22c55e" : "#16a34a" }}
                className="text-xs font-bold"
              >
                - {formatCurrency(walletDeduction)}
              </Text>
            </View>
          )}

          {onlineRemainder > 0 && hasWalletDeduction && (
            <View className={`flex-row justify-between items-center ${isArabic ? "flex-row-reverse" : ""}`}>
              <Text
                style={[
                  { color: colors.textPrimary },
                  isArabic ? { fontFamily: "DroidArabicKufi" } : undefined,
                ]}
                className="text-xs font-medium"
              >
                {isArabic ? "البطاقة" : "Card"}
              </Text>
              <Text
                style={{ color: isDark ? "#38bdf8" : "#0284c7" }}
                className="text-xs font-bold"
              >
                {formatCurrency(onlineRemainder)}
              </Text>
            </View>
          )}

          {onlineRemainder === 0 && hasWalletDeduction && (
            <View className={`flex-row justify-between items-center ${isArabic ? "flex-row-reverse" : ""}`}>
              <Text
                style={[
                  { color: colors.mutedForeground },
                  isArabic ? { fontFamily: "DroidArabicKufi" } : undefined,
                ]}
                className="text-xs"
              >
                {isArabic ? "الدفع" : "Payment"}
              </Text>
              <Text
                style={{ color: isDark ? "#22c55e" : "#16a34a" }}
                className="text-xs font-bold"
              >
                {isArabic ? "من المحفظة بالكامل" : "Covered by Wallet"}
              </Text>
            </View>
          )}

          {showDepositBreakdown && remainingAtVenue > 0 && (
            <View className={`flex-row justify-between items-center ${isArabic ? "flex-row-reverse" : ""}`}>
              <Text
                style={[
                  { color: colors.mutedForeground },
                  isArabic ? { fontFamily: "DroidArabicKufi" } : undefined,
                ]}
                className="text-xs"
              >
                {isArabic ? "المتبقي بالملعب" : "Due at Venue"}
              </Text>
              <Text
                style={{ color: isDark ? "#f59e0b" : "#d97706" }}
                className="text-xs font-bold"
              >
                {formatCurrency(remainingAtVenue)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Primary Action Button */}
      <Button
        title={getButtonTitle()}
        loading={isLoading}
        disabled={disabled || isLoading}
        onPress={onBookNow}
        size="lg"
        className="w-full"
      />
    </View>
  );
}

