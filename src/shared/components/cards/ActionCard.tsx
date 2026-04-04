import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AppPalette } from "../../../theme/palettes";
import { useAppTheme } from "../../../theme/ThemeContext";
import GlassCard from "../GlassCard";

type ActionCardProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "cyan" | "lime" | "ember" | "rose" | "cobalt";
};

function toneColorMap(colors: AppPalette): Record<NonNullable<ActionCardProps["tone"]>, string> {
  return {
    cyan: colors.accentCyan,
    lime: colors.accentLime,
    ember: colors.accentEmber,
    rose: colors.accentRose,
    cobalt: colors.accentCobalt,
  };
}

export default function ActionCard({ title, subtitle, icon, tone = "cobalt" }: ActionCardProps) {
  const { colors } = useAppTheme();
  const tones = useMemo(() => toneColorMap(colors), [colors]);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { padding: 12, gap: 6, flex: 1 },
        iconWrap: {
          width: 32,
          height: 32,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.cardStrong,
          borderWidth: 1,
          borderColor: colors.border,
        },
        title: { color: colors.textPrimary, fontSize: 13, fontWeight: "700" },
        subtitle: { color: colors.textMuted, fontSize: 11 },
      }),
    [colors]
  );

  return (
    <GlassCard style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={18} color={tones[tone]} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </GlassCard>
  );
}
