import React from "react";
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, I18nManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { radii } from "../../theme/radii";
import { spacing } from "../../theme/spacing";
import AppText from "./AppText";

type ListRowProps = {
  title: string;
  subtitle?: string;
  iconLeft?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function ListRow({ title, subtitle, iconLeft, onPress, right, style }: ListRowProps) {
  const chevronName = I18nManager.isRTL ? "chevron-back" : "chevron-forward";

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.88 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, style]}
    >
      {iconLeft ? (
        <View style={styles.iconWrap}>
          <Ionicons name={iconLeft} size={18} color={colors.accentCyan} />
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        <AppText variant="body" weight="bold">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {right ?? <Ionicons name={chevronName} size={18} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(56,232,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(56,232,255,0.18)",
  },
});

