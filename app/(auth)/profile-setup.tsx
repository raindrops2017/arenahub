import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { useSessionStore } from '@/features/auth/stores/useSessionStore';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { LanguageToggle } from '@/components/LanguageToggle';

const POSITIONS = ['ST', 'CAM', 'CM', 'RW', 'LW', 'CB', 'GK'] as const;

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { updateProfile, pendingBooking } = useAuth();
  const sessionUser = useSessionStore((s) => s.user);
  const { isArabic, translatePosition } = useLanguage();
  const { colors, isDark } = useTheme();

  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [position, setPosition] = useState<string>('CAM');
  const [avatarUri, setAvatarUri] = useState<string>('');
  const [selectedImageFile, setSelectedImageFile] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize form with Google / session profile details
  useEffect(() => {
    if (sessionUser) {
      setName(sessionUser.userName || sessionUser.name || '');
      setPhone(sessionUser.phone || '');
      if (sessionUser.position || sessionUser.favoritePosition) {
        setPosition(sessionUser.position || sessionUser.favoritePosition || 'CAM');
      }
      if (sessionUser.avatar) {
        setAvatarUri(sessionUser.avatar);
      }
    }
  }, [sessionUser]);

  // Pick profile photo from device gallery
  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          isArabic ? 'إذن الوصول مطلوب' : 'Permission Required',
          isArabic
            ? 'يرجى السماح للتطبيق بالوصول إلى المعرض لاختيار صورة الملف الشخصي.'
            : 'Please grant access to your photo library to pick an avatar.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAvatarUri(asset.uri);
        setSelectedImageFile({
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || 'profile_avatar.jpg',
        });
      }
    } catch (err: any) {
      console.warn('Image picker error:', err?.message || err);
    }
  };

  // Validate Egyptian / International phone format
  const validatePhone = (input: string): boolean => {
    const cleaned = input.trim().replace(/\s+/g, '');
    const egyptianRegex = /^(010|011|012|015)[0-9]{8}$/;
    const internationalRegex = /^\+?[0-9]{10,15}$/;
    return egyptianRegex.test(cleaned) || internationalRegex.test(cleaned);
  };

  const handleSaveProfile = async () => {
    setError('');

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setError(
        isArabic
          ? 'رقم الهاتف مطلوب لتأكيد الحجوزات والتواصل.'
          : 'Phone number is required for booking confirmations.'
      );
      return;
    }

    if (!validatePhone(trimmedPhone)) {
      setError(
        isArabic
          ? 'يرجى إدخال رقم هاتف صحيح (مثال: 01012345678).'
          : 'Please enter a valid phone number (e.g. 01012345678).'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        userName: name.trim() || undefined,
        name: name.trim() || undefined,
        phone: trimmedPhone,
        position: position,
        favoritePosition: position,
        avatar: selectedImageFile || (avatarUri && !avatarUri.startsWith('file:') ? avatarUri : undefined),
      });

      setIsSubmitting(false);

      // Route after successful profile completion
      if (pendingBooking) {
        router.replace({
          pathname: '/pitch/[id]',
          params: { id: pendingBooking.venueId },
        });
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      const errMsg =
        err?.message ||
        (isArabic
          ? 'تعذر حفظ البيانات. يرجى التأكد من أن رقم الهاتف غير مستخدم من قبل.'
          : 'Failed to update profile. Ensure phone number is not in use.');
      setError(errMsg);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 40,
            flexGrow: 1,
          }}
        >
          {/* Header Controls */}
          <View
            className={`flex-row items-center justify-between mb-6 ${
              isArabic ? 'flex-row-reverse' : ''
            }`}
          >
            <View>
              <Text className="text-2xl font-black" style={{ color: colors.textPrimary }}>
                {isArabic ? 'إكمال الملف الشخصي' : 'Complete Profile'}
              </Text>
              <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                {isArabic
                  ? 'أضف بياناتك لتأكيد الحجوزات والانضمام للمباريات'
                  : 'Add your details to confirm bookings and join matches'}
              </Text>
            </View>
            <LanguageToggle />
          </View>

          {/* Error Banner */}
          {error ? (
            <View
              className="mb-6 p-4 rounded-2xl flex-row items-center"
              style={{
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5',
                borderWidth: 1,
              }}
            >
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text
                className="text-xs font-semibold flex-1 ml-2.5"
                style={{ color: isDark ? '#fca5a5' : '#b91c1c' }}
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* Profile Photo Picker */}
          <View className="items-center my-4">
            <View className="relative">
              <Pressable
                onPress={handlePickImage}
                style={({ pressed }) => [
                  {
                    width: 104,
                    height: 104,
                    borderRadius: 52,
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    borderWidth: 2,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <Ionicons name="person" size={48} color={colors.textSecondary} />
                )}
              </Pressable>

              <Pressable
                onPress={handlePickImage}
                style={({ pressed }) => [
                  {
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    backgroundColor: '#22c55e',
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    borderColor: colors.background,
                    borderWidth: 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Ionicons name="camera" size={16} color="#ffffff" />
              </Pressable>
            </View>
            <Text className="text-xs mt-2.5 font-bold text-[#22c55e]">
              {isArabic ? 'تغيير الصورة' : 'Change Photo'}
            </Text>
          </View>

          {/* Form Fields */}
          <View className="space-y-4 mt-2">
            {/* Full Name */}
            <View>
              <Text
                className="text-xs font-bold uppercase mb-2"
                style={{ color: colors.textSecondary, textAlign: isArabic ? 'right' : 'left' }}
              >
                {isArabic ? 'الاسم بالكامل' : 'Full Name'}
              </Text>
              <View
                className={`flex-row items-center px-4 py-3.5 rounded-2xl border ${
                  isArabic ? 'flex-row-reverse' : ''
                }`}
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                }}
              >
                <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={isArabic ? 'أدخل اسمك' : 'Enter your name'}
                  placeholderTextColor={colors.textSecondary}
                  style={{
                    flex: 1,
                    color: colors.textPrimary,
                    marginLeft: isArabic ? 0 : 12,
                    marginRight: isArabic ? 12 : 0,
                    textAlign: isArabic ? 'right' : 'left',
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                />
              </View>
            </View>

            {/* Phone Number (Required) */}
            <View>
              <View
                className={`flex-row items-center justify-between mb-2 ${
                  isArabic ? 'flex-row-reverse' : ''
                }`}
              >
                <Text
                  className="text-xs font-bold uppercase"
                  style={{ color: colors.textSecondary }}
                >
                  {isArabic ? 'رقم الهاتف' : 'Phone Number'}
                </Text>
                <Text className="text-[11px] font-bold text-red-500">
                  {isArabic ? '* مطلوب' : '* Required'}
                </Text>
              </View>
              <View
                className={`flex-row items-center px-4 py-3.5 rounded-2xl border ${
                  isArabic ? 'flex-row-reverse' : ''
                }`}
                style={{
                  backgroundColor: colors.card,
                  borderColor: error && !phone.trim() ? '#ef4444' : colors.cardBorder,
                }}
              >
                <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (error) setError('');
                  }}
                  keyboardType="phone-pad"
                  placeholder={isArabic ? '01012345678' : '01012345678'}
                  placeholderTextColor={colors.textSecondary}
                  style={{
                    flex: 1,
                    color: colors.textPrimary,
                    marginLeft: isArabic ? 0 : 12,
                    marginRight: isArabic ? 12 : 0,
                    textAlign: isArabic ? 'right' : 'left',
                    fontSize: 15,
                    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                    fontWeight: '700',
                  }}
                />
              </View>
            </View>

            {/* Playing Position Selector */}
            <View className="mt-2">
              <Text
                className="text-xs font-bold uppercase mb-2.5"
                style={{ color: colors.textSecondary, textAlign: isArabic ? 'right' : 'left' }}
              >
                {isArabic ? 'المركز المفضل' : 'Preferred Position'}
              </Text>
              <View
                className={`flex-row flex-wrap gap-2 ${
                  isArabic ? 'flex-row-reverse' : ''
                }`}
              >
                {POSITIONS.map((pos) => {
                  const isSelected = position === pos;
                  return (
                    <Pressable
                      key={pos}
                      onPress={() => setPosition(pos)}
                      style={({ pressed }) => [
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? '#22c55e'
                              : '#16a34a'
                            : colors.card,
                          borderColor: isSelected
                            ? isDark
                              ? '#22c55e'
                              : '#16a34a'
                            : colors.cardBorder,
                          borderWidth: 1.5,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 12,
                        },
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Text
                        style={[
                          {
                            color: isSelected
                              ? isDark
                                ? '#04060c'
                                : '#ffffff'
                              : colors.textPrimary,
                          },
                          isArabic ? { fontFamily: 'DroidArabicKufi' } : undefined,
                        ]}
                        className="text-xs font-extrabold"
                      >
                        {isArabic ? translatePosition(pos).split(' - ')[0] : pos}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <View className="mt-8">
            <Pressable
              onPress={handleSaveProfile}
              disabled={isSubmitting}
              style={({ pressed }) => [
                {
                  backgroundColor: '#22c55e',
                  paddingVertical: 16,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-black text-base">
                  {isArabic ? 'حفظ ومتابعة' : 'Save & Continue'}
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
