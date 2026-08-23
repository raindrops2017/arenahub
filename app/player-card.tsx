import React from 'react';
import { View, ScrollView, Pressable, Alert } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { FifaCardDisplay } from '@/components/FifaCardDisplay';
import { Button } from '@/components/ui/Button';
import {
  useUserBookings,
  useCustomerWallet,
} from '@/features/bookings/api/useBookingsQuery';

export default function PlayerCardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, isArabic, formatCurrency } = useLanguage();
  const { colors, isDark } = useTheme();

  const userId = user?._id || user?.id || '';
  const { data: customerBookings = [] } = useUserBookings();
  const { data: wallet } = useCustomerWallet(userId);

  const walletBalance =
    wallet?.balance !== undefined
      ? wallet.balance
      : user?.walletBalance !== undefined
      ? user.walletBalance
      : 0;

  const handleShareCard = () => {
    Alert.alert(
      t('fifaCard.shareCard'),
      isArabic
        ? 'تم نسخ رابط بطاقة اللاعب إلى الحافظة بنجاح!'
        : 'Your FIFA Player Passport card link has been copied to clipboard!'
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      {/* Header Bar */}
      <View
        style={{ borderBottomColor: colors.cardBorder }}
        className={`px-5 py-3 flex-row items-center justify-between border-b ${
          isArabic ? 'flex-row-reverse' : ''
        }`}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          }}
          className="h-10 w-10 rounded-full border items-center justify-center active:opacity-70 shadow-sm"
        >
          <Ionicons
            name={isArabic ? 'arrow-forward' : 'arrow-back'}
            size={20}
            color={colors.textPrimary}
          />
        </Pressable>

        <Text
          style={[
            { color: colors.textPrimary },
            isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
          ]}
          className="text-base font-black uppercase tracking-wider"
        >
          {t('fifaCard.playerCard')}
        </Text>

        <Pressable
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel="Profile settings"
          style={{
            backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7',
            borderColor: isDark ? 'rgba(34, 197, 94, 0.5)' : '#86efac',
          }}
          className="h-10 w-10 rounded-full border items-center justify-center active:opacity-70 shadow-sm"
        >
          <Ionicons name="settings-outline" size={18} color={isDark ? '#22c55e' : '#16a34a'} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: Math.max(insets.bottom + 40, 60),
          alignItems: 'center',
        }}
      >
        {/* Main FUT Card */}
        <View className="mb-6">
          <FifaCardDisplay
            user={user}
            walletBalance={walletBalance}
            totalBookings={customerBookings.length || user?.totalBookings || 0}
          />
        </View>

        {/* Player Quick Metrics */}
        <View className={`w-full max-w-sm flex-row gap-3 mb-6 ${isArabic ? 'flex-row-reverse' : ''}`}>
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            }}
            className="flex-1 border p-3.5 rounded-2xl items-center shadow-sm"
          >
            <Text
              style={[
                { color: colors.mutedForeground },
                isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
              ]}
              className="text-[10px] font-bold uppercase mb-0.5"
            >
              {isArabic ? 'المباريات المحجوزة' : 'MATCHES BOOKED'}
            </Text>
            <Text
              style={[
                { color: isDark ? '#22c55e' : '#16a34a' },
                isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
              ]}
              className="text-base font-black"
            >
              {customerBookings.length || user?.totalBookings || 0} {isArabic ? 'مباراة' : 'MATCHES'}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            }}
            className="flex-1 border p-3.5 rounded-2xl items-center shadow-sm"
          >
            <Text
              style={[
                { color: colors.mutedForeground },
                isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
              ]}
              className="text-[10px] font-bold uppercase mb-0.5"
            >
              {isArabic ? 'رصيد المحفظة' : 'WALLET BALANCE'}
            </Text>
            <Text
              style={[
                { color: isDark ? '#22c55e' : '#16a34a' },
                isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
              ]}
              className="text-base font-black"
            >
              {formatCurrency(walletBalance)}
            </Text>
          </View>
        </View>

        {/* Action Button 1: Settings Page */}
        <Button
          title={isArabic ? 'تعديل الملف الشخصي والإعدادات' : 'EDIT PROFILE & SETTINGS'}
          onPress={() => router.push('/profile')}
          leftIcon={<Ionicons name="options-outline" size={18} color="#04060c" />}
          size="lg"
          className="w-full max-w-sm mb-3"
        />

        {/* Action Button 2: Share Player Card */}
        <Button
          title={t('fifaCard.shareCard')}
          variant="secondary"
          onPress={handleShareCard}
          leftIcon={<Ionicons name="share-social-outline" size={18} color={colors.textPrimary} />}
          size="lg"
          className="w-full max-w-sm"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
