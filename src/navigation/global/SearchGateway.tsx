import React from "react";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { ActivityIndicator, View } from "react-native";
import { ROOT_SHELL_ROUTES } from "../../config/routes";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";

export default function SearchGateway() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
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
      navigation.navigate(ROOT_SHELL_ROUTES.company, { screen: "InternalSearch", params });
    }, [navigation, params])
  );

  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.accentCyan} />
    </View>
  );
}
