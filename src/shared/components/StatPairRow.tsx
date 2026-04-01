import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../ui/AppText";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import PillBadge from "./PillBadge";

export type StatPairItem = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  trendLabel?: string;
  trendTone?: "blue" | "green";
};

export default function StatPairRow({ left, right }: { left: StatPairItem; right: StatPairItem }) {
  return (
    <View style={styles.row}>
      <StatCard item={left} />
      <StatCard item={right} />
    </View>
  );
}

function StatCard({ item }: { item: StatPairItem }) {
  return (
    <View style={styles.card}>
      {item.trendLabel ? (
        <View style={styles.trendWrap}>
          <PillBadge label={item.trendLabel} tone={item.trendTone === "green" ? "green" : "blue"} />
        </View>
      ) : null}
      <View style={styles.iconCircle}>
        <Ionicons name={item.icon} size={20} color={colors.textMuted} />
      </View>
      <AppText variant="h2" weight="bold" style={styles.value}>
        {item.value}
      </AppText>
      <AppText variant="micro" tone="muted" weight="bold" numberOfLines={2}>
        {item.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  card: {
    flex: 1,
    position: "relative",
    backgroundColor: colors.cardElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    minHeight: 120,
  },
  trendWrap: { position: "absolute", top: 10, left: 10, zIndex: 1 },
  iconCircle: {
    alignSelf: "center",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  value: { textAlign: "center", marginBottom: 4 },
});
