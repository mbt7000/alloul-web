import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../ui/AppText";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
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
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    card: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      backgroundColor: c.cardElevated,
      borderRadius: radius.xxl,
      borderWidth: 1,
      borderColor: c.border,
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
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
  }));

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
