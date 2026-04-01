import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export type SegmentedOption<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
};

export default function SegmentedControl<T extends string>({ value, options, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.item, active && styles.itemActive]}
            activeOpacity={0.95}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  item: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemActive: {
    backgroundColor: "rgba(76,111,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(76,111,255,0.35)",
  },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
  labelActive: { color: colors.textPrimary },
});

