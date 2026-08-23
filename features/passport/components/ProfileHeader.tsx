import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

interface ProfileHeaderProps {
  user: {
    userName?: string;
    name?: string;
    phone?: string;
    position?: string;
    favoritePosition?: string;
    email?: string;
    [key: string]: any;
  } | null;
  walletBalance?: number;
  currency?: string;
  onOpenFifaCard: () => void;
  onBack: () => void;
}

export function ProfileHeader({
  user,
  walletBalance = 0,
  onOpenFifaCard,
  onBack,
}: ProfileHeaderProps) {
  const { t, isArabic, formatCurrency, translatePosition } = useLanguage();
  const { colors, isDark } = useTheme();

  const userName = user?.userName || user?.name || (isArabic ? 'كريم أحمد' : 'Kareem Ahmed');
  const userInitials =
    userName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'KA';

  const position = user?.position || user?.favoritePosition || 'CAM';

  return (
    <View className="px-5 pt-2 pb-4">
      {/* Top Navigation */}
      <View
        className={`flex-row items-center justify-between mb-4 ${
          isArabic ? 'flex-row-reverse' : ''
        }`}
      >
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          }}
          className="h-10 w-10 rounded-full border items-center justify-center active:opacity-70 shadow-sm"
        >
          <Ionicons
            name={isArabic ? 'chevron-forward' : 'chevron-back'}
            size={22}
            color={colors.textPrimary}
          />
        </Pressable>
        <Text
          style={[
            { color: colors.textPrimary },
            isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
          ]}
          className="text-lg font-black uppercase tracking-wider"
        >
          {t('profile.title')}
        </Text>
        <View className="w-10" />
      </View>

      {/* Profile Card Banner */}
      <View
        style={{
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        }}
        className={`border rounded-3xl p-4 flex-row items-center justify-between shadow-sm ${
          isArabic ? 'flex-row-reverse' : ''
        }`}
      >
        <View
          className={`flex-row items-center flex-1 ${
            isArabic ? 'ml-3 flex-row-reverse' : 'mr-3'
          }`}
        >
          <View
            style={{
              backgroundColor: isDark ? '#22c55e' : '#16a34a',
            }}
            className={`h-14 w-14 rounded-2xl items-center justify-center ${
              isArabic ? 'ml-3' : 'mr-3'
            } shadow-md`}
          >
            <Text
              style={isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined}
              className="text-[#ffffff] font-black text-xl"
            >
              {userInitials}
            </Text>
          </View>
          <View className={`flex-1 ${isArabic ? 'items-end' : 'items-start'}`}>
            <Text
              style={[
                { color: colors.textPrimary },
                isArabic
                  ? { fontFamily: 'DroidArabicKufi', textAlign: 'right' }
                  : undefined,
              ]}
              className="font-extrabold text-lg"
              numberOfLines={1}
            >
              {userName}
            </Text>
            <Text
              style={[
                { color: colors.mutedForeground },
                isArabic
                  ? { fontFamily: 'DroidArabicKufi', textAlign: 'right' }
                  : undefined,
              ]}
              className="text-xs mt-0.5"
            >
              {user?.phone || user?.email || '+20 100 000 0000'}
            </Text>
            <View
              className={`flex-row items-center mt-1 ${
                isArabic ? 'flex-row-reverse' : ''
              }`}
            >
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7',
                  borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#86efac',
                }}
                className={`px-2 py-0.5 rounded-md border ${
                  isArabic ? 'ml-2' : 'mr-2'
                }`}
              >
                <Text
                  style={[
                    { color: isDark ? '#22c55e' : '#16a34a' },
                    isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                  ]}
                  className="text-[10px] font-bold"
                >
                  {translatePosition(position)}
                </Text>
              </View>
              <Text
                style={[
                  { color: '#3b82f6' },
                  isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                ]}
                className="text-[10px] font-bold"
              >
                {isArabic
                  ? `المحفظة: ${formatCurrency(walletBalance)}`
                  : `Wallet: ${formatCurrency(walletBalance)}`}
              </Text>
            </View>
          </View>
        </View>

        {/* FUT Passport Trigger */}
        <Pressable
          onPress={onOpenFifaCard}
          accessibilityRole="button"
          accessibilityLabel="View FIFA Player Card"
          style={{
            backgroundColor: isDark ? '#141d2e' : '#f1f5f9',
            borderColor: isDark ? 'rgba(34, 197, 94, 0.4)' : '#16a34a',
          }}
          className="border p-2.5 rounded-2xl items-center justify-center active:opacity-80 shadow-sm"
        >
          <FontAwesome5 name="id-card" size={20} color={isDark ? '#22c55e' : '#16a34a'} />
          <Text
            style={[
              { color: isDark ? '#22c55e' : '#16a34a' },
              isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
            ]}
            className="text-[9px] font-extrabold mt-1 uppercase"
          >
            {isArabic ? 'بطاقتي' : 'FUT Card'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
