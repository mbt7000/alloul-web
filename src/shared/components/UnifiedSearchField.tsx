import React from "react";
import { View, TextInput, Pressable, TextInputProps, I18nManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { radii } from "../../theme/radii";
const UNIFIED_SEARCH_PLACEHOLDER = "ابحث...";

type Props = Omit<TextInputProps, "placeholder" | "style"> & {
  value: string;
  onChangeText: (t: string) => void;
  onSubmitSearch?: () => void;
  /** Compact height for list headers (e.g. Feed). */
  dense?: boolean;
  placeholder?: string;
};

/**
 * Single visual + behavior contract for search across Home, Feed, and Discover.
 * Clear control, return key “search”, same placeholder default.
 */
export default function UnifiedSearchField({
  value,
  onChangeText,
  onSubmitSearch,
  dense,
  placeholder = UNIFIED_SEARCH_PLACEHOLDER,
  ...rest
}: Props) {
  const isRTL = I18nManager.isRTL;
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    row: {
      position: "relative" as const,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      minHeight: 50,
    },
    rowDense: { minHeight: 46 },
    iconLeft: {
      position: "absolute" as const,
      zIndex: 2,
      height: "100%",
      justifyContent: "center" as const,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 15,
      color: c.textPrimary,
    },
    inputLtr: {
      paddingLeft: 44,
      paddingRight: 44,
    },
    inputRtl: {
      paddingLeft: 44,
      paddingRight: 44,
      textAlign: "right" as const,
    },
    inputDense: { paddingVertical: 12 },
    clearBtn: {
      position: "absolute" as const,
      zIndex: 2,
      height: "100%",
      justifyContent: "center" as const,
    },
  }));

  return (
    <View style={[styles.row, dense && styles.rowDense]}>
      <View style={[styles.iconLeft, isRTL ? { right: 14 } : { left: 14 }]}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
      </View>
      <TextInput
        {...rest}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, isRTL ? styles.inputRtl : styles.inputLtr, dense && styles.inputDense]}
        returnKeyType="search"
        onSubmitEditing={() => onSubmitSearch?.()}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityLabel={isRTL ? "مسح البحث" : "Clear search"}
          hitSlop={10}
          style={[styles.clearBtn, isRTL ? { left: 12 } : { right: 12 }]}
          onPress={() => onChangeText("")}
        >
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}
