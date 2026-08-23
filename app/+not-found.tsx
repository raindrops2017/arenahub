import React from "react";
import { Link, Stack } from "expo-router";
import { Text } from "@/components/ui/AppText";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found", headerShown: false }} />
      <SafeAreaView className="flex-1 bg-[#04060c] justify-center items-center px-6">
        <Text className="text-4xl font-extrabold text-white mb-2">404</Text>
        <Text className="text-lg text-slate-300 mb-6 text-center">
          This screen doesn&apos;t exist.
        </Text>
        <Link href="/" className="bg-[#22c55e] px-6 py-3 rounded-xl overflow-hidden active:opacity-80">
          <Text className="text-[#04060c] font-bold text-base">Go to Home</Text>
        </Link>
      </SafeAreaView>
    </>
  );
}
