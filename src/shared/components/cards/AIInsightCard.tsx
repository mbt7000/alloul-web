import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../theme/ThemeContext";
import GlassCard from "../GlassCard";

type AIInsightCardProps = {
  title?: string;
  summary: string;
  tag?: string;
};

export default function AIInsightCard({ title = "AI Insight", summary, tag = "Operational" }: AIInsightCardProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { padding: 16, gap: 10 },
        header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
        title: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
        tag: {
          color: colors.accentCyan,
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 1,
        },
        summary: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
        footer: { flexDirection: "row", alignItems: "center", gap: 6 },
        cta: { color: colors.accentCyan, fontSize: 12, fontWeight: "700" },
      }),
    [colors]
  );

  return (
    <GlassCard strength="strong" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={18} color={colors.accentCyan} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.tag}>{tag}</Text>
      </View>
      <Text style={styles.summary}>{summary}</Text>
      <View style={styles.footer}>
        <Text style={styles.cta}>Open Summary</Text>
        <Ionicons name="arrow-forward" size={14} color={colors.accentCyan} />
      </View>
    </GlassCard>
  );
}
