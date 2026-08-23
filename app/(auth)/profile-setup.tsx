import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

/**
 * Deprecated profile setup screen: Profile is automatically provisioned via Google OAuth 2.0.
 */
export default function ProfileSetupScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-[#04060c] items-center justify-center p-6">
      <ActivityIndicator size="large" color="#22c55e" />
      <Text className="text-white text-sm font-bold mt-4">
        Loading Player Profile...
      </Text>
    </SafeAreaView>
  );
}
