import "react-native-gesture-handler";
import { initSentry, captureException } from "./src/config/sentry";
initSentry();

import React from "react";
import { StatusBar, ActivityIndicator, View, Text, TouchableOpacity, Platform } from "react-native";
import { NavigationContainer, DefaultTheme, Theme as NavTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { I18nextProvider } from "react-i18next";
import i18n from "./src/i18n";
import { AuthProvider, useAuth } from "./src/state/auth/AuthContext";
import { NotificationsProvider } from "./src/state/notifications/NotificationsContext";
import { CompanyProvider } from "./src/state/company/CompanyContext";
import { HomeModeProvider } from "./src/state/mode/HomeModeContext";
import LanguageSync from "./src/shared/LanguageSync";
import { ThemeProvider, useAppTheme } from "./src/theme/ThemeContext";
import OnboardingScreen from "./src/features/onboarding/screens/OnboardingScreen";
import { getOnboardingCompleted, setOnboardingCompleted } from "./src/storage/session";
import RootNavigation from "./src/navigation/RootNavigator";
import AuthNavigator from "./src/navigation/auth/AuthNavigator";
import WebLandingScreen from "./src/features/web/WebLandingScreen";
import { CallProvider } from "./src/context/CallContext";
import IncomingCallScreen from "./src/components/calls/IncomingCallScreen";
import DailyCallScreen from "./src/components/calls/DailyCallScreen";

// ─── Global Error Boundary ────────────────────────────────────────────────────
interface ErrorBoundaryState { hasError: boolean; error: string | null }
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error: String(error) };
  }
  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[AppCrash]", error, info.componentStack);
    captureException(error, { componentStack: info.componentStack });
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0f", padding: 24 }}>
          <Text style={{ color: "#ef4444", fontSize: 18, fontWeight: "700", marginBottom: 12 }}>حدث خطأ غير متوقع</Text>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, textAlign: "center", marginBottom: 32 }}>{this.state.error}</Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ backgroundColor: "#0ea5e9", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function buildNavTheme(colors: ReturnType<typeof useAppTheme>["colors"], dark: boolean): NavTheme {
  return {
    ...DefaultTheme,
    dark,
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
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const { colors } = useAppTheme();
  const [onboarded, setOnboarded] = React.useState<boolean | null>(null);
  const [startupTimedOut, setStartupTimedOut] = React.useState(false);
  // Web-only: show landing page before login
  const [webLandingDone, setWebLandingDone] = React.useState(Platform.OS !== "web");

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

  // Web: skip loading spinner + onboarding entirely — go straight to landing page
  if (Platform.OS === "web") {
    if (user) return <RootNavigation />;
    if (!webLandingDone) return <WebLandingScreen onEnter={() => setWebLandingDone(true)} />;
    return <AuthNavigator />;
  }

  // Native: normal loading + onboarding flow
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

  if (user) return <RootNavigation />;
  return <AuthNavigator />;
}

function AppNavigation() {
  const { colors, mode } = useAppTheme();
  const navTheme = React.useMemo(() => buildNavTheme(colors, mode === "dark"), [colors, mode]);

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar
        barStyle={mode === "light" ? "dark-content" : "light-content"}
        backgroundColor={colors.bg}
      />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
    <I18nextProvider i18n={i18n}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <LanguageSync />
            <AuthProvider>
              <NotificationsProvider>
                <CompanyProvider>
                  <HomeModeProvider>
                    <CallProvider>
                      <AppNavigation />
                      {/* Global call overlays — rendered above Navigation */}
                      <IncomingCallScreen />
                      <DailyCallScreen />
                    </CallProvider>
                  </HomeModeProvider>
                </CompanyProvider>
              </NotificationsProvider>
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </I18nextProvider>
    </AppErrorBoundary>
  );
}
