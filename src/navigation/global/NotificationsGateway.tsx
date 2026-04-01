import React from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useHomeMode } from "../../state/mode/HomeModeContext";
import { ROOT_SHELL_ROUTES } from "../../config/routes";
import { colors } from "../../theme/colors";

export default function NotificationsGateway() {
  const navigation = useNavigation<any>();
  const { mode, canUseCompanyMode } = useHomeMode();

  useFocusEffect(
    React.useCallback(() => {
      const inCompany = mode === "company" && canUseCompanyMode;
      const targetShell = inCompany ? ROOT_SHELL_ROUTES.company : ROOT_SHELL_ROUTES.media;
      navigation.navigate(
        targetShell,
        inCompany
          ? { screen: "Inbox" }
          : { screen: "MediaTabs", params: { screen: "Inbox" } }
      );
    }, [canUseCompanyMode, mode, navigation])
  );

  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.accentCyan} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
});
