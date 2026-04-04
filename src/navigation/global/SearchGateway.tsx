import React from "react";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { ActivityIndicator, View } from "react-native";
import { useHomeMode } from "../../state/mode/HomeModeContext";
import { ROOT_SHELL_ROUTES } from "../../config/routes";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";

export default function SearchGateway() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { mode, canUseCompanyMode } = useHomeMode();
  const params = route.params ?? {};
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
