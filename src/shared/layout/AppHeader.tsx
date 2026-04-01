import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, I18nManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../theme/colors";

type AppHeaderProps = {
  title: string;
  rightActions?: React.ReactNode;
  leftButton?: "back" | "none";
  style?: StyleProp<ViewStyle>;
};

export default function AppHeader({ title, rightActions, leftButton = "back", style }: AppHeaderProps) {
  const navigation = useNavigation<any>();
  const isRTL = I18nManager.isRTL;

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

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnPlaceholder: { width: 40, height: 40 },
  title: { flex: 1, color: colors.textPrimary, fontSize: 20, fontWeight: "800", textAlign: "center" },
  right: { minWidth: 40, alignItems: "flex-end" },
});

