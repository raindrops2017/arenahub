import { useEffect } from "react";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/AppText";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
} from "@expo-google-fonts/montserrat";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { QueryProvider } from "@/lib/queryClient";
import "@/global.css";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView className="flex-1 bg-[#04060c] justify-center items-center px-6">
      <View className="bg-[#070b14] border border-[#141d2e] p-6 rounded-2xl w-full max-w-md items-center">
        <Text className="text-2xl font-bold text-white mb-2 text-center">
          Something went wrong / حدث خطأ
        </Text>
        <Text className="text-slate-400 text-sm text-center mb-6">
          {error.message || "An unexpected error occurred in the application."}
        </Text>
        <Pressable
          onPress={retry}
          className="bg-[#22c55e] px-6 py-3 rounded-xl active:opacity-80 w-full items-center"
        >
          <Text className="text-[#04060c] font-bold text-base">Try Again / إعادة المحاولة</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function RootLayoutContent() {
  const { colors, isDark } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} translucent backgroundColor="transparent" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="pitch/[id]" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="player-card" />
        <Stack.Screen name="contact" />
        <Stack.Screen name="(auth)" options={{ presentation: "modal" }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Montserrat_900Black,
    Montserrat: Montserrat_700Bold,
    "Montserrat-Regular": Montserrat_400Regular,
    "Montserrat-Medium": Montserrat_500Medium,
    "Montserrat-SemiBold": Montserrat_600SemiBold,
    "Montserrat-Bold": Montserrat_700Bold,
    "Montserrat-ExtraBold": Montserrat_800ExtraBold,
    "Montserrat-Black": Montserrat_900Black,
    BebasNeue_400Regular,
    DroidKufi_Regular: require("../assets/fonts/Droid.Arabic.Kufi.ttf"),
    "DroidKufi_Regular-Bold": require("../assets/fonts/Droid.Arabic.Kufi.ttf"),
    "DroidKufi_Regular-Regular": require("../assets/fonts/Droid.Arabic.Kufi.ttf"),
    "DroidKufi_Bold": require("../assets/fonts/Droid.Arabic.Kufi.ttf"),
    "Droid.Arabic.Kufi": require("../assets/fonts/Droid.Arabic.Kufi.ttf"),
    "DroidArabicKufi": require("../assets/fonts/Droid.Arabic.Kufi.ttf"),
    "DroidArabicKufi-Regular": require("../assets/fonts/Droid.Arabic.Kufi.ttf"),
    "DroidArabicKufi-Bold": require("../assets/fonts/Droid.Arabic.Kufi.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <RootLayoutContent />
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
