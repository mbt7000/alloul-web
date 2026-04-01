import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../theme/colors";
import GlassCard from "../GlassCard";

type StatCardProps = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "cyan" | "lime" | "ember" | "rose" | "cobalt";
};

const toneColor: Record<NonNullable<StatCardProps["tone"]>, string> = {
  cyan: colors.accentCyan,
  lime: colors.accentLime,
  ember: colors.accentEmber,
  rose: colors.accentRose,
  cobalt: colors.accentCobalt,
};

export default function StatCard({ label, value, icon, tone = "cobalt" }: StatCardProps) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <Ionicons name={icon} size={18} color={toneColor[tone]} />
        <Text style={styles.value}>{value}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, gap: 6, flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  value: { color: colors.textPrimary, fontSize: 16, fontWeight: "800" },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
});
