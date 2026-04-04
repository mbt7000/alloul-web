import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import { MEDIA_TAB_ROUTES, ROOT_SHELL_ROUTES } from "../../../config/routes";

/**
 * Tab placeholder: tab press is intercepted in WorkspaceTabBar to open Media feed.
 * If user lands here (deep link), redirect to Media.
 */
export default function MediaBridgeScreen() {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.bg, alignItems: "center" as const, justifyContent: "center" as const },
  }));

  useEffect(() => {
    const t = setTimeout(() => {
      const parent = navigation.getParent() as { navigate: (n: string, p?: object) => void } | undefined;
      parent?.navigate(ROOT_SHELL_ROUTES.media, { screen: MEDIA_TAB_ROUTES.home });
    }, 0);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.accentCyan} />
    </View>
  );
}
