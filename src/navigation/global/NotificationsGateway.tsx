import React from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ActivityIndicator, View } from "react-native";
import { useHomeMode } from "../../state/mode/HomeModeContext";
import { ROOT_SHELL_ROUTES } from "../../config/routes";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";

export default function NotificationsGateway() {
  const navigation = useNavigation<any>();
  const { mode, canUseCompanyMode } = useHomeMode();
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    root: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.bg,
    },
  }));

  useFocusEffect(
    React.useCallback(() => {
      const inCompany = mode === "company" && canUseCompanyMode;
      const targetShell = inCompany ? ROOT_SHELL_ROUTES.company : ROOT_SHELL_ROUTES.media;
      navigation.navigate(
        targetShell,
        inCompany ? { screen: "Inbox" } : { screen: "MediaTabs", params: { screen: "Inbox" } }
      );
    }, [canUseCompanyMode, mode, navigation])
  );

  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.accentCyan} />
    </View>
  );
}
