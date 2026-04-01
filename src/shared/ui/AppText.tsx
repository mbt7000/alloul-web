import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { fontFamilies, lineHeights, typeScale } from "../../theme/typography";

type Variant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "title"
  | "body"
  | "bodySm"
  | "caption"
  | "micro";

type Tone = "primary" | "secondary" | "muted" | "accent" | "danger" | "cyan";

export type AppTextProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
  weight?: "regular" | "medium" | "semibold" | "bold" | "black";
};

function toneColor(tone: Tone): string {
  switch (tone) {
    case "secondary":
      return colors.textSecondary;
    case "muted":
      return colors.textMuted;
    case "accent":
      return colors.accentBlue;
    case "cyan":
      return colors.accentCyan;
    case "danger":
      return colors.danger;
    default:
      return colors.textPrimary;
  }
}

function familyFor(weight: NonNullable<AppTextProps["weight"]>): string {
  if (weight === "medium") return fontFamilies.bodyMedium;
  if (weight === "semibold") return fontFamilies.heading;
  if (weight === "bold" || weight === "black") return fontFamilies.headingStrong;
  return fontFamilies.body;
}

export default function AppText({
  variant = "body",
  tone = "primary",
  weight = "regular",
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      style={[
        styles.base,
        {
          color: toneColor(tone),
          fontSize: typeScale[variant],
          lineHeight: lineHeights[variant],
          fontFamily: familyFor(weight),
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});

