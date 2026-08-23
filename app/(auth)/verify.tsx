import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

/**
 * Deprecated verification screen: Phone OTP has been replaced with Google OAuth 2.0.
 */
export default function VerifyScreen() {
  const router = useRouter();

  useEffect(() => {
    // Graceful redirect to Google OAuth login
    router.replace('/(auth)/login');
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-[#04060c] items-center justify-center p-6">
      <ActivityIndicator size="large" color="#22c55e" />
      <Text className="text-white text-sm font-bold mt-4">
        Redirecting to Google Sign-In...
      </Text>
    </SafeAreaView>
  );
}
