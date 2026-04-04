import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, I18nManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";

type AppHeaderProps = {
  title: string;
  rightActions?: React.ReactNode;
  leftButton?: "back" | "none";
  style?: StyleProp<ViewStyle>;
};

export default function AppHeader({ title, rightActions, leftButton = "back", style }: AppHeaderProps) {
  const navigation = useNavigation<any>();
  const isRTL = I18nManager.isRTL;
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: 8,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    backBtnPlaceholder: { width: 40, height: 40 },
    title: { flex: 1, color: c.textPrimary, fontSize: 20, fontWeight: "800" as const, textAlign: "center" as const },
    right: { minWidth: 40, alignItems: "flex-end" as const },
  }));

  return (
    <View style={[styles.header, style]}>
      {leftButton === "back" ? (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={isRTL ? "رجوع" : "Back"}
        >
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backBtnPlaceholder} />
      )}

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.right}>{rightActions}</View>
    </View>
  );
}
