import React from "react";
import { View, TextInput, TextInputProps, TouchableOpacity, I18nManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { radii } from "../../theme/radii";
import { spacing } from "../../theme/spacing";
import AppText from "./AppText";

type AppInputProps = TextInputProps & {
  label?: string;
  rightLabel?: string;
  onPressRightLabel?: () => void;
  iconLeft?: keyof typeof Ionicons.glyphMap;
};

export default function AppInput({ label, rightLabel, onPressRightLabel, iconLeft, style, ...props }: AppInputProps) {
  const isRTL = I18nManager.isRTL;
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    wrap: { gap: 8 },
    labelRow: { flexDirection: "row" as const, alignItems: "center", justifyContent: "space-between" as const },
    inputRow: { position: "relative" as const },
    iconLeft: {
      position: "absolute" as const,
      top: 0,
      bottom: 0,
      justifyContent: "center" as const,
      zIndex: 2,
    },
    input: {
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: c.textPrimary,
      fontSize: 15,
    },
    inputLtr: {
      textAlign: "left" as const,
    },
    inputRtl: {
      textAlign: "right" as const,
    },
  }));

  return (
    <View style={styles.wrap}>
      {label ? (
        <View style={styles.labelRow}>
          <AppText variant="caption" tone="muted" weight="bold">
            {label}
          </AppText>
          {rightLabel && onPressRightLabel ? (
            <TouchableOpacity onPress={onPressRightLabel} hitSlop={12}>
              <AppText variant="caption" tone="cyan" weight="bold">
                {rightLabel}
              </AppText>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <View style={styles.inputRow}>
        {iconLeft ? (
          <View style={[styles.iconLeft, isRTL ? { right: 14 } : { left: 14 }]}>
            <Ionicons name={iconLeft} size={18} color={colors.textMuted} />
          </View>
        ) : null}
        <TextInput
          {...props}
          style={[
            styles.input,
            iconLeft &&
              (isRTL
                ? {
                    paddingRight: spacing.xxl,
                  }
                : {
                    paddingLeft: spacing.xxl,
                  }),
            isRTL ? styles.inputRtl : styles.inputLtr,
            style,
          ]}
          placeholderTextColor={colors.textMuted}
        />
      </View>
    </View>
  );
}
