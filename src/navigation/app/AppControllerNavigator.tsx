import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { useHomeMode } from "../../state/mode/HomeModeContext";
import { useCompany } from "../../state/company/CompanyContext";
import { ROOT_SHELL_ROUTES } from "../../config/routes";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { resolveAllowedMode } from "../../state/mode/accessRules";
import MediaNavigator from "../media/MediaNavigator";
import CompanyNavigator from "../company/CompanyNavigator";
import SearchGateway from "../global/SearchGateway";
import NotificationsGateway from "../global/NotificationsGateway";

const Stack = createNativeStackNavigator();

function LoadingScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    loading: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.bg,
    },
  }));
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accentCyan} />
    </View>
  );
}

function CompanyAccessFallback() {
  const { setMode } = useHomeMode();
  React.useEffect(() => {
    setMode("public");
  }, [setMode]);
  return <MediaNavigator />;
}

function RequireCompanyAccess({ children }: { children: React.ReactNode }) {
  const { canUseCompanyMode, setMode } = useHomeMode();
  const { loading } = useCompany();

  React.useEffect(() => {
    if (canUseCompanyMode) setMode("company");
  }, [canUseCompanyMode, setMode]);

  if (loading) return <LoadingScreen />;
  if (!canUseCompanyMode) return <CompanyAccessFallback />;
  return <>{children}</>;
}

function ShellEntryScreen({ navigation }: { navigation: any }) {
  const { hydrated, mode, canUseCompanyMode } = useHomeMode();
  const [fallbackReady, setFallbackReady] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setFallbackReady(true), 3000);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (!hydrated && !fallbackReady) return;
    const allowed = resolveAllowedMode(mode, { canUseCompanyMode });
    navigation.replace(allowed === "company" ? ROOT_SHELL_ROUTES.company : ROOT_SHELL_ROUTES.media);
  }, [canUseCompanyMode, fallbackReady, hydrated, mode, navigation]);

  return <LoadingScreen />;
}

function MediaShellScreen() {
  const { setMode } = useHomeMode();
  React.useEffect(() => {
    setMode("public");
  }, [setMode]);
  return <MediaNavigator />;
}

function CompanyShellScreen() {
  return (
    <RequireCompanyAccess>
      <CompanyNavigator />
    </RequireCompanyAccess>
  );
}

export default function AppControllerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={ROOT_SHELL_ROUTES.entry} component={ShellEntryScreen} />
      <Stack.Screen name={ROOT_SHELL_ROUTES.media} component={MediaShellScreen} />
      <Stack.Screen name={ROOT_SHELL_ROUTES.company} component={CompanyShellScreen} />
      <Stack.Screen name="Discover" component={SearchGateway} />
      <Stack.Screen name="Notifications" component={NotificationsGateway} />
    </Stack.Navigator>
  );
}
