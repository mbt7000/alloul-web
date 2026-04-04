import React, { useMemo } from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import { glassStyles } from "../../theme/glass";
import { shadows } from "../../theme/shadows";
import { useAppTheme } from "../../theme/ThemeContext";

type GlassCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  strength?: "default" | "strong";
};

export default function GlassCard({ children, style, strength = "default" }: GlassCardProps) {
  const { colors } = useAppTheme();
  const glass = useMemo(() => glassStyles(colors), [colors]);
  const base = strength === "strong" ? glass.cardStrong : glass.card;
  return <View style={[base, shadows.soft, style]}>{children}</View>;
}
