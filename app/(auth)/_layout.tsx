import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#04060c" },
        animation: "slide_from_right",
      }}
    />
  );
}
