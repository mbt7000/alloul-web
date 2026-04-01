import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../../theme/colors";
import GlassCard from "../components/GlassCard";

export default function InfoPlaceholderScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const p = (route.params as { titleKey?: string; bodyKey?: string }) || {};
  const titleKey = p.titleKey || "common.soon";
  const bodyKey = p.bodyKey || "common.soon";

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {t(titleKey)}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <GlassCard style={styles.card}>
          <Text style={styles.body}>{t(bodyKey)}</Text>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, color: colors.textPrimary, fontSize: 18, fontWeight: "800", textAlign: "center" },
  scroll: { padding: 16, paddingBottom: 100 },
  card: { padding: 20 },
  body: { color: colors.textSecondary, fontSize: 15, lineHeight: 24, textAlign: "center" },
});
