import React from "react";
import { View, TouchableOpacity, StyleProp, ViewStyle, I18nManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
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
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
      borderRadius: radii.lg,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: "rgba(56,232,255,0.08)",
      borderWidth: 1,
      borderColor: "rgba(56,232,255,0.18)",
    },
  }));

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
