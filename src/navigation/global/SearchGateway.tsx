import React from "react";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useHomeMode } from "../../state/mode/HomeModeContext";
import { ROOT_SHELL_ROUTES } from "../../config/routes";
import { colors } from "../../theme/colors";

export default function SearchGateway() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { mode, canUseCompanyMode } = useHomeMode();
  const params = route.params ?? {};

  useFocusEffect(
    React.useCallback(() => {
      const inCompany = mode === "company" && canUseCompanyMode;
      const targetShell = inCompany ? ROOT_SHELL_ROUTES.company : ROOT_SHELL_ROUTES.media;
      navigation.navigate(
        targetShell,
        inCompany
          ? { screen: "InternalSearch", params }
          : { screen: "MediaTabs", params: { screen: "Search", params } }
      );
    }, [canUseCompanyMode, mode, navigation, params])
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
