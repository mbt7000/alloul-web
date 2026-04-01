import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import AppText from "../ui/AppText";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";

type Tone = "blue" | "green" | "neutral" | "danger";

const toneBg: Record<Tone, string> = {
  blue: "rgba(76,111,255,0.22)",
  green: "rgba(0,230,118,0.18)",
  neutral: "rgba(255,255,255,0.08)",
  danger: "rgba(255,92,124,0.18)",
};

const toneColor: Record<Tone, string> = {
  blue: colors.accentBlue,
  green: colors.accentNeonGreen,
  neutral: colors.textSecondary,
  danger: colors.danger,
};

export default function PillBadge({
  label,
  tone = "neutral",
  style,
}: {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.wrap, { backgroundColor: toneBg[tone] }, style]}>
      <AppText variant="micro" weight="bold" style={{ color: toneColor[tone] }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
});
