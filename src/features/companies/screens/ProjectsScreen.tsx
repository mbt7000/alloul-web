import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import GlassCard from "../../../shared/components/GlassCard";
import { getProjects, type ProjectRow } from "../../../api";
import CompanyWorkModeTopBar from "../components/CompanyWorkModeTopBar";

export default function ProjectsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.mediaCanvas },
    listHeaderTitle: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    title: { color: c.textPrimary, fontSize: 20, fontWeight: "800" },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, padding: 24, gap: 12 },
    err: { color: c.danger, textAlign: "center" as const },
    retry: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
    },
    retryText: { color: c.accentBlue, fontWeight: "700" },
    list: { padding: 16, paddingBottom: 100, gap: 12 },
    card: { padding: 14, marginBottom: 4 },
    name: { color: c.textPrimary, fontSize: 17, fontWeight: "800" },
    row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, marginTop: 8 },
    badge: { color: c.accentTeal, fontSize: 12, fontWeight: "700" },
    meta: { color: c.textMuted, fontSize: 12 },
    desc: { color: c.textSecondary, fontSize: 13, marginTop: 8, lineHeight: 20 },
    empty: { color: c.textMuted, textAlign: "center" as const, marginTop: 40 },
  }));
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await getProjects();
      setItems(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Error";
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CompanyWorkModeTopBar />
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentCyan} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.err}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => { setLoading(true); void load(); }}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.listHeaderTitle}>
              <Text style={styles.title}>{t("projects.title")}</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor={colors.accentCyan}
            />
          }
          ListEmptyComponent={<Text style={styles.empty}>{t("projects.empty")}</Text>}
          renderItem={({ item }) => (
            <GlassCard style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.row}>
                <Text style={styles.badge}>{item.status}</Text>
                <Text style={styles.meta}>
                  {t("projects.tasksProgress", { done: item.completed_count ?? 0, total: item.tasks_count ?? 0 })}
                </Text>
              </View>
              {item.description ? (
                <Text style={styles.desc} numberOfLines={3}>
                  {item.description}
                </Text>
              ) : null}
            </GlassCard>
          )}
        />
      )}
    </View>
  );
}
