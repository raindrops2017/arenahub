import React, { useState } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useSessionStore } from '@/features/auth/stores/useSessionStore';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithGoogle, loginWithGoogle, pendingBooking } = useAuth();
  const { t, isArabic } = useLanguage();
  const { colors, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [manualToken, setManualToken] = useState<string>('');
  const [error, setError] = useState<string>('');

  const navigateAfterAuth = () => {
    const currentUser = useSessionStore.getState().user;
    if (!currentUser?.phone || !currentUser.phone.trim()) {
      router.replace('/(auth)/profile-setup');
      return;
    }

    if (pendingBooking) {
      router.replace({
        pathname: '/pitch/[id]',
        params: { id: pendingBooking.venueId },
      });
    } else {
      router.replace('/');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      const success = await signInWithGoogle();
      setIsLoading(false);
      if (success) {
        navigateAfterAuth();
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(
        err?.message ||
          (isArabic
            ? 'حدث خطأ في تسجيل الدخول عبر Google.'
            : 'Google authentication failed. Please try again.')
      );
    }
  };

  const handleManualTokenSubmit = async () => {
    if (!manualToken.trim()) {
      Alert.alert(
        t('common.error'),
        isArabic ? 'يرجى إدخال رمز Google ID صالح' : 'Please enter a valid Google ID token'
      );
      return;
    }
    setIsLoading(true);
    try {
      const success = await loginWithGoogle(manualToken.trim());
      setIsLoading(false);
      if (success) {
        setIsManualModalOpen(false);
        navigateAfterAuth();
      }
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert(
        isArabic ? 'فشل التحقق' : 'Authentication Failed',
        err?.message || (isArabic ? 'رمز التحقق غير صالح' : 'Invalid Google ID token')
      );
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 40,
          flexGrow: 1,
          justifyContent: 'space-between',
        }}
      >
        <View>
          {/* Top Header Controls with Language Toggle */}
          <View
            className={`flex-row items-center justify-between mb-8 ${
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
              className="h-11 w-11 items-center justify-center rounded-full border active:opacity-70 shadow-sm"
            >
              <Ionicons
                name={isArabic ? 'arrow-forward' : 'arrow-back'}
                size={20}
                color={colors.textPrimary}
              />
            </Pressable>

            <View className={`flex-row items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
              <FontAwesome5 name="futbol" size={20} color={isDark ? '#22c55e' : '#16a34a'} />
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: isArabic ? 'DroidArabicKufi' : undefined,
                }}
                className={`${isArabic ? 'mr-2.5' : 'ml-2.5'} text-2xl tracking-widest uppercase font-black`}
              >
                {isArabic ? (
                  <>
                    أرينا<Text style={{ color: isDark ? '#22c55e' : '#16a34a' }}>هاب</Text>
                  </>
                ) : (
                  <>
                    ARENA<Text style={{ color: isDark ? '#22c55e' : '#16a34a' }}>HUB</Text>
                  </>
                )}
              </Text>
            </View>

            <LanguageToggle variant="compact" />
          </View>

          {/* Pending Booking Intercept Alert */}
          {pendingBooking && (
            <View
              style={{
                backgroundColor: colors.card,
                borderColor: isDark ? 'rgba(34, 197, 94, 0.4)' : '#16a34a',
              }}
              className={`mb-6 border p-4 rounded-2xl flex-row items-center shadow-sm ${
                isArabic ? 'flex-row-reverse' : ''
              }`}
            >
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7',
                }}
                className={`h-10 w-10 rounded-full items-center justify-center ${
                  isArabic ? 'ml-3' : 'mr-3'
                }`}
              >
                <Ionicons name="bookmark" size={20} color={isDark ? '#22c55e' : '#16a34a'} />
              </View>
              <View className={`flex-1 ${isArabic ? 'items-end' : 'items-start'}`}>
                <Text
                  style={[
                    { color: isDark ? '#22c55e' : '#16a34a' },
                    isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                  ]}
                  className="text-xs font-extrabold uppercase"
                >
                  {isArabic ? 'حجز قيد الانتظار' : 'Booking in Progress'}
                </Text>
                <Text
                  style={[
                    { color: colors.textSecondary },
                    isArabic ? { fontFamily: 'DroidArabicKufi', textAlign: 'right' } : undefined,
                  ]}
                  className="text-xs font-medium mt-0.5"
                >
                  {isArabic
                    ? `سجل دخولك لتأكيد حجزك في ${pendingBooking.venueName || 'الملعب'}.`
                    : `Sign in with Google to secure your slot at ${pendingBooking.venueName || 'Venue'}.`}
                </Text>
              </View>
            </View>
          )}

          {/* Title & Subtitle */}
          <View className={`mb-8 ${isArabic ? 'items-end' : 'items-start'}`}>
            <Text
              style={[
                { color: colors.textPrimary },
                isArabic
                  ? { fontFamily: 'DroidArabicKufi', textAlign: 'right' }
                  : undefined,
              ]}
              className="text-3xl uppercase tracking-wider font-black mb-2"
            >
              {t('auth.loginTitle')}
            </Text>
            <Text
              style={[
                { color: colors.mutedForeground },
                isArabic
                  ? { fontFamily: 'DroidArabicKufi', textAlign: 'right' }
                  : undefined,
              ]}
              className="text-sm font-medium leading-relaxed"
            >
              {t('auth.loginSubtitle')}
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View className="mb-6 bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl">
              <View
                className={`flex-row items-center mb-1 ${
                  isArabic ? 'flex-row-reverse' : ''
                }`}
              >
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text
                  style={isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined}
                  className={`${isArabic ? 'mr-2' : 'ml-2'} text-xs text-red-500 font-bold flex-1`}
                >
                  {isArabic ? 'تنبيه المصادقة' : 'OAuth Notice'}
                </Text>
              </View>
              <Text
                style={[
                  { color: colors.textSecondary },
                  isArabic ? { fontFamily: 'DroidArabicKufi', textAlign: 'right' } : undefined,
                ]}
                className="text-xs leading-relaxed"
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* Google Sign-In Card */}
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            }}
            className="border rounded-3xl p-6 mb-6 shadow-sm"
          >
            <View className="items-center mb-6">
              <View
                style={{
                  backgroundColor: isDark ? '#141d2e' : '#f1f5f9',
                }}
                className="h-16 w-16 rounded-full items-center justify-center mb-3"
              >
                <AntDesign name="google" size={32} color={colors.textPrimary} />
              </View>
              <Text
                style={[
                  { color: colors.textPrimary },
                  isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                ]}
                className="text-lg font-black uppercase tracking-wider"
              >
                {isArabic ? 'تسجيل الدخول الموحد' : 'Google Single Sign-On'}
              </Text>
              <Text
                style={[
                  { color: colors.mutedForeground },
                  isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                ]}
                className="text-xs text-center mt-1"
              >
                {isArabic
                  ? 'تسجيل سريع وآمن باستخدام حساب Google المعتمد'
                  : 'Fast, secure sign in with verified Google account'}
              </Text>
            </View>

            {/* Primary Google Auth Button */}
            <Pressable
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              style={{
                backgroundColor: isDark ? '#ffffff' : '#0f172a',
              }}
              className={`w-full py-4 px-6 rounded-2xl flex-row items-center justify-center shadow-md mb-3 active:opacity-90 ${
                isArabic ? 'flex-row-reverse' : ''
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color={isDark ? '#04060c' : '#ffffff'} />
              ) : (
                <>
                  <AntDesign name="google" size={20} color={isDark ? '#04060c' : '#ffffff'} />
                  <Text
                    style={[
                      { color: isDark ? '#04060c' : '#ffffff' },
                      isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                    ]}
                    className={`${
                      isArabic ? 'mr-3' : 'ml-3'
                    } text-sm font-black uppercase tracking-wider`}
                  >
                    {t('auth.googleSignIn')}
                  </Text>
                </>
              )}
            </Pressable>

            {/* Developer / ID Token Entry Button */}
            <Pressable
              onPress={() => setIsManualModalOpen(true)}
              style={{
                backgroundColor: isDark ? '#0c1222' : '#f8fafc',
                borderColor: colors.cardBorder,
              }}
              className={`w-full border py-3 px-4 rounded-2xl flex-row items-center justify-center active:opacity-80 ${
                isArabic ? 'flex-row-reverse' : ''
              }`}
            >
              <Ionicons name="code-slash" size={16} color={colors.mutedForeground} />
              <Text
                style={[
                  { color: colors.mutedForeground },
                  isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                ]}
                className={`${isArabic ? 'mr-2' : 'ml-2'} text-xs font-bold`}
              >
                {isArabic ? 'إدخال رمز Google ID / تسجيل المطور' : 'Enter Google ID Token / Dev Login'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Footer & Privacy Notice */}
        <View className="items-center">
          <Text
            style={[
              { color: colors.mutedForeground },
              isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
            ]}
            className="text-[11px] text-center leading-relaxed font-medium max-w-xs"
          >
            {t('auth.termsNotice')}
          </Text>
        </View>
      </ScrollView>

      {/* Manual ID Token Tester Modal */}
      <Modal
        visible={isManualModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsManualModalOpen(false)}
      >
        <View
          style={{ backgroundColor: colors.modalOverlay }}
          className="flex-1 justify-center items-center px-6"
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            }}
            className="w-full max-w-sm border rounded-3xl p-6 shadow-2xl"
          >
            <View
              className={`flex-row items-center justify-between mb-4 ${
                isArabic ? 'flex-row-reverse' : ''
              }`}
            >
              <Text
                style={[
                  { color: colors.textPrimary },
                  isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                ]}
                className="text-base font-black uppercase tracking-wider"
              >
                {isArabic ? 'تسجيل برمز Google ID' : 'Google ID Token Sign-In'}
              </Text>
              <Pressable
                onPress={() => setIsManualModalOpen(false)}
                style={{ backgroundColor: isDark ? '#141d2e' : '#f1f5f9' }}
                className="h-8 w-8 items-center justify-center rounded-full"
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Text
              style={[
                { color: colors.mutedForeground },
                isArabic
                  ? { fontFamily: 'DroidArabicKufi', textAlign: 'right' }
                  : undefined,
              ]}
              className="text-xs mb-4 leading-relaxed"
            >
              {isArabic
                ? 'الصق رمز Google OAuth ID Token للتحقق المباشر مع الخادم.'
                : 'Paste a verified Google OAuth ID Token to authenticate directly with the backend.'}
            </Text>

            <TextInput
              value={manualToken}
              onChangeText={setManualToken}
              placeholder="eyJhbGciOiJSUzI1NiIsImtpZCI6Ij..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              style={{
                backgroundColor: isDark ? '#030712' : '#f8fafc',
                borderColor: colors.inputBorder,
                color: colors.textPrimary,
              }}
              className="w-full border rounded-xl p-3 text-xs mb-4 font-mono"
            />

            <Pressable
              onPress={handleManualTokenSubmit}
              disabled={isLoading}
              style={{
                backgroundColor: isDark ? '#22c55e' : '#16a34a',
              }}
              className="w-full py-3.5 rounded-xl items-center justify-center shadow-lg active:opacity-90"
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text
                  style={[
                    { color: isDark ? '#04060c' : '#ffffff' },
                    isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                  ]}
                  className="text-xs font-black uppercase tracking-wider"
                >
                  {isArabic ? 'تحقق وتسجيل الدخول' : 'Verify & Sign In'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
