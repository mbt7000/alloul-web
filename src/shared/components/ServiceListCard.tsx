import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../ui/AppText";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";

export default function ServiceListCard({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
      <Ionicons name="chevron-back" size={18} color={colors.textMuted} style={styles.chevron} />
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="bodySm" weight="bold" numberOfLines={2}>
          {title}
        </AppText>
        <AppText variant="micro" tone="muted" numberOfLines={2}>
          {subtitle}
        </AppText>
      </View>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={colors.textPrimary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.cardElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  chevron: { opacity: 0.7 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
});
