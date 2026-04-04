import React from "react";
import { TouchableOpacity, View, ActivityIndicator, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { radii } from "../../theme/radii";
import { spacing } from "../../theme/spacing";
import AppText from "./AppText";

type Tone = "primary" | "glass" | "danger";
type Size = "sm" | "md" | "lg";

type AppButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: Tone;
  size?: Size;
  iconLeft?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

function padY(size: Size) {
  if (size === "sm") return 10;
  if (size === "lg") return 16;
  return 13;
}

function fontVariant(size: Size) {
  if (size === "sm") return "bodySm" as const;
  if (size === "lg") return "title" as const;
  return "body" as const;
}

export default function AppButton({
  label,
  onPress,
  disabled,
  loading,
  tone = "primary",
  size = "md",
  iconLeft,
  style,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    base: {
      borderRadius: radii.md,
      paddingHorizontal: spacing.xl,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    row: { flexDirection: "row" as const, alignItems: "center", justifyContent: "center" as const },
    primary: {
      backgroundColor: c.accentBlue,
      shadowColor: c.accentBlue,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 18,
    },
    danger: {
      backgroundColor: c.accentRose,
      shadowColor: c.accentRose,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 18,
    },
    glass: {
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
    },
  }));

  const baseStyle = tone === "primary" ? styles.primary : tone === "danger" ? styles.danger : styles.glass;

  const labelTone = tone === "glass" ? ("primary" as const) : ("primary" as const);
  const labelColor = tone === "glass" ? colors.textPrimary : colors.white;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, baseStyle, { paddingVertical: padY(size), opacity: isDisabled ? 0.65 : 1 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={tone === "glass" ? colors.accentCyan : colors.white} />
      ) : (
        <View style={styles.row}>
          {iconLeft ? (
            <Ionicons
              name={iconLeft}
              size={18}
              color={tone === "glass" ? colors.accentCyan : colors.white}
              style={{ marginRight: 8 }}
            />
          ) : null}
          <AppText variant={fontVariant(size)} weight="bold" tone={labelTone} style={{ color: labelColor }}>
            {label}
          </AppText>
        </View>
      )}
    </TouchableOpacity>
  );
}
