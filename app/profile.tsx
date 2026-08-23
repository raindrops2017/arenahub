import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ProfileHeader } from '@/features/passport/components/ProfileHeader';
import { PlayerAttributesEditor } from '@/features/passport/components/PlayerAttributesEditor';
import { CustomerBookingsList } from '@/features/bookings/components/CustomerBookingsList';
import { FifaPlayerCardModal } from '@/components/FifaPlayerCardModal';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { socketService } from '@/services/api/socketService';
import {
  useUserBookings,
  useCustomerWallet,
} from '@/features/bookings/api/useBookingsQuery';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateProfile, logout } = useAuth();
  const { t, isArabic } = useLanguage();
  const { colors, isDark } = useTheme();

  const userId = user?._id || user?.id || '';

  const [name, setName] = useState<string>(() => user?.userName || user?.name || '');
  const [email, setEmail] = useState<string>(() => user?.email || '');
  const [phone, setPhone] = useState<string>(() => user?.phone || '');
  const [position, setPosition] = useState<string>(() =>
    user?.position || user?.favoritePosition || 'CAM'
  );
  const [foot, setFoot] = useState<string>(() => user?.preferredFoot || 'RIGHT');
  const [jersey, setJersey] = useState<string>(() => user?.jerseyNumber || '10');

  const [pushNotifications, setPushNotifications] = useState<boolean>(true);
  const [matchReminders, setMatchReminders] = useState<boolean>(true);
  const [showFifaCard, setShowFifaCard] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // TanStack Query hooks for live customer bookings and wallet
  const { data: customerBookings = [], refetch: refetchBookings } = useUserBookings();
  const { data: wallet, refetch: refetchWallet } = useCustomerWallet(userId);

  // Live WebSocket listener to automatically update bookings & wallet on payment confirmation
  useEffect(() => {
    const unsubConfirmed = socketService.onBookingConfirmed(() => {
      refetchBookings();
      refetchWallet();
    });

    return () => {
      unsubConfirmed();
    };
  }, [refetchBookings, refetchWallet]);

  useEffect(() => {
    if (user) {
      setName(user.userName || user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      if (user.position || user.favoritePosition) {
        setPosition(user.position || user.favoritePosition || 'CAM');
      }
      if (user.preferredFoot) setFoot(user.preferredFoot);
      if (user.jerseyNumber) setJersey(user.jerseyNumber);
    }
  }, [user]);

  const currentWalletBalance =
    wallet?.balance !== undefined
      ? wallet.balance
      : user?.walletBalance !== undefined
      ? user.walletBalance
      : 0;

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert(
        t('common.error'),
        t('common.nameRequired')
      );
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({
        userName: name.trim(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        position,
        favoritePosition: position,
        preferredFoot: foot,
        jerseyNumber: jersey,
      });
      setIsSaving(false);
      Alert.alert(t('common.success'), t('profile.savedSuccess'));
    } catch (err: any) {
      setIsSaving(false);
      Alert.alert(t('common.error'), err.message || t('common.somethingWentWrong'));
    }
  };

  const handleLogout = () => {
    Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <ProfileHeader
          user={user}
          walletBalance={currentWalletBalance}
          onOpenFifaCard={() => setShowFifaCard(true)}
          onBack={() => router.back()}
        />

        {/* Appearance & Theme Selection Card */}
        <View className="mb-6 px-5">
          <Text
            style={[
              { color: colors.textPrimary },
              isArabic
                ? {
                    fontFamily: 'DroidArabicKufi',
                    textAlign: 'right',
                    writingDirection: 'rtl',
                  }
                : undefined,
            ]}
            className="font-bold text-base mb-3"
          >
            {t('profile.appearance')}
          </Text>
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            }}
            className="border rounded-3xl p-4 shadow-sm"
          >
            <View
              className={`flex-row items-center justify-between mb-3 ${
                isArabic ? 'flex-row-reverse' : ''
              }`}
            >
              <View
                className={`flex-row items-center flex-1 ${
                  isArabic ? 'ml-2 flex-row-reverse' : 'mr-2'
                }`}
              >
                <Ionicons
                  name={isDark ? 'moon-outline' : 'sunny-outline'}
                  size={20}
                  color={isDark ? '#eab308' : '#16a34a'}
                />
                <View className={isArabic ? 'mr-3 items-end' : 'ml-3 items-start'}>
                  <Text
                    style={[
                      { color: colors.textPrimary },
                      isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                    ]}
                    className="text-sm font-semibold"
                  >
                    {t('profile.appearance')}
                  </Text>
                  <Text
                    style={[
                      { color: colors.mutedForeground },
                      isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                    ]}
                    className="text-xs mt-0.5"
                  >
                    {t('profile.appearanceDesc')}
                  </Text>
                </View>
              </View>
            </View>

            <ThemeToggle variant="segmented" />
          </View>
        </View>

        {/* Language Selection Setting Card */}
        <View className="mb-6 px-5">
          <Text
            style={[
              { color: colors.textPrimary },
              isArabic
                ? {
                    fontFamily: 'DroidArabicKufi',
                    textAlign: 'right',
                    writingDirection: 'rtl',
                  }
                : undefined,
            ]}
            className="font-bold text-base mb-3"
          >
            {t('profile.language')}
          </Text>
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            }}
            className="border rounded-3xl p-4 shadow-sm"
          >
            <View
              className={`flex-row items-center justify-between mb-3 ${
                isArabic ? 'flex-row-reverse' : ''
              }`}
            >
              <View
                className={`flex-row items-center flex-1 ${
                  isArabic ? 'ml-2 flex-row-reverse' : 'mr-2'
                }`}
              >
                <Ionicons name="language-outline" size={20} color={isDark ? '#22c55e' : '#16a34a'} />
                <View className={isArabic ? 'mr-3 items-end' : 'ml-3 items-start'}>
                  <Text
                    style={[
                      { color: colors.textPrimary },
                      isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                    ]}
                    className="text-sm font-semibold"
                  >
                    {isArabic ? 'لغة التطبيق' : 'App Language'}
                  </Text>
                  <Text
                    style={[
                      { color: colors.mutedForeground },
                      isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                    ]}
                    className="text-xs mt-0.5"
                  >
                    {t('profile.languageDesc')}
                  </Text>
                </View>
              </View>
            </View>

            <LanguageToggle variant="full" />
          </View>
        </View>

        <PlayerAttributesEditor
          name={name}
          onChangeName={setName}
          email={email}
          onChangeEmail={setEmail}
          phone={phone}
          position={position}
          onSelectPosition={setPosition}
          preferredFoot={foot}
          onSelectFoot={setFoot}
          jerseyNumber={jersey}
          onChangeJerseyNumber={setJersey}
        />

        {/* Notifications & Preferences */}
        <View className="mb-6 px-5">
          <Text
            style={[
              { color: colors.textPrimary },
              isArabic
                ? {
                    fontFamily: 'DroidArabicKufi',
                    textAlign: 'right',
                    writingDirection: 'rtl',
                  }
                : undefined,
            ]}
            className="font-bold text-base mb-3"
          >
            {t('profile.appPreferences')}
          </Text>
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            }}
            className="border rounded-3xl p-4 flex-col gap-4 shadow-sm"
          >
            <View
              className={`flex-row items-center justify-between ${
                isArabic ? 'flex-row-reverse' : ''
              }`}
            >
              <View
                className={`flex-row items-center flex-1 ${
                  isArabic ? 'ml-2 flex-row-reverse' : 'mr-2'
                }`}
              >
                <Ionicons name="notifications-outline" size={20} color="#60a5fa" />
                <View className={isArabic ? 'mr-3 items-end' : 'ml-3 items-start'}>
                  <Text
                    style={[
                      { color: colors.textPrimary },
                      isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                    ]}
                    className="text-sm font-semibold"
                  >
                    {t('profile.pushNotifications')}
                  </Text>
                  <Text
                    style={[
                      { color: colors.mutedForeground },
                      isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                    ]}
                    className="text-xs mt-0.5"
                  >
                    {t('profile.pushNotificationsDesc')}
                  </Text>
                </View>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{ false: isDark ? '#1e293b' : '#cbd5e1', true: isDark ? '#22c55e' : '#16a34a' }}
                thumbColor="#ffffff"
              />
            </View>

            <View
              style={{ borderTopColor: colors.cardBorder }}
              className={`flex-row items-center justify-between pt-3 border-t ${
                isArabic ? 'flex-row-reverse' : ''
              }`}
            >
              <View
                className={`flex-row items-center flex-1 ${
                  isArabic ? 'ml-2 flex-row-reverse' : 'mr-2'
                }`}
              >
                <Ionicons name="alarm-outline" size={20} color="#fbbf24" />
                <View className={isArabic ? 'mr-3 items-end' : 'ml-3 items-start'}>
                  <Text
                    style={[
                      { color: colors.textPrimary },
                      isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                    ]}
                    className="text-sm font-semibold"
                  >
                    {t('profile.matchReminders')}
                  </Text>
                  <Text
                    style={[
                      { color: colors.mutedForeground },
                      isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                    ]}
                    className="text-xs mt-0.5"
                  >
                    {t('profile.matchRemindersDesc')}
                  </Text>
                </View>
              </View>
              <Switch
                value={matchReminders}
                onValueChange={setMatchReminders}
                trackColor={{ false: isDark ? '#1e293b' : '#cbd5e1', true: isDark ? '#22c55e' : '#16a34a' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Match Bookings History */}
        <CustomerBookingsList
          bookings={customerBookings}
          onRefresh={() => {
            refetchBookings();
            refetchWallet();
          }}
        />

        {/* Actions */}
        <View className="px-5 flex-col gap-3">
          <Button
            title={isSaving ? t('profile.saving') : t('profile.saveChanges')}
            loading={isSaving}
            onPress={handleSaveProfile}
            size="lg"
            className="w-full"
          />

          <Button
            title={t('profile.logout')}
            variant="ghost"
            onPress={handleLogout}
            textClassName="text-red-500 font-bold"
            className="w-full mt-1"
          />
        </View>
      </ScrollView>

      {/* FIFA FUT Card Modal */}
      <FifaPlayerCardModal
        visible={showFifaCard}
        onClose={() => setShowFifaCard(false)}
        user={user}
        walletBalance={currentWalletBalance}
        totalBookings={customerBookings.length || user?.totalBookings || 0}
      />
    </SafeAreaView>
  );
}
