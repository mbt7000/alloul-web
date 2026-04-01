import "react-native-gesture-handler";
import React from "react";
import { StatusBar, ActivityIndicator, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { I18nextProvider } from "react-i18next";
import i18n from "./src/i18n";
import { AuthProvider, useAuth } from "./src/state/auth/AuthContext";
import { NotificationsProvider } from "./src/state/notifications/NotificationsContext";
import { CompanyProvider } from "./src/state/company/CompanyContext";
import { HomeModeProvider } from "./src/state/mode/HomeModeContext";
import LanguageSync from "./src/shared/LanguageSync";
import { colors } from "./src/theme/colors";
import OnboardingScreen from "./src/features/onboarding/screens/OnboardingScreen";
import { getOnboardingCompleted, setOnboardingCompleted } from "./src/storage/session";
import RootNavigation from "./src/navigation/RootNavigator";
import AuthNavigator from "./src/navigation/auth/AuthNavigator";

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bgSurface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accent,
    notification: colors.accentRose,
  },
};

function RootNavigator() {
  const { user, loading } = useAuth();
  const [onboarded, setOnboarded] = React.useState<boolean | null>(null);
  const [startupTimedOut, setStartupTimedOut] = React.useState(false);

  React.useEffect(() => {
    let on = true;
    const watchdog = setTimeout(() => {
      if (on) setOnboarded(false);
    }, 3500);
    void (async () => {
      const done = await getOnboardingCompleted();
      if (on) setOnboarded(done);
    })();
    return () => {
      on = false;
      clearTimeout(watchdog);
    };
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => setStartupTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  if ((loading && !startupTimedOut) || onboarded == null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accentCyan} />
      </View>
    );
  }

  if (!onboarded) {
    return (
      <OnboardingScreen
        onDone={() => {
          void (async () => {
            await setOnboardingCompleted();
            setOnboarded(true);
          })();
        }}
      />
    );
  }

  return user ? <RootNavigation /> : <AuthNavigator />;
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <LanguageSync />
          <AuthProvider>
            <NotificationsProvider>
              <CompanyProvider>
                <HomeModeProvider>
                  <NavigationContainer theme={DarkTheme}>
                    <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
                    <RootNavigator />
                  </NavigationContainer>
                </HomeModeProvider>
              </CompanyProvider>
            </NotificationsProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </I18nextProvider>
  );
}
