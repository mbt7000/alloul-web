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
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../../../theme/colors";
import GlassCard from "../../../shared/components/GlassCard";
import { getProjects, type ProjectRow } from "../../../api";

export default function ProjectsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("projects.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

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
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={styles.list}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  err: { color: colors.danger, textAlign: "center" },
  retry: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  retryText: { color: colors.accentBlue, fontWeight: "700" },
  list: { padding: 16, paddingBottom: 100, gap: 12 },
  card: { padding: 14, marginBottom: 4 },
  name: { color: colors.textPrimary, fontSize: 17, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  badge: { color: colors.accentTeal, fontSize: 12, fontWeight: "700" },
  meta: { color: colors.textMuted, fontSize: 12 },
  desc: { color: colors.textSecondary, fontSize: 13, marginTop: 8, lineHeight: 20 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
});
