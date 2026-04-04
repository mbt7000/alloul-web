import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { getAdminStats, type AdminStats } from "../../../api";
import { useAppTheme } from "../../../theme/ThemeContext";

export default function AdminHubScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const s = await getAdminStats();
      setStats(s);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Failed";
      setError(msg);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.bg },
        header: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        backBtn: { padding: 4 },
        title: { color: colors.textPrimary, fontSize: 18, fontWeight: "800", flex: 1 },
        scroll: { padding: 16, paddingBottom: 40 },
        card: {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bgCard,
          padding: 16,
          gap: 12,
        },
        statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
        statLabel: { color: colors.textMuted, fontSize: 14 },
        statValue: { color: colors.textPrimary, fontSize: 18, fontWeight: "800" },
        err: { color: colors.danger, fontSize: 14, marginTop: 8 },
        retry: {
          marginTop: 16,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: colors.accent,
          alignItems: "center",
        },
        retryText: { color: colors.white, fontWeight: "700" },
        hint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 20 },
      }),
    [colors]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("settings.adminConsole")}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.err}>{error}</Text>
            <TouchableOpacity style={styles.retry} onPress={() => void load()}>
              <Text style={styles.retryText}>{t("common.retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : stats ? (
          <View style={styles.card}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>{t("settings.adminUsers")}</Text>
              <Text style={styles.statValue}>{stats.total_users}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>{t("settings.adminVerified")}</Text>
              <Text style={styles.statValue}>{stats.verified_users}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>{t("settings.adminPosts")}</Text>
              <Text style={styles.statValue}>{stats.total_posts}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>{t("settings.adminCompanies")}</Text>
              <Text style={styles.statValue}>{stats.total_companies}</Text>
            </View>
          </View>
        ) : null}
        <Text style={styles.hint}>{t("settings.adminHint")}</Text>
      </ScrollView>
    </View>
  );
}
