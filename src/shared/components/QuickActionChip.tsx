import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../ui/AppText";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { radius } from "../../theme/radius";

export default function QuickActionChip({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    cell: {
      width: 76,
      alignItems: "center" as const,
      gap: 8,
    },
    iconBox: {
      width: 56,
      height: 56,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: "rgba(255,255,255,0.04)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    label: { textAlign: "center" as const },
  }));

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.cell, pressed && { opacity: 0.88 }]}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={22} color={colors.textPrimary} />
      </View>
      <AppText variant="micro" tone="secondary" weight="bold" numberOfLines={2} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}
