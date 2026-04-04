import React, { useMemo } from "react";
import { View, type ViewStyle } from "react-native";
import AppText from "../ui/AppText";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { radius } from "../../theme/radius";

type Tone = "blue" | "green" | "neutral" | "danger";

const toneBg: Record<Tone, string> = {
  blue: "rgba(76,111,255,0.22)",
  green: "rgba(0,230,118,0.18)",
  neutral: "rgba(255,255,255,0.08)",
  danger: "rgba(255,92,124,0.18)",
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
  const { colors } = useAppTheme();
  const styles = useThemedStyles(() => ({
    wrap: {
      alignSelf: "flex-start" as const,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
  }));

  const toneColor = useMemo(
    (): Record<Tone, string> => ({
      blue: colors.accentBlue,
      green: colors.accentNeonGreen,
      neutral: colors.textSecondary,
      danger: colors.danger,
    }),
    [colors]
  );

  return (
    <View style={[styles.wrap, { backgroundColor: toneBg[tone] }, style]}>
      <AppText variant="micro" weight="bold" style={{ color: toneColor[tone] }}>
        {label}
      </AppText>
    </View>
  );
}
