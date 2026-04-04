import React, { useCallback, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import HomeSmartHeader from "../../../shared/components/HomeSmartHeader";
import MediaHomeFeed from "../../../shared/components/MediaHomeFeed";
import UnifiedSearchField from "../../../shared/components/UnifiedSearchField";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import { addRecentSearch } from "../../../storage/recentSearches";
import { useAuth } from "../../../state/auth/AuthContext";
import { useHomeMode } from "../../../state/mode/HomeModeContext";
import { useCompany } from "../../../state/company/CompanyContext";
import { useNotifications } from "../../../state/notifications/NotificationsContext";
import { ROOT_SHELL_ROUTES } from "../../../config/routes";

const TAB_BAR_PAD = 100;

export default function MediaHomeScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(() => ({
    glowTop: {
      position: "absolute" as const,
      top: -80,
      left: "15%",
      width: 280,
      height: 200,
      borderRadius: 120,
      backgroundColor: "rgba(76,111,255,0.10)",
      opacity: 0.9,
    },
    glowBlue: {
      position: "absolute" as const,
      top: 40,
      right: -40,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: "rgba(56,232,255,0.06)",
    },
    searchWrap: { paddingHorizontal: 16, marginBottom: 12 },
  }));
  const { user } = useAuth();
  const { company, loading: companyLoading } = useCompany();
  const { displayUnreadCount } = useNotifications();
  const { mode, switchMode, canUseCompanyMode, getLastRoute } = useHomeMode();
  const [searchDraft, setSearchDraft] = useState("");
  const firstName = (user?.name || user?.username || "there").split(/\s+/)[0];

  const handleModeChange = useCallback(
    (nextMode: "public" | "company") => {
      const ok = switchMode(nextMode);
      const rootNavigation = navigation.getParent() as
        | {
            navigate: (routeName: string, params?: object) => void;
            replace?: (routeName: string, params?: object) => void;
          }
        | undefined;

      if (!ok && nextMode === "company") {
        Alert.alert("يلزمك وصول إلى الشركات", "تحتاج إلى عضوية شركة فعّالة للدخول إلى تجربة الشركات.");
        rootNavigation?.navigate(ROOT_SHELL_ROUTES.media, {
          screen: "MediaTabs",
          params: { screen: getLastRoute("public") ?? "Feed" },
        });
        return;
      }

      const targetShell = nextMode === "company" ? ROOT_SHELL_ROUTES.company : ROOT_SHELL_ROUTES.media;
      const targetScreen = getLastRoute(nextMode) ?? (nextMode === "company" ? "CompanyWorkspace" : "Feed");
      rootNavigation?.navigate(
        targetShell,
        nextMode === "company"
          ? { screen: targetScreen }
          : { screen: "MediaTabs", params: { screen: targetScreen } }
      );
    },
    [getLastRoute, navigation, switchMode]
  );

  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }}>
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBlue} pointerEvents="none" />

      <HomeSmartHeader
        variant="mediaStrip"
        firstName={firstName}
        mode={mode}
        onModeChange={handleModeChange}
        companyName={company?.name}
        companyLoading={companyLoading}
        canUseCompanyMode={canUseCompanyMode}
        onSearch={() => navigation.navigate("Search", { source: "home" })}
        onNotifications={() => navigation.navigate("Inbox")}
        inboxUnreadCount={displayUnreadCount}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: TAB_BAR_PAD }}
      >
        <View style={styles.searchWrap}>
          <UnifiedSearchField
            value={searchDraft}
            onChangeText={setSearchDraft}
            dense
            placeholder="استكشف المحتوى..."
            onSubmitSearch={() => {
              const q = searchDraft.trim();
              void (async () => {
                if (q) await addRecentSearch(q);
                navigation.navigate("Search", q ? { q, source: "home" } : { source: "home" });
              })();
            }}
          />
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <MediaHomeFeed navigation={navigation} />
        </View>
      </ScrollView>
    </Screen>
  );
}
