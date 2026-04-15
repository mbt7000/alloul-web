import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { useHomeMode } from "../../state/mode/HomeModeContext";
import { useCompany } from "../../state/company/CompanyContext";
import { ROOT_SHELL_ROUTES } from "../../config/routes";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { resolveAllowedMode } from "../../state/mode/accessRules";
import CompanyNavigator from "../company/CompanyNavigator";
import SearchGateway from "../global/SearchGateway";
import NotificationsGateway from "../global/NotificationsGateway";
import PhoneVerifyScreen from "../../features/phone/screens/PhoneVerifyScreen";
import SubscriptionPlansScreen from "../../features/companies/screens/SubscriptionPlansScreen";

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
  return <SubscriptionPlansScreen navigation={{ goBack: () => setMode("public") }} />;
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
    const targetRoute = ROOT_SHELL_ROUTES.company;
    navigation.replace(targetRoute);
  }, [canUseCompanyMode, fallbackReady, hydrated, mode, navigation]);

  return <LoadingScreen />;
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
      <Stack.Screen name={ROOT_SHELL_ROUTES.company} component={CompanyShellScreen} />
      <Stack.Screen name="Discover" component={SearchGateway} />
      <Stack.Screen name="Notifications" component={NotificationsGateway} />
      <Stack.Screen name="PhoneVerify" component={PhoneVerifyScreen} />
      <Stack.Screen name="SubscriptionPlans" component={SubscriptionPlansScreen} />
    </Stack.Navigator>
  );
}
