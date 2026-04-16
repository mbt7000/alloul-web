import React, { useState } from "react";
import { Platform } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../../features/auth/screens/LoginScreen";
import MobileSplashScreen from "../../features/auth/screens/MobileSplashScreen";

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  // On mobile: show splash first, then login form
  // On web: go straight to login (web has its own landing page)
  const [showSplash, setShowSplash] = useState(Platform.OS !== "web");

  if (Platform.OS !== "web" && showSplash) {
    return (
      <MobileSplashScreen
        onSignIn={() => setShowSplash(false)}
        onRegister={() => setShowSplash(false)}
      />
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={LoginScreen} />
    </Stack.Navigator>
  );
}
