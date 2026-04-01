import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../ui/AppText";
import { colors } from "../../theme/colors";
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

const styles = StyleSheet.create({
  cell: {
    width: 76,
    alignItems: "center",
    gap: 8,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { textAlign: "center" },
});
